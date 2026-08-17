import uuid
from typing import Optional, List, Dict
from collections import Counter
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import (
    CropListing, AggregationPoint, Order, OrderItem, Transaction, Buyer, User,
    ZoneEnum, ListingStatusEnum, OrderStatusEnum, ItemStatusEnum, EscrowStatusEnum,
    RoleEnum
)
from app.schemas import (
    CropListingOut, AggregationPointCatalog, OrderCreate, OrderOut,
    OrderItemOut, TransactionOut
)
from app.routers.auth import get_current_user

router = APIRouter(prefix="", tags=["Buyer"])


@router.get("/listings/browse", response_model=List[AggregationPointCatalog])
async def browse_catalog_by_aggregation_point(
    zone: ZoneEnum = Query(ZoneEnum.PLAINS_A),
    crop: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Zone-filtered catalog grouped by Aggregation Point.
    This demonstrates the core accessibility concept:
    A buyer picks an aggregation point in their zone and sees produce from multiple farmers ready at that single location.
    """
    # 1. Fetch active aggregation points in the zone
    points_res = await db.execute(
        select(AggregationPoint).where(
            AggregationPoint.zone == zone,
            AggregationPoint.is_active == True
        )
    )
    points = points_res.scalars().all()

    catalogs = []
    for p in points:
        # Fetch listings at this point
        q = select(CropListing).options(
            selectinload(CropListing.farmer)
        ).where(
            CropListing.aggregation_point_id == p.id,
            CropListing.status == ListingStatusEnum.AVAILABLE
        )
        if crop:
            q = q.where(CropListing.crop_name.ilike(f"%{crop}%"))

        listings_res = await db.execute(q)
        listings = listings_res.scalars().all()

        if listings:
            transformed = []
            farmer_ids = set()
            total_qty = 0.0

            for l in listings:
                farmer_ids.add(l.farmer_id)
                total_qty += l.quantity_kg
                transformed.append(
                    CropListingOut(
                        id=l.id,
                        farmer_id=l.farmer_id,
                        farmer_name=l.farmer.name if l.farmer else None,
                        farmer_phone=l.farmer.phone if l.farmer else None,
                        farmer_reputation=l.farmer.reputation_score if l.farmer else 0,
                        crop_name=l.crop_name,
                        quantity_kg=l.quantity_kg,
                        harvest_date=l.harvest_date,
                        declared_grade=l.declared_grade,
                        photo_url=l.photo_url,
                        ai_grade_estimate=l.ai_grade_estimate,
                        suggested_price=l.suggested_price,
                        final_price=l.final_price,
                        zone=l.zone,
                        aggregation_point_id=p.id,
                        aggregation_point_name=p.name,
                        status=l.status,
                        created_at=l.created_at
                    )
                )

            catalogs.append(
                AggregationPointCatalog(
                    aggregation_point=p,
                    listings=transformed,
                    total_quantity_kg=round(total_qty, 2),
                    farmers_count=len(farmer_ids)
                )
            )

    return catalogs


@router.post("/orders", response_model=OrderOut)
async def create_order(
    req: OrderCreate,
    current_user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Multi-item order creation:
    1. Resolves all items to ONE aggregation point where possible.
    2. Flags items unavailable in zone or substitutes.
    3. Locks payment in ESCROW (status: HELD).
    4. Issues unique collection QR token.
    """
    if not req.items:
        raise HTTPException(status_code=400, detail="Order must contain at least one item")

    # 1. Resolve Buyer
    buyer = None
    if current_user and current_user.role == RoleEnum.BUYER:
        res = await db.execute(select(Buyer).where(Buyer.user_id == current_user.id))
        buyer = res.scalar_one_or_none()

    if not buyer and req.buyer_id:
        res = await db.execute(select(Buyer).where(Buyer.id == req.buyer_id))
        buyer = res.scalar_one_or_none()

    if not buyer:
        # Pick default buyer for quick demo
        res = await db.execute(select(Buyer).limit(1))
        buyer = res.scalar_one_or_none()
        if not buyer:
            raise HTTPException(status_code=400, detail="No buyer profile found")

    # 2. Fetch requested listings
    listing_ids = [item.listing_id for item in req.items]
    res_listings = await db.execute(
        select(CropListing)
        .options(selectinload(CropListing.farmer), selectinload(CropListing.aggregation_point))
        .where(CropListing.id.in_(listing_ids))
    )
    listings_map = {l.id: l for l in res_listings.scalars().all()}

    if not listings_map:
        raise HTTPException(status_code=400, detail="None of the specified crop listings were found")

    # 3. Determine single resolved aggregation point
    point_votes = []
    for item in req.items:
        l = listings_map.get(item.listing_id)
        if l:
            point_votes.append(l.aggregation_point_id)

    if req.preferred_aggregation_point_id:
        resolved_point_id = req.preferred_aggregation_point_id
    elif point_votes:
        # Pick most frequent aggregation point
        most_common_point = Counter(point_votes).most_common(1)[0][0]
        resolved_point_id = most_common_point
    else:
        resolved_point_id = None

    # Fetch resolved point name
    resolved_point_name = None
    if resolved_point_id:
        p_res = await db.execute(select(AggregationPoint).where(AggregationPoint.id == resolved_point_id))
        pt = p_res.scalar_one_or_none()
        if pt:
            resolved_point_name = pt.name

    # 4. Generate QR token
    qr_token = f"KURAL-QR-{uuid.uuid4().hex[:8].upper()}"

    order = Order(
        buyer_id=buyer.id,
        aggregation_point_id=resolved_point_id,
        status=OrderStatusEnum.CONFIRMED,
        qr_code_token=qr_token
    )
    db.add(order)
    await db.flush()

    total_amount = 0.0
    order_items_out = []

    # 5. Process each item and apply single-point resolution & zone check
    for item_req in req.items:
        l = listings_map.get(item_req.listing_id)
        if not l:
            continue

        item_status = ItemStatusEnum.MATCHED
        substitute_for = None

        # Check if item matches resolved collection point and buyer zone
        if l.aggregation_point_id != resolved_point_id:
            # Different aggregation point!
            if l.zone != buyer.zone:
                # E.g. ordering Carrot from Hills while buyer is in Plains
                item_status = ItemStatusEnum.UNAVAILABLE_IN_ZONE
                substitute_for = f"Direct delivery from {l.zone.value} required (Cross-zone)"
            else:
                item_status = ItemStatusEnum.SUBSTITUTED
                substitute_for = f"Aggregated from nearby hub: {l.aggregation_point.name if l.aggregation_point else 'Hub'}"
        else:
            item_status = ItemStatusEnum.MATCHED

        # Reserve quantity
        qty = min(item_req.quantity_kg, l.quantity_kg)
        item_total = qty * l.final_price
        total_amount += item_total

        # Update listing status if fully bought
        if l.quantity_kg <= qty:
            l.status = ListingStatusEnum.RESERVED
        else:
            l.quantity_kg -= qty

        order_item = OrderItem(
            order_id=order.id,
            listing_id=l.id,
            quantity_kg=qty,
            item_status=item_status,
            substitute_for=substitute_for
        )
        db.add(order_item)
        await db.flush()

        order_items_out.append(
            OrderItemOut(
                id=order_item.id,
                order_id=order.id,
                listing_id=l.id,
                crop_name=l.crop_name,
                declared_grade=l.declared_grade.value,
                farmer_name=l.farmer.name if l.farmer else "Farmer",
                unit_price=l.final_price,
                quantity_kg=qty,
                item_status=item_status,
                substitute_for=substitute_for
            )
        )

    # 6. Create Simulated Escrow Transaction
    transaction = Transaction(
        order_id=order.id,
        amount=round(total_amount, 2),
        escrow_status=EscrowStatusEnum.HELD
    )
    db.add(transaction)
    await db.commit()
    await db.refresh(order)
    await db.refresh(transaction)

    return OrderOut(
        id=order.id,
        buyer_id=buyer.id,
        buyer_name=buyer.name,
        aggregation_point_id=order.aggregation_point_id,
        aggregation_point_name=resolved_point_name,
        status=order.status,
        qr_code_token=order.qr_code_token,
        created_at=order.created_at,
        items=order_items_out,
        transaction=TransactionOut(
            id=transaction.id,
            order_id=transaction.order_id,
            amount=transaction.amount,
            escrow_status=transaction.escrow_status,
            released_at=transaction.released_at
        ),
        total_amount=round(total_amount, 2)
    )


@router.get("/orders/mine", response_model=List[OrderOut])
async def get_my_orders(
    buyer_id: Optional[int] = None,
    current_user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Fetch order history for buyer with items, points, and escrow status."""
    target_buyer_id = buyer_id
    if current_user and current_user.role == RoleEnum.BUYER:
        res = await db.execute(select(Buyer).where(Buyer.user_id == current_user.id))
        b = res.scalar_one_or_none()
        if b:
            target_buyer_id = b.id

    query = select(Order).options(
        selectinload(Order.buyer),
        selectinload(Order.aggregation_point),
        selectinload(Order.transaction),
        selectinload(Order.items).selectinload(OrderItem.listing).selectinload(CropListing.farmer)
    ).order_by(Order.created_at.desc())

    if target_buyer_id:
        query = query.where(Order.buyer_id == target_buyer_id)

    result = await db.execute(query)
    orders = result.scalars().all()

    output = []
    for o in orders:
        items_out = []
        tot = 0.0
        for it in o.items:
            l = it.listing
            price = l.final_price if l else 0.0
            tot += it.quantity_kg * price
            items_out.append(
                OrderItemOut(
                    id=it.id,
                    order_id=o.id,
                    listing_id=it.listing_id,
                    crop_name=l.crop_name if l else "Crop",
                    declared_grade=l.declared_grade.value if l else "A",
                    farmer_name=l.farmer.name if l and l.farmer else "Farmer",
                    unit_price=price,
                    quantity_kg=it.quantity_kg,
                    item_status=it.item_status,
                    substitute_for=it.substitute_for
                )
            )

        tx_out = None
        if o.transaction:
            tx_out = TransactionOut(
                id=o.transaction.id,
                order_id=o.transaction.order_id,
                amount=o.transaction.amount,
                escrow_status=o.transaction.escrow_status,
                released_at=o.transaction.released_at
            )

        output.append(
            OrderOut(
                id=o.id,
                buyer_id=o.buyer_id,
                buyer_name=o.buyer.name if o.buyer else None,
                aggregation_point_id=o.aggregation_point_id,
                aggregation_point_name=o.aggregation_point.name if o.aggregation_point else None,
                status=o.status,
                qr_code_token=o.qr_code_token,
                created_at=o.created_at,
                items=items_out,
                transaction=tx_out,
                total_amount=round(o.transaction.amount if o.transaction else tot, 2)
            )
        )

    return output

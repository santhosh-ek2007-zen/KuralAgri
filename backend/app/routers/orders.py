from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import (
    Order, OrderItem, Transaction, CropListing, Farmer, Buyer, Dispute, ReputationLog,
    OrderStatusEnum, EscrowStatusEnum, ActorTypeEnum, ReputationEventEnum, ListingStatusEnum
)
from app.schemas import (
    ConfirmCollectionRequest, ConfirmCollectionResponse, DisputeCreate, DisputeOut, OrderOut, OrderItemOut, TransactionOut
)
from app.routers.auth import get_current_user

router = APIRouter(prefix="/orders", tags=["Orders & Collection"])


@router.get("/lookup/{qr_token}", response_model=OrderOut)
async def lookup_order_by_qr(qr_token: str, db: AsyncSession = Depends(get_db)):
    """Hub manager / Farmer scans QR code to look up order details prior to collection."""
    res = await db.execute(
        select(Order)
        .options(
            selectinload(Order.buyer),
            selectinload(Order.aggregation_point),
            selectinload(Order.transaction),
            selectinload(Order.items).selectinload(OrderItem.listing).selectinload(CropListing.farmer)
        )
        .where(Order.qr_code_token == qr_token.strip())
    )
    order = res.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order with this QR token not found")

    items_out = []
    tot = 0.0
    for it in order.items:
        l = it.listing
        price = l.final_price if l else 0.0
        tot += it.quantity_kg * price
        items_out.append(
            OrderItemOut(
                id=it.id,
                order_id=order.id,
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
    if order.transaction:
        tx_out = TransactionOut(
            id=order.transaction.id,
            order_id=order.transaction.order_id,
            amount=order.transaction.amount,
            escrow_status=order.transaction.escrow_status,
            released_at=order.transaction.released_at
        )

    return OrderOut(
        id=order.id,
        buyer_id=order.buyer_id,
        buyer_name=order.buyer.name if order.buyer else None,
        aggregation_point_id=order.aggregation_point_id,
        aggregation_point_name=order.aggregation_point.name if order.aggregation_point else None,
        status=order.status,
        qr_code_token=order.qr_code_token,
        created_at=order.created_at,
        items=items_out,
        transaction=tx_out,
        total_amount=round(order.transaction.amount if order.transaction else tot, 2)
    )


@router.post("/{id}/confirm-collection", response_model=ConfirmCollectionResponse)
async def confirm_collection(
    id: int,
    req: ConfirmCollectionRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Core trust & payment settlement step:
    1. Validates QR code match.
    2. Flips Order status -> COLLECTED.
    3. Releases Escrow Transaction -> RELEASED, sets released_at = now.
    4. Marks associated crop listings -> SOLD.
    5. Increments reputation score (+1) and logs ReputationLog for Buyer and each Farmer.
    """
    res = await db.execute(
        select(Order)
        .options(
            selectinload(Order.buyer),
            selectinload(Order.transaction),
            selectinload(Order.items).selectinload(OrderItem.listing).selectinload(CropListing.farmer)
        )
        .where(Order.id == id)
    )
    order = res.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.qr_code_token.strip() != req.qr_token.strip():
        raise HTTPException(status_code=400, detail="Invalid QR token for this order")

    if order.status == OrderStatusEnum.COLLECTED:
        return ConfirmCollectionResponse(
            success=True,
            message="Order already collected and escrow previously released",
            order_id=order.id,
            new_status=order.status,
            escrow_status=order.transaction.escrow_status if order.transaction else EscrowStatusEnum.RELEASED,
            buyer_reputation_score=order.buyer.reputation_score if order.buyer else 0,
            farmer_reputations_updated=[]
        )

    # 1. Flip Order Status
    order.status = OrderStatusEnum.COLLECTED

    # 2. Release Escrow
    if order.transaction:
        order.transaction.escrow_status = EscrowStatusEnum.RELEASED
        order.transaction.released_at = datetime.utcnow()

    # 3. Mark listings sold & credit farmers
    farmers_updated = []
    seen_farmers = set()

    for item in order.items:
        if item.listing:
            item.listing.status = ListingStatusEnum.SOLD
            farmer = item.listing.farmer
            if farmer and farmer.id not in seen_farmers:
                seen_farmers.add(farmer.id)
                farmer.reputation_score += 1
                
                # Add reputation log for farmer
                f_log = ReputationLog(
                    actor_type=ActorTypeEnum.FARMER,
                    actor_id=farmer.id,
                    event=ReputationEventEnum.COMPLETED,
                    score_delta=1
                )
                db.add(f_log)
                farmers_updated.append({
                    "farmer_id": farmer.id,
                    "farmer_name": farmer.name,
                    "new_reputation_score": farmer.reputation_score
                })

    # 4. Credit Buyer reputation
    buyer_score = 0
    if order.buyer:
        order.buyer.reputation_score += 1
        buyer_score = order.buyer.reputation_score
        b_log = ReputationLog(
            actor_type=ActorTypeEnum.BUYER,
            actor_id=order.buyer.id,
            event=ReputationEventEnum.COMPLETED,
            score_delta=1
        )
        db.add(b_log)

    await db.commit()
    await db.refresh(order)

    return ConfirmCollectionResponse(
        success=True,
        message="Collection verified! Escrow funds released to farmers and reputation updated (+1)",
        order_id=order.id,
        new_status=order.status,
        escrow_status=order.transaction.escrow_status if order.transaction else EscrowStatusEnum.RELEASED,
        buyer_reputation_score=buyer_score,
        farmer_reputations_updated=farmers_updated
    )


@router.post("/{id}/dispute", response_model=DisputeOut)
async def raise_dispute(
    id: int,
    req: DisputeCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Buyer raises quality dispute:
    1. Flips Order status -> DISPUTED.
    2. Records dispute with evidence photo.
    3. Deducts -1 reputation from farmer pending review.
    """
    res = await db.execute(
        select(Order)
        .options(
            selectinload(Order.items).selectinload(OrderItem.listing).selectinload(CropListing.farmer)
        )
        .where(Order.id == id)
    )
    order = res.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = OrderStatusEnum.DISPUTED

    # Find the order item
    item_res = await db.execute(
        select(OrderItem)
        .options(selectinload(OrderItem.listing).selectinload(CropListing.farmer))
        .where(OrderItem.id == req.order_item_id)
    )
    order_item = item_res.scalar_one_or_none()
    if not order_item:
        raise HTTPException(status_code=404, detail="Order item not found")

    dispute = Dispute(
        order_item_id=req.order_item_id,
        raised_by_id=order.buyer_id,
        evidence_photo_url=req.evidence_photo_url,
        reason=req.reason
    )
    db.add(dispute)

    # Penalize farmer reputation pending review
    if order_item.listing and order_item.listing.farmer:
        farmer = order_item.listing.farmer
        farmer.reputation_score = max(0, farmer.reputation_score - 1)
        f_log = ReputationLog(
            actor_type=ActorTypeEnum.FARMER,
            actor_id=farmer.id,
            event=ReputationEventEnum.DISPUTE_RAISED,
            score_delta=-1
        )
        db.add(f_log)

    await db.commit()
    await db.refresh(dispute)

    return DisputeOut(
        id=dispute.id,
        order_item_id=dispute.order_item_id,
        raised_by_id=dispute.raised_by_id,
        evidence_photo_url=dispute.evidence_photo_url,
        reason=dispute.reason,
        created_at=dispute.created_at
    )

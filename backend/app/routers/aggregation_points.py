from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import AggregationPoint, CropListing, ZoneEnum, ListingStatusEnum
from app.schemas import AggregationPointOut, CropListingOut, AggregationPointCatalog
from app.services.geo import haversine_distance

router = APIRouter(prefix="/aggregation-points", tags=["Aggregation Points"])


@router.get("", response_model=List[AggregationPointOut])
async def list_aggregation_points(
    zone: Optional[ZoneEnum] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    db: AsyncSession = Depends(get_db)
):
    """List active aggregation points, optionally filtered by zone and with calculated distances."""
    query = select(AggregationPoint).where(AggregationPoint.is_active == True)
    if zone:
        query = query.where(AggregationPoint.zone == zone)

    result = await db.execute(query)
    points = result.scalars().all()

    output = []
    for p in points:
        dist = None
        if lat is not None and lng is not None:
            dist = haversine_distance(lat, lng, p.latitude, p.longitude)
        
        output.append(
            AggregationPointOut(
                id=p.id,
                name=p.name,
                zone=p.zone,
                latitude=p.latitude,
                longitude=p.longitude,
                daily_listing_capacity=p.daily_listing_capacity,
                is_active=p.is_active,
                distance_km=dist
            )
        )
    return output


@router.get("/{id}/listings", response_model=AggregationPointCatalog)
async def get_point_listings(
    id: int,
    status: ListingStatusEnum = ListingStatusEnum.AVAILABLE,
    db: AsyncSession = Depends(get_db)
):
    """
    Get everything currently available to collect at this single aggregation point.
    Core buyer browse experience: one point, multiple farmers.
    """
    res_point = await db.execute(select(AggregationPoint).where(AggregationPoint.id == id))
    agg_point = res_point.scalar_one_or_none()
    if not agg_point:
        raise HTTPException(status_code=404, detail="Aggregation point not found")

    res_listings = await db.execute(
        select(CropListing)
        .options(selectinload(CropListing.farmer))
        .where(
            CropListing.aggregation_point_id == id,
            CropListing.status == status
        )
        .order_by(CropListing.crop_name.asc(), CropListing.created_at.desc())
    )
    listings = res_listings.scalars().all()

    transformed = []
    farmer_ids = set()
    total_qty = 0.0

    for item in listings:
        farmer_ids.add(item.farmer_id)
        total_qty += item.quantity_kg
        transformed.append(
            CropListingOut(
                id=item.id,
                farmer_id=item.farmer_id,
                farmer_name=item.farmer.name if item.farmer else None,
                farmer_phone=item.farmer.phone if item.farmer else None,
                farmer_reputation=item.farmer.reputation_score if item.farmer else 0,
                crop_name=item.crop_name,
                quantity_kg=item.quantity_kg,
                harvest_date=item.harvest_date,
                declared_grade=item.declared_grade,
                photo_url=item.photo_url,
                ai_grade_estimate=item.ai_grade_estimate,
                suggested_price=item.suggested_price,
                final_price=item.final_price,
                zone=item.zone,
                aggregation_point_id=item.aggregation_point_id,
                aggregation_point_name=agg_point.name,
                status=item.status,
                created_at=item.created_at
            )
        )

    return AggregationPointCatalog(
        aggregation_point=AggregationPointOut.from_orm(agg_point),
        listings=transformed,
        total_quantity_kg=round(total_qty, 2),
        farmers_count=len(farmer_ids)
    )

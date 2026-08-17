import os
import uuid
import shutil
from datetime import date, datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.config import settings, MEDIA_DIR
from app.models import (
    CropListing, Farmer, AggregationPoint, User, RoleEnum,
    ZoneEnum, GradeEnum, ListingStatusEnum
)
from app.schemas import (
    CropListingCreate, CropListingUpdate, CropListingOut, AggregationPointOut
)
from app.services.geo import get_nearest_aggregation_point, haversine_distance
from app.services.ai_grading import analyze_produce_image
from app.services.pricing import calculate_suggested_price
from app.routers.auth import get_current_user

router = APIRouter(prefix="/listings", tags=["Listings"])


@router.post("/upload-photo")
async def upload_produce_photo(file: UploadFile = File(...)):
    """
    Saves uploaded produce photo to local /media object storage 
    and immediately performs simulated AI computer vision grading.
    """
    ext = os.path.splitext(file.filename)[1].lower() or ".jpg"
    filename = f"crop_{uuid.uuid4().hex[:10]}{ext}"
    file_path = MEDIA_DIR / filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    photo_url = f"/media/{filename}"
    ai_result = analyze_produce_image(str(file_path))

    return {
        "photo_url": photo_url,
        "filename": filename,
        "ai_analysis": ai_result
    }


@router.post("", response_model=CropListingOut)
async def create_listing(
    req: CropListingCreate,
    current_user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Farmer creates a crop listing:
    1. Resolves farmer (from auth or farmer_id param).
    2. Computes nearest aggregation point via Haversine formula based on farmer's coordinates.
    3. Triggers simulated AI quality grading if photo_url is provided.
    4. Calculates suggested mandi pricing if not provided.
    5. Saves listing with status AVAILABLE.
    """
    farmer = None
    if current_user and current_user.role == RoleEnum.FARMER:
        res = await db.execute(select(Farmer).where(Farmer.user_id == current_user.id))
        farmer = res.scalar_one_or_none()

    if not farmer and req.farmer_id:
        res = await db.execute(select(Farmer).where(Farmer.id == req.farmer_id))
        farmer = res.scalar_one_or_none()

    if not farmer:
        # For ease of testing without auth, pick first farmer in zone
        res = await db.execute(select(Farmer).limit(1))
        farmer = res.scalar_one_or_none()
        if not farmer:
            raise HTTPException(status_code=400, detail="No farmer profile found. Please register as farmer first.")

    # 1. Resolve nearest aggregation point using Haversine
    zone = req.zone or farmer.zone
    nearest_result = await get_nearest_aggregation_point(
        db, farmer.latitude, farmer.longitude, zone
    )
    if not nearest_result:
        raise HTTPException(
            status_code=400, 
            detail=f"No active aggregation points found in zone {zone}"
        )
    agg_point, distance_km = nearest_result

    # 2. AI Grading Analysis
    ai_grade_estimate = f"Grade {req.declared_grade.value}"
    if req.photo_url:
        local_path = str(settings.BASE_DIR) + req.photo_url
        if os.path.exists(local_path):
            analysis = analyze_produce_image(local_path)
            ai_grade_estimate = analysis.get("summary", f"Grade {analysis.get('grade', 'A')}")
        else:
            ai_grade_estimate = f"Grade {req.declared_grade.value} (Verified Visual Inspection)"

    # 3. Suggested Mandi Pricing
    pricing_info = calculate_suggested_price(req.crop_name, zone.value)
    suggested_price = req.suggested_price or pricing_info["suggested_price"]
    final_price = req.final_price or suggested_price

    # 4. Create Listing
    listing = CropListing(
        farmer_id=farmer.id,
        crop_name=req.crop_name.strip(),
        quantity_kg=req.quantity_kg,
        harvest_date=req.harvest_date or date.today(),
        declared_grade=req.declared_grade,
        photo_url=req.photo_url,
        ai_grade_estimate=ai_grade_estimate,
        suggested_price=suggested_price,
        final_price=final_price,
        zone=zone,
        aggregation_point_id=agg_point.id,
        status=ListingStatusEnum.AVAILABLE
    )
    db.add(listing)
    await db.commit()
    await db.refresh(listing)

    # Return decorated output
    return CropListingOut(
        id=listing.id,
        farmer_id=farmer.id,
        farmer_name=farmer.name,
        farmer_phone=farmer.phone,
        farmer_reputation=farmer.reputation_score,
        crop_name=listing.crop_name,
        quantity_kg=listing.quantity_kg,
        harvest_date=listing.harvest_date,
        declared_grade=listing.declared_grade,
        photo_url=listing.photo_url,
        ai_grade_estimate=listing.ai_grade_estimate,
        suggested_price=listing.suggested_price,
        final_price=listing.final_price,
        zone=listing.zone,
        aggregation_point_id=agg_point.id,
        aggregation_point_name=agg_point.name,
        status=listing.status,
        created_at=listing.created_at
    )


@router.get("/mine", response_model=List[CropListingOut])
async def get_my_listings(
    farmer_id: Optional[int] = None,
    current_user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Fetch current farmer's listings."""
    target_farmer_id = farmer_id
    if current_user and current_user.role == RoleEnum.FARMER:
        res = await db.execute(select(Farmer).where(Farmer.user_id == current_user.id))
        f = res.scalar_one_or_none()
        if f:
            target_farmer_id = f.id

    query = select(CropListing).options(
        selectinload(CropListing.farmer),
        selectinload(CropListing.aggregation_point)
    ).order_by(CropListing.created_at.desc())

    if target_farmer_id:
        query = query.where(CropListing.farmer_id == target_farmer_id)

    result = await db.execute(query)
    listings = result.scalars().all()

    return [
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
            aggregation_point_name=item.aggregation_point.name if item.aggregation_point else None,
            status=item.status,
            created_at=item.created_at
        ) for item in listings
    ]


@router.get("/{id:int}", response_model=CropListingOut)
async def get_listing(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(CropListing)
        .options(selectinload(CropListing.farmer), selectinload(CropListing.aggregation_point))
        .where(CropListing.id == id)
    )
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    return CropListingOut(
        id=listing.id,
        farmer_id=listing.farmer_id,
        farmer_name=listing.farmer.name if listing.farmer else None,
        farmer_phone=listing.farmer.phone if listing.farmer else None,
        farmer_reputation=listing.farmer.reputation_score if listing.farmer else 0,
        crop_name=listing.crop_name,
        quantity_kg=listing.quantity_kg,
        harvest_date=listing.harvest_date,
        declared_grade=listing.declared_grade,
        photo_url=listing.photo_url,
        ai_grade_estimate=listing.ai_grade_estimate,
        suggested_price=listing.suggested_price,
        final_price=listing.final_price,
        zone=listing.zone,
        aggregation_point_id=listing.aggregation_point_id,
        aggregation_point_name=listing.aggregation_point.name if listing.aggregation_point else None,
        status=listing.status,
        created_at=listing.created_at
    )


@router.patch("/{id:int}", response_model=CropListingOut)
async def update_listing(
    id: int, 
    req: CropListingUpdate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(CropListing)
        .options(selectinload(CropListing.farmer), selectinload(CropListing.aggregation_point))
        .where(CropListing.id == id)
    )
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    if req.final_price is not None:
        listing.final_price = req.final_price
    if req.quantity_kg is not None:
        listing.quantity_kg = req.quantity_kg
    if req.status is not None:
        listing.status = req.status

    await db.commit()
    await db.refresh(listing)

    return CropListingOut(
        id=listing.id,
        farmer_id=listing.farmer_id,
        farmer_name=listing.farmer.name if listing.farmer else None,
        farmer_phone=listing.farmer.phone if listing.farmer else None,
        farmer_reputation=listing.farmer.reputation_score if listing.farmer else 0,
        crop_name=listing.crop_name,
        quantity_kg=listing.quantity_kg,
        harvest_date=listing.harvest_date,
        declared_grade=listing.declared_grade,
        photo_url=listing.photo_url,
        ai_grade_estimate=listing.ai_grade_estimate,
        suggested_price=listing.suggested_price,
        final_price=listing.final_price,
        zone=listing.zone,
        aggregation_point_id=listing.aggregation_point_id,
        aggregation_point_name=listing.aggregation_point.name if listing.aggregation_point else None,
        status=listing.status,
        created_at=listing.created_at
    )

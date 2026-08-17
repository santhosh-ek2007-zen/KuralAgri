from datetime import date
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request, Form, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import Farmer, CropListing, ZoneEnum, GradeEnum, ListingStatusEnum, AccessChannelEnum
from app.schemas import IVRSimulateRequest, CropListingOut
from app.services.geo import get_nearest_aggregation_point
from app.services.pricing import calculate_suggested_price

router = APIRouter(prefix="/ivr", tags=["IVR Voice Simulation"])

CROP_MENU_MAP = {
    "1": "Tomato",
    "2": "Onion",
    "3": "Potato",
    "4": "Carrot",
    "5": "Chilli",
    "6": "Cabbage"
}

GRADE_MENU_MAP = {
    "1": GradeEnum.A,
    "2": GradeEnum.B,
    "3": GradeEnum.C
}


@router.get("/crops-menu")
async def get_ivr_crops_menu():
    """Returns mapping of keypad digits to crops for IVR audio flow."""
    return {
        "crops": CROP_MENU_MAP,
        "grades": {
            "1": "Grade A (Top quality)",
            "2": "Grade B (Standard)",
            "3": "Grade C (Economy)"
        },
        "prompts": {
            "welcome": "Welcome to KuralAgri voice portal. வணக்கம். Press 1 for Tomato, 2 for Onion, 3 for Potato, 4 for Carrot, 5 for Chilli.",
            "quantity": "Please enter your harvest quantity in kilograms followed by the pound key.",
            "grade": "Press 1 for Grade A, 2 for Grade B, 3 for Grade C.",
            "success": "Your crop has been listed and auto-assigned to your nearest aggregation center. You will receive an SMS confirmation."
        }
    }


@router.post("/simulate", response_model=CropListingOut)
async def simulate_ivr_listing(
    req: IVRSimulateRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Simulates a farmer submitting a crop listing through feature-phone IVR voice/keypad.
    This creates an entry using the exact same CropListing pipeline and auto-assigns 
    to the nearest aggregation point via Haversine calculation.
    """
    crop_name = CROP_MENU_MAP.get(req.crop_code, "Tomato")
    declared_grade = GRADE_MENU_MAP.get(req.grade_code, GradeEnum.A)

    # 1. Lookup farmer by phone number or select first farmer
    res = await db.execute(select(Farmer).where(Farmer.phone.like(f"%{req.farmer_phone.strip()}%")))
    farmer = res.scalar_one_or_none()

    if not farmer:
        # Auto-create or pick a demo farmer with this phone number
        res_any = await db.execute(select(Farmer).limit(1))
        farmer = res_any.scalar_one_or_none()
        if not farmer:
            raise HTTPException(status_code=400, detail="No farmer found for IVR registration")

    # 2. Nearest Aggregation Point via Haversine
    nearest_result = await get_nearest_aggregation_point(
        db, farmer.latitude, farmer.longitude, farmer.zone
    )
    if not nearest_result:
        raise HTTPException(status_code=400, detail="No active aggregation point found")
    agg_point, distance_km = nearest_result

    # 3. Pricing Engine calculation
    pricing_info = calculate_suggested_price(crop_name, farmer.zone.value)
    suggested_price = pricing_info["suggested_price"]
    final_price = req.price_per_kg or suggested_price

    # 4. Create Listing with AccessChannel = IVR
    listing = CropListing(
        farmer_id=farmer.id,
        crop_name=crop_name,
        quantity_kg=req.quantity_kg,
        harvest_date=date.today(),
        declared_grade=declared_grade,
        photo_url=None, # IVR listings don't have direct photo uploads
        ai_grade_estimate=f"Grade {declared_grade.value} (Voice Declaration)",
        suggested_price=suggested_price,
        final_price=final_price,
        zone=farmer.zone,
        aggregation_point_id=agg_point.id,
        status=ListingStatusEnum.AVAILABLE
    )
    db.add(listing)
    await db.commit()
    await db.refresh(listing)

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


@router.post("/webhook")
async def twilio_ivr_webhook(
    Digits: Optional[str] = Form(None),
    From: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Standard Twilio TwiML Voice webhook endpoint.
    Returns XML response compatible with Twilio Studio / Voice flows.
    """
    if not Digits:
        twiml = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Gather numDigits="1" action="/api/ivr/webhook" method="POST">
        <Say voice="Polly.Aditi">Vanakkam. Welcome to KuralAgri. Press 1 for Tomato, 2 for Onion, 3 for Potato, 4 for Carrot.</Say>
    </Gather>
</Response>"""
        return Response(content=twiml, media_type="application/xml")

    crop = CROP_MENU_MAP.get(Digits, "Tomato")
    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Aditi">You selected {crop}. Enter harvest quantity in kilograms followed by pound.</Say>
    <Gather finishOnKey="#" action="/api/ivr/webhook/quantity?crop={Digits}" method="POST"/>
</Response>"""
    return Response(content=twiml, media_type="application/xml")

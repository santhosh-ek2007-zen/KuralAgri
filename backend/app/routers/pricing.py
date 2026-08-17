from fastapi import APIRouter, Query
from app.schemas import PriceSuggestionResponse
from app.services.pricing import calculate_suggested_price

router = APIRouter(prefix="/pricing", tags=["Pricing Engine"])


@router.get("/suggest", response_model=PriceSuggestionResponse)
async def suggest_price(
    crop: str = Query(..., description="Crop name e.g. Tomato, Carrot"),
    zone: str = Query("PLAINS_A", description="Zone code e.g. PLAINS_A, HILLS_B")
):
    """
    Returns rule-based Mandi price * demand_multiplier based on regional availability.
    MVP proxy for future ML models.
    """
    result = calculate_suggested_price(crop_name=crop, zone=zone)
    return PriceSuggestionResponse(
        crop=result["crop"],
        zone=result["zone"],
        base_mandi_price=result["base_mandi_price"],
        demand_multiplier=result["demand_multiplier"],
        suggested_price=result["suggested_price"],
        range_min=result["range_min"],
        range_max=result["range_max"],
        market_trend=result["market_trend"]
    )

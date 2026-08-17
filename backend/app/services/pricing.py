from app.config import settings

def calculate_suggested_price(crop_name: str, zone: str = "PLAINS_A") -> dict:
    """
    Rule-based Mandi pricing engine (MVP proxy for future ML).
    Computes base_mandi_price * demand_multiplier based on regional supply-demand.
    """
    normalized_crop = crop_name.strip().capitalize()
    base_price = settings.BASE_MANDI_PRICES.get(normalized_crop, 30.0)
    
    zone_multipliers = settings.ZONE_PRICE_MULTIPLIERS.get(zone, {})
    demand_multiplier = zone_multipliers.get(normalized_crop, 1.0)
    
    suggested = round(base_price * demand_multiplier, 2)
    range_min = round(suggested * 0.90, 2)
    range_max = round(suggested * 1.15, 2)
    
    if demand_multiplier > 1.10:
        trend = "High Demand (Inflow deficit from other zones)"
    elif demand_multiplier < 0.95:
        trend = "Surplus Harvest (Local harvest peak)"
    else:
        trend = "Stable Mandi Rate"

    return {
        "crop": normalized_crop,
        "zone": zone,
        "base_mandi_price": base_price,
        "demand_multiplier": demand_multiplier,
        "suggested_price": suggested,
        "range_min": range_min,
        "range_max": range_max,
        "market_trend": trend
    }

import math
from typing import Optional, List, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import AggregationPoint, Farmer, ZoneEnum

def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees).
    Returns distance in kilometers.
    """
    R = 6371.0  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2)
    c = 2 * math.asin(math.sqrt(a))
    return round(R * c, 2)

async def get_nearest_aggregation_point(
    db: AsyncSession, 
    latitude: float, 
    longitude: float, 
    zone: ZoneEnum
) -> Optional[Tuple[AggregationPoint, float]]:
    """
    Find the nearest active aggregation point in the same zone.
    Returns (AggregationPoint, distance_km).
    """
    result = await db.execute(
        select(AggregationPoint).where(
            AggregationPoint.is_active == True,
            AggregationPoint.zone == zone,
        )
    )
    points = result.scalars().all()
    
    if not points:
        # Fallback: find any active point if zone has none configured
        fallback_res = await db.execute(
            select(AggregationPoint).where(AggregationPoint.is_active == True)
        )
        points = fallback_res.scalars().all()
        if not points:
            return None

    nearest_point = min(
        points, 
        key=lambda p: haversine_distance(latitude, longitude, p.latitude, p.longitude)
    )
    distance = haversine_distance(latitude, longitude, nearest_point.latitude, nearest_point.longitude)
    return nearest_point, distance

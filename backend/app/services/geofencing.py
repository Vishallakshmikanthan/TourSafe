"""
Geo-fencing Service
Checks if a tourist has entered or exited any geo-zone and triggers alerts.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from math import radians, sin, cos, sqrt, atan2


async def check_geofence(tourist_id: str, lat: float, lng: float, db: AsyncSession):
    """
    Check if the tourist is inside any active geo-zone.
    If zone_exit detected → create alert.
    If high-risk zone entered → create alert.
    """
    from app.models import GeoZone, TouristLocation, Alert, Tourist as TouristModel

    # Query zones using PostGIS ST_Contains
    point_wkt = f"SRID=4326;POINT({lng} {lat})"
    zone_q = text(
        """
        SELECT id, name, zone_type
        FROM geo_zones
        WHERE is_active = TRUE
          AND (
            polygon IS NOT NULL AND ST_Contains(polygon, ST_GeomFromEWKT(:pt))
            OR (polygon IS NULL AND ST_DWithin(
                ST_GeomFromEWKT(:pt)::geography,
                center_point::geography,
                COALESCE(radius, 1000)
            ))
          )
        """
    )
    result = await db.execute(zone_q, {"pt": point_wkt})
    zones_inside = result.fetchall()

    # Get tourist
    t_result = await db.execute(select(TouristModel).where(TouristModel.id == tourist_id))
    tourist = t_result.scalar_one_or_none()
    if not tourist:
        return

    for zone in zones_inside:
        zone_id, zone_name, zone_type = zone
        if zone_type == "restricted":
            # Tourist entered restricted zone
            alert = Alert(
                tourist_id=tourist_id,
                zone_id=zone_id,
                title=f"⚠️ Restricted Zone Entry — {tourist.full_name}",
                message=f"{tourist.full_name} has entered restricted zone: {zone_name}",
                severity="high",
                alert_type="geofence",
                status="active",
            )
            db.add(alert)
        elif zone_type == "emergency":
            alert = Alert(
                tourist_id=tourist_id,
                zone_id=zone_id,
                title=f"🆘 Emergency Zone Entry — {tourist.full_name}",
                message=f"{tourist.full_name} has entered emergency zone: {zone_name}",
                severity="critical",
                alert_type="geofence",
                status="active",
            )
            db.add(alert)

    if zones_inside:
        zone_id = str(zones_inside[0][0])
        if tourist.current_zone_id != zone_id:
            tourist.current_zone_id = zone_id

    await db.commit()


def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Returns distance in meters between two GPS points."""
    R = 6_371_000
    phi1, phi2 = radians(lat1), radians(lat2)
    dphi = radians(lat2 - lat1)
    dlambda = radians(lng2 - lng1)
    a = sin(dphi / 2) ** 2 + cos(phi1) * cos(phi2) * sin(dlambda / 2) ** 2
    return R * 2 * atan2(sqrt(a), sqrt(1 - a))

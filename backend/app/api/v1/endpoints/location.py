from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from geoalchemy2.functions import ST_GeomFromText
import logging

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import TouristLocation as LocationModel, Tourist as TouristModel
from app.schemas import LocationUpdate, LocationOut
from app.services.geofencing import check_geofence

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("", response_model=LocationOut, status_code=201)
async def update_location(
    data: LocationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    # Find tourist record
    result = await db.execute(
        select(TouristModel).where(TouristModel.user_id == current_user["sub"])
    )
    tourist = result.scalar_one_or_none()
    if not tourist:
        raise HTTPException(status_code=404, detail="Tourist profile not found")

    point_wkt = f"POINT({data.longitude} {data.latitude})"
    loc = LocationModel(
        tourist_id=tourist.id,
        point=ST_GeomFromText(point_wkt, 4326),
        latitude=data.latitude,
        longitude=data.longitude,
        accuracy=data.accuracy,
        altitude=data.altitude,
        speed=data.speed,
        heading=data.heading,
    )
    db.add(loc)

    # Update last seen (also serves as last-known-location on network loss)
    from datetime import datetime
    tourist.last_seen_at = datetime.utcnow()

    await db.commit()
    await db.refresh(loc)

    # Run geofence check async (fire-and-forget)
    try:
        await check_geofence(tourist.id, data.latitude, data.longitude, db)
    except Exception:
        pass

    # Run itinerary anomaly check (fire-and-forget)
    try:
        await _run_itinerary_anomaly_check(tourist.id, db)
    except Exception as exc:
        logger.debug(f"Itinerary anomaly check error: {exc}")

    return LocationOut(
        id=str(loc.id),
        tourist_id=str(loc.tourist_id),
        latitude=loc.latitude,
        longitude=loc.longitude,
        accuracy=loc.accuracy,
        recorded_at=loc.recorded_at,
    )


async def _run_itinerary_anomaly_check(tourist_id: str, db: AsyncSession):
    """Run itinerary-based anomaly detection and trigger safety check if flagged."""
    from app.services.anomaly_engine import check_itinerary_anomaly
    from app.models import SafetyCheckEvent

    # Get 30 most recent locations
    locs_result = await db.execute(
        select(LocationModel)
        .where(LocationModel.tourist_id == tourist_id)
        .order_by(LocationModel.recorded_at)
        .limit(30)
    )
    raw_locs = locs_result.scalars().all()
    locations = [
        {
            "latitude": l.latitude,
            "longitude": l.longitude,
            "speed": l.speed,
            "heading": l.heading,
            "recorded_at": l.recorded_at.isoformat() if l.recorded_at else None,
        }
        for l in raw_locs
    ]

    result = await check_itinerary_anomaly(tourist_id, locations, db)
    if not result.get("is_anomaly"):
        return

    # Check if un-answered safety check already exists for this tourist
    from datetime import datetime, timedelta
    cutoff = datetime.utcnow() - timedelta(hours=2)
    existing = await db.execute(
        select(SafetyCheckEvent).where(
            SafetyCheckEvent.tourist_id == tourist_id,
            SafetyCheckEvent.created_at >= cutoff,
        )
    )
    if existing.scalar_one_or_none():
        return  # Already sent one recently

    reason = result.get("reason", "anomaly_detected")
    stop_name = result.get("stop_name")
    full_reason = f"{reason}" + (f" at {stop_name}" if stop_name else "")

    sc = SafetyCheckEvent(
        tourist_id=tourist_id,
        reason=full_reason,
        escalated=False,
    )
    db.add(sc)
    await db.commit()

    # Broadcast safety check prompt to tourist
    try:
        from app.api.v1.endpoints.ws import broadcast
        await broadcast(
            {
                "type": "safety_check",
                "check_id": str(sc.id),
                "tourist_id": tourist_id,
                "reason": full_reason,
            },
            role="tourist",
        )
    except Exception as exc:
        logger.warning(f"Safety check broadcast failed: {exc}")


@router.get("/{tourist_id}/history")
async def get_location_history(
    tourist_id: str,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    q = (
        select(LocationModel)
        .where(LocationModel.tourist_id == tourist_id)
        .order_by(desc(LocationModel.recorded_at))
        .limit(limit)
    )
    result = await db.execute(q)
    locs = result.scalars().all()
    return [
        {"latitude": l.latitude, "longitude": l.longitude, "recorded_at": l.recorded_at.isoformat()}
        for l in locs
    ]


@router.get("/{tourist_id}/latest")
async def get_latest_location(
    tourist_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get last known location — works even if tourist is offline."""
    result = await db.execute(
        select(LocationModel)
        .where(LocationModel.tourist_id == tourist_id)
        .order_by(desc(LocationModel.recorded_at))
        .limit(1)
    )
    loc = result.scalar_one_or_none()
    if not loc:
        raise HTTPException(status_code=404, detail="No location data")
    return {
        "latitude": loc.latitude,
        "longitude": loc.longitude,
        "recorded_at": loc.recorded_at,
        "is_last_known": True,
    }

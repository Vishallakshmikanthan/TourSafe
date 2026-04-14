from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from geoalchemy2.functions import ST_GeomFromText

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import TouristLocation as LocationModel, Tourist as TouristModel
from app.schemas import LocationUpdate, LocationOut
from app.services.geofencing import check_geofence

router = APIRouter()


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

    # Update last seen
    from datetime import datetime
    tourist.last_seen_at = datetime.utcnow()

    await db.commit()
    await db.refresh(loc)

    # Run geofence check async (fire-and-forget)
    try:
        await check_geofence(tourist.id, data.latitude, data.longitude, db)
    except Exception:
        pass

    return LocationOut(
        id=str(loc.id),
        tourist_id=str(loc.tourist_id),
        latitude=loc.latitude,
        longitude=loc.longitude,
        accuracy=loc.accuracy,
        recorded_at=loc.recorded_at,
    )


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
    result = await db.execute(
        select(LocationModel)
        .where(LocationModel.tourist_id == tourist_id)
        .order_by(desc(LocationModel.recorded_at))
        .limit(1)
    )
    loc = result.scalar_one_or_none()
    if not loc:
        raise HTTPException(status_code=404, detail="No location data")
    return {"latitude": loc.latitude, "longitude": loc.longitude, "recorded_at": loc.recorded_at}

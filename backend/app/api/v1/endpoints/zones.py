from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models import GeoZone as ZoneModel
from app.schemas import GeoZoneCreate, GeoZoneUpdate, GeoZoneOut

router = APIRouter()


@router.get("")
async def list_zones(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(select(ZoneModel).where(ZoneModel.is_active == True))
    zones = result.scalars().all()
    return [_zone_out(z) for z in zones]


@router.get("/{zone_id}", response_model=GeoZoneOut)
async def get_zone(
    zone_id: str,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(select(ZoneModel).where(ZoneModel.id == zone_id))
    zone = result.scalar_one_or_none()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    return _zone_out(zone)


@router.post("", response_model=GeoZoneOut, status_code=201)
async def create_zone(
    data: GeoZoneCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("authority")),
):
    zone = ZoneModel(
        name=data.name,
        description=data.description,
        zone_type=data.type,
        radius=data.radius,
        created_by=current_user.get("email"),
    )
    if data.polygon:
        from geoalchemy2.shape import from_shape
        from shapely.geometry import shape
        geom = shape(data.polygon)
        zone.polygon = from_shape(geom, srid=4326)

    db.add(zone)
    await db.commit()
    await db.refresh(zone)
    return _zone_out(zone)


@router.patch("/{zone_id}", response_model=GeoZoneOut)
async def update_zone(
    zone_id: str,
    data: GeoZoneUpdate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_role("authority")),
):
    result = await db.execute(select(ZoneModel).where(ZoneModel.id == zone_id))
    zone = result.scalar_one_or_none()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    update = data.model_dump(exclude_none=True)
    if "type" in update:
        zone.zone_type = update.pop("type")
    for k, v in update.items():
        setattr(zone, k, v)

    await db.commit()
    await db.refresh(zone)
    return _zone_out(zone)


@router.delete("/{zone_id}", status_code=204)
async def delete_zone(
    zone_id: str,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_role("authority")),
):
    result = await db.execute(select(ZoneModel).where(ZoneModel.id == zone_id))
    zone = result.scalar_one_or_none()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    zone.is_active = False
    await db.commit()


def _zone_out(z: ZoneModel) -> dict:
    polygon = None
    if z.polygon is not None:
        try:
            from geoalchemy2.shape import to_shape
            from shapely.geometry import mapping
            polygon = mapping(to_shape(z.polygon))
        except Exception:
            pass
    return {
        "id": str(z.id),
        "name": z.name,
        "description": z.description,
        "type": z.zone_type,
        "radius": z.radius,
        "polygon": polygon,
        "is_active": z.is_active,
        "tourist_count": z.tourist_count or 0,
        "alert_count": z.alert_count or 0,
        "created_at": z.created_at.isoformat() if z.created_at else None,
    }

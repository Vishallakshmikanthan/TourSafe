from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models import Incident, Tourist as TouristModel

router = APIRouter()


@router.get("")
async def list_incidents(
    tourist_id: Optional[str] = None,
    status: Optional[str] = None,
    incident_type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    q = select(Incident).order_by(desc(Incident.created_at))
    if tourist_id:
        q = q.where(Incident.tourist_id == tourist_id)
    if status:
        q = q.where(Incident.status == status)
    if incident_type:
        q = q.where(Incident.incident_type == incident_type)
    q = q.limit(limit).offset(offset)
    result = await db.execute(q)
    incidents = result.scalars().all()
    return [_out(i) for i in incidents]


@router.get("/mine")
async def list_my_incidents(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """List incidents for the currently authenticated tourist."""
    t_result = await db.execute(
        select(TouristModel).where(TouristModel.user_id == current_user["sub"])
    )
    tourist = t_result.scalar_one_or_none()
    if not tourist:
        return []
    q = (
        select(Incident)
        .where(Incident.tourist_id == str(tourist.id))
        .order_by(desc(Incident.created_at))
        .limit(100)
    )
    result = await db.execute(q)
    return [_out(i) for i in result.scalars().all()]


@router.get("/{incident_id}")
async def get_incident(
    incident_id: str,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return _out(incident)


@router.patch("/{incident_id}")
async def update_incident(
    incident_id: str,
    data: dict,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_role("authority", "admin")),
):
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    allowed = {"status", "assigned_to", "description", "resolved_at"}
    for k, v in data.items():
        if k in allowed:
            setattr(incident, k, v)

    await db.commit()
    await db.refresh(incident)
    return _out(incident)


def _out(i: Incident) -> dict:
    return {
        "id": str(i.id),
        "tourist_id": str(i.tourist_id) if i.tourist_id else None,
        "alert_id": str(i.alert_id) if i.alert_id else None,
        "incident_type": i.incident_type,
        "status": i.status,
        "latitude": i.latitude,
        "longitude": i.longitude,
        "description": i.description,
        "assigned_to": i.assigned_to,
        "resolved_at": i.resolved_at.isoformat() if i.resolved_at else None,
        "created_at": i.created_at.isoformat() if i.created_at else None,
        "updated_at": i.updated_at.isoformat() if i.updated_at else None,
    }

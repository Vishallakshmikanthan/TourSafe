from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import Incident, Alert, Tourist as TouristModel
from app.schemas import SOSTrigger, SOSOut

router = APIRouter()


@router.post("/trigger", status_code=201)
async def trigger_sos(
    data: SOSTrigger,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(TouristModel).where(TouristModel.user_id == current_user["sub"])
    )
    tourist = result.scalar_one_or_none()
    if not tourist:
        raise HTTPException(status_code=404, detail="Tourist profile not found")

    # Create incident
    incident = Incident(
        tourist_id=tourist.id,
        incident_type="sos",
        status="open",
        latitude=data.latitude,
        longitude=data.longitude,
        description=data.message or "SOS triggered",
    )
    db.add(incident)

    # Create critical alert
    alert = Alert(
        tourist_id=tourist.id,
        title=f"🆘 SOS — {tourist.full_name}",
        message=f"SOS triggered at ({data.latitude}, {data.longitude}). {data.message or ''}",
        severity="critical",
        alert_type="sos",
        status="active",
    )
    db.add(alert)

    # Update tourist status
    tourist.status = "sos"
    tourist.incident_count = (tourist.incident_count or 0) + 1

    await db.commit()
    await db.refresh(incident)

    # Fire dispatcher async
    from app.services.sos_dispatcher import dispatch_sos
    try:
        await dispatch_sos(tourist, incident, data, db)
    except Exception:
        pass

    return {
        "incident_id": str(incident.id),
        "status": "triggered",
        "message": "SOS dispatched. Emergency services notified.",
    }


@router.post("/{incident_id}/acknowledge")
async def acknowledge_sos(
    incident_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    incident.status = "investigating"
    incident.assigned_to = current_user.get("email")
    await db.commit()
    return {"status": "acknowledged"}


@router.post("/{incident_id}/resolve")
async def resolve_sos(
    incident_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    from datetime import datetime
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    incident.status = "resolved"
    incident.resolved_at = datetime.utcnow()

    # Update tourist status back to safe
    t_result = await db.execute(select(TouristModel).where(TouristModel.id == incident.tourist_id))
    tourist = t_result.scalar_one_or_none()
    if tourist:
        tourist.status = "safe"

    await db.commit()
    return {"status": "resolved"}


@router.get("/active")
async def get_active_sos(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(Incident).where(
            Incident.incident_type == "sos",
            Incident.status.in_(["open", "investigating"]),
        ).order_by(Incident.created_at.desc())
    )
    incidents = result.scalars().all()
    return [
        {
            "id": str(i.id),
            "tourist_id": str(i.tourist_id) if i.tourist_id else None,
            "status": i.status,
            "latitude": i.latitude,
            "longitude": i.longitude,
            "created_at": i.created_at.isoformat() if i.created_at else None,
        }
        for i in incidents
    ]

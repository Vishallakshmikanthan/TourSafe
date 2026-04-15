"""
Safety Check Endpoints
Handles automated "Are you safe?" prompts and escalation to authorities.
"""

import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models import SafetyCheckEvent, Tourist as TouristModel, Incident, Alert
from app.schemas import SafetyCheckRespondRequest, SafetyCheckOut

logger = logging.getLogger(__name__)
router = APIRouter()


def _sc_out(sc: SafetyCheckEvent) -> SafetyCheckOut:
    return SafetyCheckOut(
        id=str(sc.id),
        tourist_id=str(sc.tourist_id),
        reason=sc.reason,
        sent_at=sc.sent_at,
        response=sc.response,
        responded_at=sc.responded_at,
        escalated=sc.escalated,
        created_at=sc.created_at,
    )


@router.get("", response_model=list[SafetyCheckOut])
async def list_safety_checks(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """List safety checks for the current tourist."""
    result = await db.execute(
        select(TouristModel).where(TouristModel.user_id == current_user["sub"])
    )
    tourist = result.scalar_one_or_none()
    if not tourist:
        raise HTTPException(status_code=404, detail="Tourist profile not found")

    sc_result = await db.execute(
        select(SafetyCheckEvent)
        .where(SafetyCheckEvent.tourist_id == tourist.id)
        .order_by(SafetyCheckEvent.created_at.desc())
        .limit(20)
    )
    return [_sc_out(sc) for sc in sc_result.scalars().all()]


@router.get("/pending", response_model=list[SafetyCheckOut])
async def get_pending_check(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get unanswered safety check for the current tourist — polled by the client."""
    result = await db.execute(
        select(TouristModel).where(TouristModel.user_id == current_user["sub"])
    )
    tourist = result.scalar_one_or_none()
    if not tourist:
        return []

    sc_result = await db.execute(
        select(SafetyCheckEvent)
        .where(
            SafetyCheckEvent.tourist_id == tourist.id,
            SafetyCheckEvent.response == None,  # noqa
            SafetyCheckEvent.escalated == False,
        )
        .order_by(SafetyCheckEvent.created_at.desc())
        .limit(1)
    )
    return [_sc_out(sc) for sc in sc_result.scalars().all()]


@router.post("/{check_id}/respond", response_model=SafetyCheckOut)
async def respond_to_check(
    check_id: str,
    data: SafetyCheckRespondRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Tourist responds to a safety check prompt."""
    sc_result = await db.execute(
        select(SafetyCheckEvent).where(SafetyCheckEvent.id == check_id)
    )
    sc = sc_result.scalar_one_or_none()
    if not sc:
        raise HTTPException(status_code=404, detail="Safety check not found")

    sc.response = data.response
    sc.responded_at = datetime.utcnow()

    # If tourist says they are unsafe — create SOS incident
    if data.response == "unsafe":
        t_result = await db.execute(
            select(TouristModel).where(TouristModel.id == sc.tourist_id)
        )
        tourist = t_result.scalar_one_or_none()
        if tourist:
            incident = Incident(
                tourist_id=tourist.id,
                incident_type="sos",
                status="open",
                description="Tourist marked themselves unsafe via safety check",
            )
            db.add(incident)
            alert = Alert(
                tourist_id=tourist.id,
                title=f"🆘 Tourist Unsafe — {tourist.full_name}",
                message="Tourist responded 'unsafe' to a wellbeing check. Dispatch required.",
                severity="critical",
                alert_type="sos",
                status="active",
            )
            db.add(alert)
            tourist.status = "sos"

    await db.commit()
    await db.refresh(sc)
    return _sc_out(sc)


@router.post("/trigger/{tourist_id}", status_code=201)
async def trigger_safety_check(
    tourist_id: str,
    reason: str = "anomaly_detected",
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_role("authority")),
):
    """Authority or system triggers a safety check for a tourist."""
    sc = SafetyCheckEvent(
        tourist_id=tourist_id,
        reason=reason,
        sent_at=datetime.utcnow(),
        escalated=False,
    )
    db.add(sc)
    await db.commit()
    await db.refresh(sc)

    # Broadcast via WebSocket
    try:
        from app.api.v1.endpoints.ws import broadcast
        await broadcast(
            {
                "type": "safety_check",
                "check_id": str(sc.id),
                "tourist_id": tourist_id,
                "reason": reason,
            },
            role="tourist",
        )
    except Exception as exc:
        logger.warning(f"Safety check broadcast failed: {exc}")

    return {"check_id": str(sc.id), "status": "sent"}


@router.post("/{check_id}/escalate", status_code=200)
async def escalate_check(
    check_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Called by background scheduler when tourist has not responded in time.
    Marks as escalated and creates an authority alert.
    """
    sc_result = await db.execute(
        select(SafetyCheckEvent).where(SafetyCheckEvent.id == check_id)
    )
    sc = sc_result.scalar_one_or_none()
    if not sc:
        raise HTTPException(status_code=404, detail="Not found")

    if sc.response is not None:
        return {"status": "already_responded"}

    sc.escalated = True
    sc.escalated_at = datetime.utcnow()

    t_result = await db.execute(
        select(TouristModel).where(TouristModel.id == sc.tourist_id)
    )
    tourist = t_result.scalar_one_or_none()
    if tourist:
        alert = Alert(
            tourist_id=tourist.id,
            title=f"⚠️ No Response — {tourist.full_name}",
            message=f"Tourist did not respond to wellbeing check. Reason: {sc.reason}. Investigate.",
            severity="high",
            alert_type="inactivity",
            status="active",
        )
        db.add(alert)
        tourist.status = "alert"

    await db.commit()
    return {"status": "escalated"}

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import Alert as AlertModel
from app.schemas import AlertCreate, AlertUpdate, AlertOut, PagedResponse

router = APIRouter()


@router.get("", response_model=PagedResponse)
async def list_alerts(
    tourist_id: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    alert_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    q = select(AlertModel)
    if tourist_id:
        q = q.where(AlertModel.tourist_id == tourist_id)
    if severity:
        q = q.where(AlertModel.severity == severity)
    if status:
        q = q.where(AlertModel.status == status)
    if alert_type:
        q = q.where(AlertModel.alert_type == alert_type)

    count_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = count_result.scalar_one()

    q = q.order_by(desc(AlertModel.created_at)).offset((page - 1) * limit).limit(limit)
    result = await db.execute(q)
    items = result.scalars().all()

    return PagedResponse(
        items=[_alert_out(a) for a in items],
        total=total,
        page=page,
        page_size=limit,
    )


@router.get("/{alert_id}", response_model=AlertOut)
async def get_alert(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(select(AlertModel).where(AlertModel.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return _alert_out(alert)


@router.post("", response_model=AlertOut, status_code=201)
async def create_alert(
    data: AlertCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    alert = AlertModel(**data.model_dump())
    db.add(alert)
    await db.commit()
    await db.refresh(alert)
    return _alert_out(alert)


@router.patch("/{alert_id}/acknowledge", response_model=AlertOut)
async def acknowledge_alert(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    from datetime import datetime
    result = await db.execute(select(AlertModel).where(AlertModel.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.status = "acknowledged"
    alert.acknowledged_by = current_user.get("email")
    alert.acknowledged_at = datetime.utcnow()
    await db.commit()
    await db.refresh(alert)
    return _alert_out(alert)


@router.patch("/{alert_id}/resolve", response_model=AlertOut)
async def resolve_alert(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    from datetime import datetime
    result = await db.execute(select(AlertModel).where(AlertModel.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.status = "resolved"
    alert.resolved_at = datetime.utcnow()
    await db.commit()
    await db.refresh(alert)
    return _alert_out(alert)


def _alert_out(a: AlertModel) -> AlertOut:
    return AlertOut(
        id=str(a.id),
        tourist_id=str(a.tourist_id) if a.tourist_id else None,
        zone_id=str(a.zone_id) if a.zone_id else None,
        title=a.title,
        message=a.message,
        severity=a.severity,
        alert_type=a.alert_type,
        status=a.status,
        acknowledged_by=a.acknowledged_by,
        acknowledged_at=a.acknowledged_at,
        resolved_at=a.resolved_at,
        created_at=a.created_at,
    )

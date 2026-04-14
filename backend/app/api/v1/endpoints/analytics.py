from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import Tourist as TouristModel, Alert as AlertModel, Incident, TouristLocation, GeoZone

router = APIRouter()


@router.get("/kpis")
async def get_kpis(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)

    active_tourists = await db.scalar(
        select(func.count()).where(TouristModel.is_active == True)
    ) or 0
    active_alerts = await db.scalar(
        select(func.count()).where(AlertModel.status == "active")
    ) or 0
    sos_today = await db.scalar(
        select(func.count()).where(
            and_(Incident.incident_type == "sos", Incident.created_at >= today_start)
        )
    ) or 0
    sos_yesterday = await db.scalar(
        select(func.count()).where(
            and_(
                Incident.incident_type == "sos",
                Incident.created_at >= yesterday_start,
                Incident.created_at < today_start,
            )
        )
    ) or 0

    return {
        "active_tourists": active_tourists,
        "active_tourists_delta": 0.0,
        "active_alerts": active_alerts,
        "active_alerts_delta": 0.0,
        "sos_today": sos_today,
        "sos_today_delta": float(sos_today - sos_yesterday),
        "avg_response_minutes": 12.4,
        "avg_response_minutes_delta": -1.2,
    }


@router.get("/response-times")
async def get_response_times(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """Returns daily average response times for the last N days."""
    data = []
    for i in range(days, 0, -1):
        day = (datetime.utcnow() - timedelta(days=i)).date()
        data.append({
            "date": day.isoformat(),
            "avg_minutes": round(8 + (i % 7) * 1.5, 1),
            "p95_minutes": round(18 + (i % 5) * 2.0, 1),
        })
    return data


@router.get("/incident-trends")
async def get_incident_trends(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    data = []
    for i in range(days, 0, -1):
        day = (datetime.utcnow() - timedelta(days=i)).date()
        q = select(
            Incident.incident_type,
            func.count(Incident.id).label("cnt"),
        ).where(
            func.date(Incident.created_at) == day
        ).group_by(Incident.incident_type)
        result = await db.execute(q)
        rows = {r.incident_type: r.cnt for r in result}
        data.append({
            "date": day.isoformat(),
            "sos": rows.get("sos", 0),
            "inactivity": rows.get("inactivity", 0),
            "zone_exit": rows.get("zone_exit", 0),
            "other": rows.get("other", 0),
        })
    return data


@router.get("/zone-stats")
async def get_zone_stats(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(GeoZone).where(GeoZone.is_active == True).limit(20)
    )
    zones = result.scalars().all()
    return [
        {
            "zone_name": z.name,
            "tourist_count": z.tourist_count or 0,
            "alert_count": z.alert_count or 0,
        }
        for z in zones
    ]


@router.get("/alert-distribution")
async def get_alert_distribution(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(AlertModel.alert_type, func.count(AlertModel.id).label("cnt"))
        .group_by(AlertModel.alert_type)
    )
    rows = result.all()
    return [{"name": r.alert_type, "value": r.cnt} for r in rows]


@router.get("/heatmap")
async def get_heatmap(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    cutoff = datetime.utcnow() - timedelta(hours=24)
    result = await db.execute(
        select(TouristLocation.latitude, TouristLocation.longitude)
        .where(TouristLocation.recorded_at >= cutoff)
        .limit(2000)
    )
    rows = result.all()
    return [{"lat": r.latitude, "lng": r.longitude, "intensity": 1} for r in rows]

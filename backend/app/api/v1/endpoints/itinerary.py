"""
Itinerary Endpoints
Manage tourist trip itineraries including hotel stays and tourist spot schedules.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import Itinerary, ItineraryStop, Tourist as TouristModel
from app.schemas import (
    ItineraryCreate,
    ItineraryUpdate,
    ItineraryOut,
    ItineraryStopCreate,
    ItineraryStopOut,
)

router = APIRouter()


def _stop_out(s: ItineraryStop) -> ItineraryStopOut:
    return ItineraryStopOut(
        id=str(s.id),
        itinerary_id=str(s.itinerary_id),
        spot_name=s.spot_name,
        address=s.address,
        stop_type=s.stop_type or "tourist_spot",
        planned_arrival=s.planned_arrival,
        planned_departure=s.planned_departure,
        expected_duration_hours=s.expected_duration_hours or 3.0,
        latitude=s.latitude,
        longitude=s.longitude,
        notes=s.notes,
        created_at=s.created_at,
    )


def _itinerary_out(it: Itinerary) -> ItineraryOut:
    stops = []
    try:
        for s in it.stops:
            stops.append(_stop_out(s))
    except Exception:
        pass
    return ItineraryOut(
        id=str(it.id),
        tourist_id=str(it.tourist_id),
        title=it.title or "My Trip",
        start_date=it.start_date,
        end_date=it.end_date,
        is_active=it.is_active,
        notes=it.notes,
        stops=stops,
        created_at=it.created_at,
    )


async def _get_tourist(current_user: dict, db: AsyncSession) -> TouristModel:
    result = await db.execute(
        select(TouristModel).where(TouristModel.user_id == current_user["sub"])
    )
    tourist = result.scalar_one_or_none()
    if not tourist:
        raise HTTPException(status_code=404, detail="Tourist profile not found")
    return tourist


@router.get("", response_model=list[ItineraryOut])
async def list_itineraries(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    tourist = await _get_tourist(current_user, db)
    result = await db.execute(
        select(Itinerary)
        .where(Itinerary.tourist_id == tourist.id)
        .order_by(Itinerary.created_at.desc())
    )
    items = result.scalars().all()
    return [_itinerary_out(it) for it in items]


@router.get("/{itinerary_id}", response_model=ItineraryOut)
async def get_itinerary(
    itinerary_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    tourist = await _get_tourist(current_user, db)
    result = await db.execute(
        select(Itinerary).where(
            Itinerary.id == itinerary_id,
            Itinerary.tourist_id == tourist.id,
        )
    )
    it = result.scalar_one_or_none()
    if not it:
        raise HTTPException(status_code=404, detail="Itinerary not found")
    return _itinerary_out(it)


@router.post("", response_model=ItineraryOut, status_code=201)
async def create_itinerary(
    data: ItineraryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    tourist = await _get_tourist(current_user, db)

    it = Itinerary(
        tourist_id=tourist.id,
        title=data.title,
        start_date=data.start_date,
        end_date=data.end_date,
        notes=data.notes,
        is_active=True,
    )
    db.add(it)
    await db.flush()  # get id before adding stops

    for stop_data in (data.stops or []):
        stop = ItineraryStop(
            itinerary_id=it.id,
            **stop_data.model_dump(),
        )
        db.add(stop)

    await db.commit()
    await db.refresh(it)
    return _itinerary_out(it)


@router.patch("/{itinerary_id}", response_model=ItineraryOut)
async def update_itinerary(
    itinerary_id: str,
    data: ItineraryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    tourist = await _get_tourist(current_user, db)
    result = await db.execute(
        select(Itinerary).where(
            Itinerary.id == itinerary_id,
            Itinerary.tourist_id == tourist.id,
        )
    )
    it = result.scalar_one_or_none()
    if not it:
        raise HTTPException(status_code=404, detail="Itinerary not found")

    for k, v in data.model_dump(exclude_none=True).items():
        setattr(it, k, v)
    await db.commit()
    await db.refresh(it)
    return _itinerary_out(it)


@router.delete("/{itinerary_id}", status_code=204)
async def delete_itinerary(
    itinerary_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    tourist = await _get_tourist(current_user, db)
    result = await db.execute(
        select(Itinerary).where(
            Itinerary.id == itinerary_id,
            Itinerary.tourist_id == tourist.id,
        )
    )
    it = result.scalar_one_or_none()
    if not it:
        raise HTTPException(status_code=404, detail="Itinerary not found")
    await db.delete(it)
    await db.commit()


# ─── Stops sub-routes ─────────────────────────────────────────────────────────

@router.post("/{itinerary_id}/stops", response_model=ItineraryStopOut, status_code=201)
async def add_stop(
    itinerary_id: str,
    data: ItineraryStopCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    tourist = await _get_tourist(current_user, db)
    result = await db.execute(
        select(Itinerary).where(
            Itinerary.id == itinerary_id,
            Itinerary.tourist_id == tourist.id,
        )
    )
    it = result.scalar_one_or_none()
    if not it:
        raise HTTPException(status_code=404, detail="Itinerary not found")

    stop = ItineraryStop(itinerary_id=it.id, **data.model_dump())
    db.add(stop)
    await db.commit()
    await db.refresh(stop)
    return _stop_out(stop)


@router.delete("/{itinerary_id}/stops/{stop_id}", status_code=204)
async def delete_stop(
    itinerary_id: str,
    stop_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    tourist = await _get_tourist(current_user, db)
    result = await db.execute(
        select(ItineraryStop).where(
            ItineraryStop.id == stop_id,
            ItineraryStop.itinerary_id == itinerary_id,
        )
    )
    stop = result.scalar_one_or_none()
    if not stop:
        raise HTTPException(status_code=404, detail="Stop not found")
    # Verify ownership
    it_result = await db.execute(
        select(Itinerary).where(
            Itinerary.id == itinerary_id,
            Itinerary.tourist_id == tourist.id,
        )
    )
    if not it_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Forbidden")

    await db.delete(stop)
    await db.commit()

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models import Tourist as TouristModel
from app.schemas import TouristCreate, TouristUpdate, TouristOut, PagedResponse

router = APIRouter()


@router.get("", response_model=PagedResponse)
async def list_tourists(
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_role("authority")),
):
    q = select(TouristModel).where(TouristModel.is_active == True)
    if search:
        like = f"%{search}%"
        q = q.where(
            or_(
                TouristModel.full_name.ilike(like),
                TouristModel.email.ilike(like),
                TouristModel.passport_number.ilike(like),
                TouristModel.nationality.ilike(like),
            )
        )
    count_q = select(func.count()).select_from(q.subquery())
    total_result = await db.execute(count_q)
    total = total_result.scalar_one()

    q = q.offset((page - 1) * page_size).limit(page_size).order_by(TouristModel.created_at.desc())
    result = await db.execute(q)
    items = result.scalars().all()

    return PagedResponse(items=[_to_out(t) for t in items], total=total, page=page, page_size=page_size)


@router.get("/{tourist_id}", response_model=TouristOut)
async def get_tourist(
    tourist_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(select(TouristModel).where(TouristModel.id == tourist_id))
    tourist = result.scalar_one_or_none()
    if not tourist:
        raise HTTPException(status_code=404, detail="Tourist not found")
    return _to_out(tourist)


@router.post("", response_model=TouristOut, status_code=201)
async def create_tourist(
    data: TouristCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    tourist = TouristModel(
        user_id=current_user["sub"],
        **data.model_dump(),
    )
    db.add(tourist)
    await db.commit()
    await db.refresh(tourist)
    return _to_out(tourist)


@router.patch("/{tourist_id}", response_model=TouristOut)
async def update_tourist(
    tourist_id: str,
    data: TouristUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(select(TouristModel).where(TouristModel.id == tourist_id))
    tourist = result.scalar_one_or_none()
    if not tourist:
        raise HTTPException(status_code=404, detail="Tourist not found")

    for k, v in data.model_dump(exclude_none=True).items():
        setattr(tourist, k, v)
    await db.commit()
    await db.refresh(tourist)
    return _to_out(tourist)


def _to_out(t: TouristModel) -> TouristOut:
    return TouristOut(
        id=str(t.id),
        user_id=t.user_id,
        full_name=t.full_name,
        nationality=t.nationality,
        passport_number=t.passport_number,
        phone=t.phone,
        email=t.email,
        date_of_birth=t.date_of_birth,
        gender=t.gender,
        profile_photo_url=t.profile_photo_url,
        did_address=t.did_address,
        did_status=t.did_status or "pending",
        current_zone_id=str(t.current_zone_id) if t.current_zone_id else None,
        status=t.status or "safe",
        incident_count=t.incident_count or 0,
        is_active=t.is_active,
        last_seen_at=t.last_seen_at,
        created_at=t.created_at,
    )

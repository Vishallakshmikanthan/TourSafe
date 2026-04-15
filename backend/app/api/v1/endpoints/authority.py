"""
Authority Profile Endpoints
Registration and management of police/agency authority accounts.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models import AuthorityProfile
from app.schemas import (
    AuthorityProfileCreate,
    AuthorityProfileUpdate,
    AuthorityProfileOut,
)

router = APIRouter()


def _profile_out(p: AuthorityProfile) -> AuthorityProfileOut:
    return AuthorityProfileOut(
        id=str(p.id),
        user_id=p.user_id,
        authority_type=p.authority_type or "police",
        org_name=p.org_name,
        badge_number=p.badge_number,
        contact_phone=p.contact_phone,
        contact_email=p.contact_email,
        agency_tour_types=p.agency_tour_types or [],
        jurisdiction_spots=p.jurisdiction_spots or [],
        verified=p.verified,
        created_at=p.created_at,
    )


@router.get("/me", response_model=AuthorityProfileOut)
async def get_my_profile(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(AuthorityProfile).where(AuthorityProfile.user_id == current_user["sub"])
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Authority profile not found")
    return _profile_out(profile)


@router.post("", response_model=AuthorityProfileOut, status_code=201)
async def create_profile(
    data: AuthorityProfileCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    # Idempotent: return existing if found
    result = await db.execute(
        select(AuthorityProfile).where(AuthorityProfile.user_id == current_user["sub"])
    )
    existing = result.scalar_one_or_none()
    if existing:
        return _profile_out(existing)

    profile = AuthorityProfile(
        user_id=current_user["sub"],
        authority_type=data.authority_type,
        org_name=data.org_name,
        badge_number=data.badge_number,
        contact_phone=data.contact_phone,
        contact_email=data.contact_email,
        agency_tour_types=data.agency_tour_types or [],
        jurisdiction_spots=data.jurisdiction_spots or [],
        verified=False,
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return _profile_out(profile)


@router.patch("/me", response_model=AuthorityProfileOut)
async def update_my_profile(
    data: AuthorityProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(AuthorityProfile).where(AuthorityProfile.user_id == current_user["sub"])
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found. Create one first.")

    for k, v in data.model_dump(exclude_none=True).items():
        setattr(profile, k, v)
    await db.commit()
    await db.refresh(profile)
    return _profile_out(profile)


@router.get("", response_model=list[AuthorityProfileOut])
async def list_profiles(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_role("authority")),
):
    result = await db.execute(select(AuthorityProfile))
    profiles = result.scalars().all()
    return [_profile_out(p) for p in profiles]

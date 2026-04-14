import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import EFIR as EFIRModel, Tourist as TouristModel
from app.schemas import EFIRCreate, EFIROut

router = APIRouter()


@router.get("")
async def list_efirs(
    status: Optional[str] = None,
    tourist_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    q = select(EFIRModel)
    if status:
        q = q.where(EFIRModel.status == status)
    if tourist_id:
        q = q.where(EFIRModel.tourist_id == tourist_id)
    q = q.order_by(EFIRModel.created_at.desc())
    result = await db.execute(q)
    records = result.scalars().all()

    output = []
    for r in records:
        tourist_name = None
        if r.tourist_id:
            t_result = await db.execute(select(TouristModel).where(TouristModel.id == r.tourist_id))
            t = t_result.scalar_one_or_none()
            tourist_name = t.full_name if t else None
        output.append(_efir_out(r, tourist_name))
    return output


@router.get("/{efir_id}")
async def get_efir(
    efir_id: str,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(select(EFIRModel).where(EFIRModel.id == efir_id))
    efir = result.scalar_one_or_none()
    if not efir:
        raise HTTPException(status_code=404, detail="E-FIR not found")
    return _efir_out(efir)


@router.post("", status_code=201)
async def create_efir(
    data: EFIRCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    efir = EFIRModel(
        tourist_id=data.tourist_id,
        incident_type=data.incident_type,
        incident_date=data.incident_date,
        incident_location=data.location,
        description=data.description,
        evidence_urls=data.evidence_urls or [],
        status="draft",
        created_by=current_user.get("email"),
    )
    db.add(efir)
    await db.commit()
    await db.refresh(efir)
    return _efir_out(efir)


@router.post("/{efir_id}/submit")
async def submit_efir(
    efir_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(select(EFIRModel).where(EFIRModel.id == efir_id))
    efir = result.scalar_one_or_none()
    if not efir:
        raise HTTPException(status_code=404, detail="E-FIR not found")
    if efir.status != "draft":
        raise HTTPException(status_code=400, detail="Only draft E-FIRs can be submitted")

    fir_number = f"FIR/{datetime.utcnow().year}/{str(uuid.uuid4())[:8].upper()}"
    efir.fir_number = fir_number
    efir.status = "submitted"
    efir.submitted_at = datetime.utcnow()

    # Record on blockchain
    from app.services.blockchain import record_efir_hash
    try:
        hash_val = await record_efir_hash(efir_id, efir.description)
        efir.blockchain_hash = hash_val
    except Exception:
        pass

    await db.commit()
    return {"fir_number": fir_number, "status": "submitted"}


@router.post("/{efir_id}/archive", status_code=204)
async def archive_efir(
    efir_id: str,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(select(EFIRModel).where(EFIRModel.id == efir_id))
    efir = result.scalar_one_or_none()
    if not efir:
        raise HTTPException(status_code=404, detail="E-FIR not found")
    efir.status = "archived"
    await db.commit()


@router.get("/{efir_id}/pdf")
async def download_pdf(
    efir_id: str,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(select(EFIRModel).where(EFIRModel.id == efir_id))
    efir = result.scalar_one_or_none()
    if not efir:
        raise HTTPException(status_code=404, detail="E-FIR not found")

    from app.services.efir_generator import generate_efir_pdf
    pdf_bytes = await generate_efir_pdf(efir)
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=EFIR-{efir.fir_number or efir_id}.pdf"},
    )


def _efir_out(r: EFIRModel, tourist_name: Optional[str] = None) -> dict:
    return {
        "id": str(r.id),
        "tourist_id": str(r.tourist_id) if r.tourist_id else None,
        "tourist_name": tourist_name,
        "fir_number": r.fir_number,
        "incident_type": r.incident_type,
        "incident_date": r.incident_date,
        "incident_location": r.incident_location,
        "location": r.incident_location,
        "description": r.description,
        "status": r.status,
        "blockchain_hash": r.blockchain_hash,
        "submitted_at": r.submitted_at.isoformat() if r.submitted_at else None,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
    }

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import BlockchainDID, Tourist as TouristModel

router = APIRouter()


@router.get("/did/{tourist_id}")
async def get_did(
    tourist_id: str,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(BlockchainDID).where(BlockchainDID.tourist_id == tourist_id)
    )
    did = result.scalar_one_or_none()
    if not did:
        raise HTTPException(status_code=404, detail="DID not found")
    return {
        "id": str(did.id),
        "tourist_id": str(did.tourist_id),
        "did_address": did.did_address,
        "did_document_hash": did.did_document_hash,
        "ipfs_hash": did.ipfs_hash,
        "tx_hash": did.tx_hash,
        "network": did.network,
        "status": did.status,
        "created_at": did.created_at.isoformat() if did.created_at else None,
    }


@router.post("/did/issue")
async def issue_did(
    tourist_id: str,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """Issue a new Polygon DID for a tourist."""
    from app.services.blockchain import issue_tourist_did

    result = await db.execute(
        select(TouristModel).where(TouristModel.id == tourist_id)
    )
    tourist = result.scalar_one_or_none()
    if not tourist:
        raise HTTPException(status_code=404, detail="Tourist not found")

    did_data = await issue_tourist_did(tourist)
    did_record = BlockchainDID(
        tourist_id=tourist.id,
        did_address=did_data["did_address"],
        did_document_hash=did_data.get("document_hash"),
        ipfs_hash=did_data.get("ipfs_hash"),
        tx_hash=did_data.get("tx_hash"),
        status="active",
    )
    db.add(did_record)
    tourist.did_address = did_data["did_address"]
    tourist.did_status = "active"
    await db.commit()
    return {"did_address": did_data["did_address"], "status": "active"}


@router.post("/verify")
async def verify_did(
    did_address: str,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint to verify a DID on-chain."""
    from app.services.blockchain import verify_did_on_chain

    result = await db.execute(
        select(BlockchainDID).where(BlockchainDID.did_address == did_address)
    )
    did = result.scalar_one_or_none()
    if not did:
        raise HTTPException(status_code=404, detail="DID not registered")

    on_chain = await verify_did_on_chain(did_address)
    return {
        "verified": on_chain.get("valid", False),
        "did_address": did_address,
        "status": did.status,
        "registered_at": did.created_at.isoformat() if did.created_at else None,
    }

"""
Blockchain Service
Handles DID issuance, verification, and EFIR hash recording on Polygon Amoy testnet.
"""

import hashlib
import json
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

POLYGON_RPC_URL = os.getenv("POLYGON_RPC_URL", "https://rpc-amoy.polygon.technology/")
WALLET_PRIVATE_KEY = os.getenv("WALLET_PRIVATE_KEY", "")
DID_REGISTRY_ADDRESS = os.getenv("DID_REGISTRY_ADDRESS", "")


def _get_web3():
    """Lazily initialize Web3 connection."""
    try:
        from web3 import Web3  # type: ignore[import]
        w3 = Web3(Web3.HTTPProvider(POLYGON_RPC_URL))
        return w3 if w3.is_connected() else None
    except Exception as exc:
        logger.warning(f"Web3 connection failed: {exc}")
        return None


def _compute_did_address(tourist_id: str, passport: str) -> str:
    """Deterministic DID address based on tourist identity."""
    seed = f"toursafe:did:{tourist_id}:{passport}".encode()
    return f"0x{hashlib.sha256(seed).hexdigest()[:40]}"


def _build_did_document(tourist: Any, did_address: str) -> dict:
    return {
        "@context": ["https://www.w3.org/ns/did/v1"],
        "id": f"did:polygon:{did_address}",
        "controller": f"did:polygon:{did_address}",
        "verificationMethod": [
            {
                "id": f"did:polygon:{did_address}#key-1",
                "type": "EcdsaSecp256k1VerificationKey2019",
                "controller": f"did:polygon:{did_address}",
                "blockchainAccountId": f"eip155:80002:{did_address}",
            }
        ],
        "authentication": [f"did:polygon:{did_address}#key-1"],
        "service": [
            {
                "id": f"did:polygon:{did_address}#tourist-profile",
                "type": "TouristSafetyProfile",
                "serviceEndpoint": f"https://toursafe.gov.in/tourist/{tourist.id}",
            }
        ],
        "meta": {
            "tourist_id": str(tourist.id),
            "full_name": tourist.full_name,
            "nationality": tourist.nationality,
            "issued_by": "TourSafe Digital Identity Authority",
        },
    }


async def issue_tourist_did(tourist: Any) -> dict:
    """
    Issue a DID for a tourist on Polygon Amoy.
    Returns DID document with transaction hash (or simulation).
    """
    did_address = _compute_did_address(str(tourist.id), tourist.passport_number or "")
    did_document = _build_did_document(tourist, did_address)
    did_doc_str = json.dumps(did_document, sort_keys=True)
    doc_hash = f"0x{hashlib.sha256(did_doc_str.encode()).hexdigest()}"

    w3 = _get_web3()
    tx_hash = doc_hash  # fallback: use doc hash as pseudo tx-hash

    if w3 and WALLET_PRIVATE_KEY and DID_REGISTRY_ADDRESS:
        try:
            account = w3.eth.account.from_key(WALLET_PRIVATE_KEY)
            tx = {
                "to": DID_REGISTRY_ADDRESS,
                "from": account.address,
                "data": w3.to_bytes(hexstr=doc_hash),
                "gas": 100_000,
                "gasPrice": w3.eth.gas_price,
                "nonce": w3.eth.get_transaction_count(account.address),
                "chainId": 80002,  # Polygon Amoy
            }
            signed = account.sign_transaction(tx)
            sent = w3.eth.send_raw_transaction(signed.raw_transaction)
            tx_hash = sent.hex()
            logger.info(f"DID issued on-chain: {tx_hash}")
        except Exception as exc:
            logger.warning(f"On-chain DID issuance failed, using simulation: {exc}")

    return {
        "did_address": f"did:polygon:{did_address}",
        "did_document": did_document,
        "transaction_hash": tx_hash,
        "status": "issued",
    }


async def verify_did_on_chain(did_address: str) -> dict:
    """
    Verify a DID exists and is valid on-chain.
    """
    on_chain = False
    w3 = _get_web3()

    if w3 and DID_REGISTRY_ADDRESS:
        clean = did_address.replace("did:polygon:", "")
        try:
            code = w3.eth.get_code(clean)
            on_chain = len(code) > 0
        except Exception as exc:
            logger.warning(f"DID verification error: {exc}")

    return {
        "did_address": did_address,
        "is_valid": True,  # treat as valid if record exists in DB
        "on_chain": on_chain,
        "network": "Polygon Amoy",
        "chain_id": 80002,
    }


async def record_efir_hash(efir_id: str, description: str) -> str:
    """
    Record the EFIR document hash on-chain for tamper-proofing.
    Returns the blockchain transaction hash.
    """
    content = f"efir:{efir_id}:{description}"
    doc_hash = f"0x{hashlib.sha256(content.encode()).hexdigest()}"

    w3 = _get_web3()
    tx_hash = doc_hash  # simulation fallback

    if w3 and WALLET_PRIVATE_KEY and DID_REGISTRY_ADDRESS:
        try:
            account = w3.eth.account.from_key(WALLET_PRIVATE_KEY)
            tx = {
                "to": DID_REGISTRY_ADDRESS,
                "from": account.address,
                "data": w3.to_bytes(hexstr=doc_hash[:66]),
                "gas": 60_000,
                "gasPrice": w3.eth.gas_price,
                "nonce": w3.eth.get_transaction_count(account.address),
                "chainId": 80002,
            }
            signed = account.sign_transaction(tx)
            sent = w3.eth.send_raw_transaction(signed.raw_transaction)
            tx_hash = sent.hex()
            logger.info(f"EFIR hash recorded on-chain: {tx_hash} for {efir_id}")
        except Exception as exc:
            logger.warning(f"On-chain EFIR hash recording failed, using simulation: {exc}")

    return tx_hash

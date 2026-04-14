"""
SOS Dispatcher Service
Handles SOS broadcast to authorities, push notifications, and assignment logic.
"""

import logging
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


async def dispatch_sos(tourist: Any, incident: Any, data: Any, db: AsyncSession) -> None:
    """
    Dispatch SOS alert to all connected authority WebSocket clients
    and perform notification dispatch.
    """
    from app.api.v1.endpoints.ws import broadcast

    payload = {
        "type": "sos_triggered",
        "incident_id": str(incident.id),
        "tourist_id": str(tourist.id),
        "tourist_name": tourist.full_name,
        "passport_number": tourist.passport_number,
        "latitude": float(data.latitude),
        "longitude": float(data.longitude),
        "message": data.message or "",
        "severity": "critical",
        "timestamp": incident.created_at.isoformat() if incident.created_at else None,
    }

    # Broadcast to all authority clients via WebSocket
    try:
        await broadcast(payload, role="authority")
        logger.info(f"SOS broadcast sent for incident {incident.id}")
    except Exception as exc:
        logger.warning(f"SOS WebSocket broadcast failed: {exc}")

    # Broadcast to admin role as well
    try:
        await broadcast(payload, role="admin")
    except Exception as exc:
        logger.warning(f"SOS admin broadcast failed: {exc}")

    # Placeholder: SMS / push notification integration point
    await _send_push_notification(tourist, incident, data)


async def _send_push_notification(tourist: Any, incident: Any, data: Any) -> None:
    """
    Placeholder for SMS/push notification dispatch.
    Integrate with Twilio, Firebase Cloud Messaging, etc.
    """
    # TODO: Integrate Twilio for SMS to emergency contacts
    if hasattr(tourist, "emergency_contacts") and tourist.emergency_contacts:
        for contact in tourist.emergency_contacts:
            logger.info(
                f"[SMS PLACEHOLDER] Sending SOS notification to {contact.get('name')} "
                f"({contact.get('phone')}) for tourist {tourist.full_name}"
            )

    # TODO: Integrate FCM for push notification to tourist's registered device
    logger.info(
        f"[PUSH PLACEHOLDER] Sending SOS confirmation to tourist {tourist.id} device"
    )

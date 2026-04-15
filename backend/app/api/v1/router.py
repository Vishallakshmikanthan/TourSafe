from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    tourists,
    location,
    sos,
    alerts,
    zones,
    analytics,
    blockchain,
    efir,
    incidents,
    ws,
    itinerary,
    authority,
    safety_check,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(tourists.router, prefix="/tourists", tags=["Tourists"])
api_router.include_router(location.router, prefix="/location", tags=["Location"])
api_router.include_router(sos.router, prefix="/sos", tags=["SOS"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
api_router.include_router(zones.router, prefix="/zones", tags=["Zones"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(blockchain.router, prefix="/blockchain", tags=["Blockchain"])
api_router.include_router(efir.router, prefix="/efir", tags=["E-FIR"])
api_router.include_router(incidents.router, prefix="/incidents", tags=["Incidents"])
api_router.include_router(ws.router, prefix="/ws", tags=["WebSocket"])
api_router.include_router(itinerary.router, prefix="/itinerary", tags=["Itinerary"])
api_router.include_router(authority.router, prefix="/authority", tags=["Authority"])
api_router.include_router(safety_check.router, prefix="/safety-check", tags=["Safety Check"])

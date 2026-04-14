"""WebSocket endpoint for real-time updates to admin dashboard."""

import asyncio
import json
from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.core.security import decode_token

router = APIRouter()

# Connection registry: role -> set of websockets
_connections: Dict[str, Set[WebSocket]] = {
    "authority": set(),
    "tourist": set(),
}


async def broadcast(message: dict, role: str = "authority"):
    """Broadcast a message to all connected clients of a given role."""
    dead = set()
    for ws in _connections.get(role, set()):
        try:
            await ws.send_json(message)
        except Exception:
            dead.add(ws)
    _connections[role] -= dead


@router.websocket("/connect")
async def websocket_endpoint(ws: WebSocket, token: str = Query(...)):
    await ws.accept()
    payload = decode_token(token)
    if not payload:
        await ws.close(code=4001)
        return

    role = payload.get("role", "tourist")
    _connections.setdefault(role, set()).add(ws)
    try:
        await ws.send_json({"type": "connected", "role": role})
        while True:
            # Keep alive: client sends ping, server echoes pong
            data = await ws.receive_text()
            if data == "ping":
                await ws.send_text("pong")
    except WebSocketDisconnect:
        pass
    finally:
        _connections.get(role, set()).discard(ws)

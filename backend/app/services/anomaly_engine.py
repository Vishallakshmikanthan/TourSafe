"""
Anomaly Detection Service
Uses ONNX LSTM model to detect unusual tourist movement patterns.
"""

import os
import numpy as np
from datetime import datetime, timedelta
from typing import Optional

try:
    import onnxruntime as ort
    ONNX_AVAILABLE = True
except ImportError:
    ONNX_AVAILABLE = False


MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "ml_models", "anomaly_lstm.onnx")
_session: Optional[object] = None


def _get_session():
    global _session
    if _session is None and ONNX_AVAILABLE and os.path.exists(MODEL_PATH):
        _session = ort.InferenceSession(MODEL_PATH, providers=["CPUExecutionProvider"])
    return _session


def _build_feature_vector(locations: list[dict]) -> np.ndarray:
    """Build a (seq_len, 4) feature matrix from location dicts."""
    vectors = []
    prev = None
    for loc in locations[-20:]:  # Use last 20 points
        lat, lng = loc["latitude"], loc["longitude"]
        speed = loc.get("speed") or 0.0
        heading = loc.get("heading") or 0.0
        if prev:
            dlat = lat - prev["latitude"]
            dlng = lng - prev["longitude"]
        else:
            dlat = dlng = 0.0
        vectors.append([dlat, dlng, speed, heading])
        prev = loc

    # Pad to length 20
    while len(vectors) < 20:
        vectors.insert(0, [0.0, 0.0, 0.0, 0.0])

    return np.array(vectors, dtype=np.float32)


async def detect_anomaly(tourist_id: str, locations: list[dict]) -> dict:
    """
    Run LSTM anomaly detection on a tourist's recent location sequence.
    Returns: {"is_anomaly": bool, "confidence": float, "reason": str}
    """
    if len(locations) < 5:
        return {"is_anomaly": False, "confidence": 0.0, "reason": "insufficient_data"}

    session = _get_session()
    if session is None:
        # Fallback: rule-based detection
        return _rule_based_detection(locations)

    try:
        features = _build_feature_vector(locations)
        input_name = session.get_inputs()[0].name
        features_batch = features[np.newaxis, ...]  # (1, 20, 4)
        outputs = session.run(None, {input_name: features_batch})
        score = float(outputs[0][0][0])
        is_anomaly = score > 0.75
        return {
            "is_anomaly": is_anomaly,
            "confidence": round(score, 4),
            "reason": "lstm_model",
        }
    except Exception:
        return _rule_based_detection(locations)


def _rule_based_detection(locations: list[dict]) -> dict:
    """
    Fallback: detect anomalies using simple heuristics.
    - Tourist hasn't moved in 30 minutes (inactivity)
    - Speed > 200 km/h (GPS error or vehicle)
    """
    if len(locations) < 2:
        return {"is_anomaly": False, "confidence": 0.0, "reason": "insufficient_data"}

    latest = locations[-1]
    prev = locations[-2]

    # Inactivity check
    if "recorded_at" in latest and "recorded_at" in prev:
        try:
            t1 = datetime.fromisoformat(str(latest["recorded_at"]))
            t2 = datetime.fromisoformat(str(prev["recorded_at"]))
            if (t1 - t2).total_seconds() > 1800:
                return {"is_anomaly": True, "confidence": 0.80, "reason": "inactivity"}
        except Exception:
            pass

    # Speed anomaly
    speed = latest.get("speed") or 0.0
    if speed > 55.0:  # m/s ≈ 200 km/h
        return {"is_anomaly": True, "confidence": 0.65, "reason": "speed_anomaly"}

    return {"is_anomaly": False, "confidence": 0.1, "reason": "normal"}


async def check_itinerary_anomaly(tourist_id: str, locations: list[dict], db) -> dict:
    """
    Cross-check tourist's last known location against their active itinerary.
    If the tourist has been at a stop longer than expected_duration_hours * 1.5,
    flag an anomaly. Also detects if tourist is outside itinerary dates.
    Returns: {is_anomaly, confidence, reason, stop_name}
    """
    try:
        from sqlalchemy import select
        from app.models import Itinerary, ItineraryStop
        import math

        today_str = datetime.utcnow().strftime("%Y-%m-%d")

        # Load active itinerary
        result = await db.execute(
            select(Itinerary).where(
                Itinerary.tourist_id == tourist_id,
                Itinerary.is_active == True,  # noqa
            )
        )
        itinerary = result.scalar_one_or_none()
        if not itinerary:
            return {"is_anomaly": False, "confidence": 0.0, "reason": "no_itinerary"}

        # Check if today is within trip dates
        if today_str < itinerary.start_date or today_str > itinerary.end_date:
            return {
                "is_anomaly": True,
                "confidence": 0.90,
                "reason": "outside_trip_dates",
                "stop_name": None,
            }

        if not locations or len(locations) < 2:
            return {"is_anomaly": False, "confidence": 0.0, "reason": "insufficient_data"}

        # Get latest location
        latest = locations[-1]
        lat = latest.get("latitude", 0)
        lng = latest.get("longitude", 0)

        # Load stops with coordinates
        stops_result = await db.execute(
            select(ItineraryStop).where(ItineraryStop.itinerary_id == itinerary.id)
        )
        stops = stops_result.scalars().all()

        # Find stop nearest to tourist's current position
        nearest_stop = None
        nearest_dist = float("inf")
        for stop in stops:
            if stop.latitude and stop.longitude:
                d = _haversine(lat, lng, stop.latitude, stop.longitude)
                if d < nearest_dist:
                    nearest_dist = d
                    nearest_stop = stop

        if nearest_stop and nearest_dist < 500:
            # Tourist is near a known stop — check if they've been there too long
            expected_hours = nearest_stop.expected_duration_hours or 3.0
            threshold_hours = expected_hours * 1.5  # 50% buffer

            # Find how long they've been near this stop by scanning location history
            first_near = None
            for loc in locations:
                loc_lat = loc.get("latitude", 0)
                loc_lng = loc.get("longitude", 0)
                d = _haversine(loc_lat, loc_lng, nearest_stop.latitude, nearest_stop.longitude)
                if d < 500:
                    if first_near is None:
                        first_near = loc
                else:
                    # They left and came back — reset
                    first_near = None

            if first_near and "recorded_at" in first_near:
                try:
                    t_first = datetime.fromisoformat(str(first_near["recorded_at"]))
                    t_now = datetime.fromisoformat(str(latest["recorded_at"]))
                    hours_at_stop = (t_now - t_first).total_seconds() / 3600
                    if hours_at_stop > threshold_hours:
                        return {
                            "is_anomaly": True,
                            "confidence": min(0.95, 0.6 + (hours_at_stop / threshold_hours) * 0.2),
                            "reason": "extended_stay",
                            "stop_name": nearest_stop.spot_name,
                        }
                except Exception:
                    pass

        return {"is_anomaly": False, "confidence": 0.05, "reason": "normal"}

    except Exception as exc:
        return {"is_anomaly": False, "confidence": 0.0, "reason": f"error: {exc}"}


def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Distance in metres between two GPS coordinates."""
    R = 6_371_000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


import math  # noqa – placed at bottom to avoid circular top-level

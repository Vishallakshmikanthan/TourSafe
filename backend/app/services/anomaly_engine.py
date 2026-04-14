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

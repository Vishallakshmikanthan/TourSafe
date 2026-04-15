import uuid
from datetime import datetime
from geoalchemy2 import Geometry
from sqlalchemy import (
    Boolean, Column, DateTime, Enum, Float, ForeignKey,
    Integer, String, Text, ARRAY, JSON,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


def _uuid():
    return str(uuid.uuid4())


# ─── Tourist ─────────────────────────────────────────────────────────────────

class Tourist(Base):
    __tablename__ = "tourists"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    user_id = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String(200), nullable=False)
    nationality = Column(String(100), nullable=False)
    passport_number = Column(String(50), nullable=False)
    phone = Column(String(30), nullable=False)
    email = Column(String(200), unique=True, nullable=False, index=True)
    date_of_birth = Column(String(20))
    gender = Column(Enum("male", "female", "other", name="gender_enum"))
    profile_photo_url = Column(Text)
    blood_group = Column(String(10))
    medical_conditions = Column(ARRAY(String))
    allergies = Column(ARRAY(String))
    emergency_contacts = Column(JSON, default=list)
    did_address = Column(String(200))
    did_status = Column(
        Enum("active", "pending", "revoked", name="did_status_enum"),
        default="pending",
    )
    current_zone_id = Column(UUID(as_uuid=False), ForeignKey("geo_zones.id"), nullable=True)
    status = Column(
        Enum("safe", "alert", "sos", name="tourist_status_enum"),
        default="safe",
    )
    incident_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    last_seen_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    locations = relationship("TouristLocation", back_populates="tourist", lazy="dynamic")
    alerts = relationship("Alert", back_populates="tourist", lazy="dynamic")
    current_zone = relationship("GeoZone", foreign_keys=[current_zone_id])


# ─── Tourist Location ─────────────────────────────────────────────────────────

class TouristLocation(Base):
    __tablename__ = "tourist_locations"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    tourist_id = Column(UUID(as_uuid=False), ForeignKey("tourists.id", ondelete="CASCADE"), nullable=False, index=True)
    point = Column(Geometry("POINT", srid=4326), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    accuracy = Column(Float)
    altitude = Column(Float)
    speed = Column(Float)
    heading = Column(Float)
    recorded_at = Column(DateTime(timezone=True), default=datetime.utcnow, index=True)

    tourist = relationship("Tourist", back_populates="locations")


# ─── Alert ───────────────────────────────────────────────────────────────────

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    tourist_id = Column(UUID(as_uuid=False), ForeignKey("tourists.id", ondelete="SET NULL"), nullable=True, index=True)
    zone_id = Column(UUID(as_uuid=False), ForeignKey("geo_zones.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(300), nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(
        Enum("low", "medium", "high", "critical", name="alert_severity_enum"),
        nullable=False,
        default="medium",
    )
    alert_type = Column(
        Enum("sos", "anomaly", "geofence", "inactivity", "weather", "manual", name="alert_type_enum"),
        nullable=False,
    )
    status = Column(
        Enum("active", "acknowledged", "resolved", name="alert_status_enum"),
        default="active",
    )
    acknowledged_by = Column(String)
    acknowledged_at = Column(DateTime(timezone=True))
    resolved_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, index=True)

    tourist = relationship("Tourist", back_populates="alerts")
    zone = relationship("GeoZone")


# ─── Incident ─────────────────────────────────────────────────────────────────

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    tourist_id = Column(UUID(as_uuid=False), ForeignKey("tourists.id", ondelete="SET NULL"), nullable=True, index=True)
    alert_id = Column(UUID(as_uuid=False), ForeignKey("alerts.id", ondelete="SET NULL"), nullable=True)
    incident_type = Column(String(100), nullable=False)
    status = Column(
        Enum("open", "investigating", "resolved", "closed", name="incident_status_enum"),
        default="open",
    )
    latitude = Column(Float)
    longitude = Column(Float)
    description = Column(Text)
    assigned_to = Column(String)
    resolved_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, index=True)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


# ─── GeoZone ─────────────────────────────────────────────────────────────────

class GeoZone(Base):
    __tablename__ = "geo_zones"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    zone_type = Column(
        Enum("safe", "restricted", "emergency", "monitoring", name="zone_type_enum"),
        nullable=False,
        default="safe",
    )
    polygon = Column(Geometry("POLYGON", srid=4326))
    center_point = Column(Geometry("POINT", srid=4326))
    radius = Column(Float)
    is_active = Column(Boolean, default=True)
    tourist_count = Column(Integer, default=0)
    alert_count = Column(Integer, default=0)
    created_by = Column(String)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


# ─── BlockchainDID ───────────────────────────────────────────────────────────

class BlockchainDID(Base):
    __tablename__ = "blockchain_dids"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    tourist_id = Column(UUID(as_uuid=False), ForeignKey("tourists.id", ondelete="CASCADE"), unique=True, nullable=False)
    did_address = Column(String(200), unique=True, nullable=False, index=True)
    did_document_hash = Column(String(200))
    ipfs_hash = Column(String(200))
    tx_hash = Column(String(200))
    network = Column(String(50), default="polygon_amoy")
    status = Column(
        Enum("active", "pending", "revoked", name="did_bc_status_enum"),
        default="pending",
    )
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


# ─── EFIR ────────────────────────────────────────────────────────────────────

class EFIR(Base):
    __tablename__ = "efirs"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    tourist_id = Column(UUID(as_uuid=False), ForeignKey("tourists.id", ondelete="SET NULL"), nullable=True, index=True)
    incident_id = Column(UUID(as_uuid=False), ForeignKey("incidents.id", ondelete="SET NULL"), nullable=True)
    fir_number = Column(String(100), unique=True)
    incident_type = Column(String(100), nullable=False)
    incident_date = Column(String(30), nullable=False)
    incident_location = Column(String(500))
    description = Column(Text, nullable=False)
    evidence_urls = Column(ARRAY(String), default=list)
    status = Column(
        Enum("draft", "submitted", "accepted", "archived", name="efir_status_enum"),
        default="draft",
    )
    pdf_url = Column(Text)
    blockchain_hash = Column(String(200))
    submitted_at = Column(DateTime(timezone=True))
    created_by = Column(String)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    tourist = relationship("Tourist")
    incident = relationship("Incident")


# ─── Itinerary ────────────────────────────────────────────────────────────────

class Itinerary(Base):
    __tablename__ = "itineraries"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    tourist_id = Column(UUID(as_uuid=False), ForeignKey("tourists.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(300), nullable=False, default="My Trip")
    start_date = Column(String(20), nullable=False)   # ISO date YYYY-MM-DD
    end_date = Column(String(20), nullable=False)
    is_active = Column(Boolean, default=True)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    stops = relationship("ItineraryStop", back_populates="itinerary", cascade="all, delete-orphan", order_by="ItineraryStop.planned_arrival")
    tourist = relationship("Tourist")


class ItineraryStop(Base):
    __tablename__ = "itinerary_stops"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    itinerary_id = Column(UUID(as_uuid=False), ForeignKey("itineraries.id", ondelete="CASCADE"), nullable=False, index=True)
    spot_name = Column(String(300), nullable=False)
    address = Column(String(500))
    stop_type = Column(
        Enum("hotel", "tourist_spot", "transport", "restaurant", "other", name="stop_type_enum"),
        default="tourist_spot",
    )
    planned_arrival = Column(String(30))   # ISO datetime
    planned_departure = Column(String(30))
    expected_duration_hours = Column(Float, default=3.0)
    latitude = Column(Float)
    longitude = Column(Float)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    itinerary = relationship("Itinerary", back_populates="stops")


# ─── Authority Profile ────────────────────────────────────────────────────────

class AuthorityProfile(Base):
    __tablename__ = "authority_profiles"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    user_id = Column(String, unique=True, nullable=False, index=True)
    authority_type = Column(
        Enum("police", "agency", "hospital", "other", name="authority_type_enum"),
        nullable=False,
        default="police",
    )
    org_name = Column(String(300), nullable=False)
    badge_number = Column(String(100))
    contact_phone = Column(String(30))
    contact_email = Column(String(200))
    # For travel agencies
    agency_tour_types = Column(ARRAY(String), default=list)
    # Jurisdiction: list of spot names under this authority's watch
    jurisdiction_spots = Column(JSON, default=list)
    verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


# ─── Safety Check Event ───────────────────────────────────────────────────────

class SafetyCheckEvent(Base):
    __tablename__ = "safety_check_events"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    tourist_id = Column(UUID(as_uuid=False), ForeignKey("tourists.id", ondelete="CASCADE"), nullable=False, index=True)
    incident_id = Column(UUID(as_uuid=False), ForeignKey("incidents.id", ondelete="SET NULL"), nullable=True)
    reason = Column(String(300))
    sent_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    response = Column(
        Enum("safe", "unsafe", "no_response", name="safety_response_enum"),
        nullable=True,
    )
    responded_at = Column(DateTime(timezone=True))
    escalated = Column(Boolean, default=False)
    escalated_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    tourist = relationship("Tourist")

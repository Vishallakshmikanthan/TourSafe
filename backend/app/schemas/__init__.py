from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, EmailStr, Field


# ─── Shared ───────────────────────────────────────────────────────────────────

class PagedResponse(BaseModel):
    items: list[Any]
    total: int
    page: int
    page_size: int


# ─── Tourist ─────────────────────────────────────────────────────────────────

class EmergencyContactSchema(BaseModel):
    name: str
    phone: str
    relationship: str


class TouristCreate(BaseModel):
    full_name: str
    nationality: str
    passport_number: str
    phone: str
    email: EmailStr
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    medical_conditions: Optional[list[str]] = []
    allergies: Optional[list[str]] = []
    emergency_contacts: Optional[list[EmergencyContactSchema]] = []


class TouristUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    blood_group: Optional[str] = None
    medical_conditions: Optional[list[str]] = None
    allergies: Optional[list[str]] = None
    emergency_contacts: Optional[list[EmergencyContactSchema]] = None


class TouristOut(BaseModel):
    id: str
    user_id: str
    full_name: str
    nationality: str
    passport_number: str
    phone: str
    email: str
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    profile_photo_url: Optional[str] = None
    did_address: Optional[str] = None
    did_status: str
    current_zone_id: Optional[str] = None
    current_zone: Optional[str] = None
    status: str = "safe"
    incident_count: int = 0
    is_active: bool
    last_seen_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Location ────────────────────────────────────────────────────────────────

class LocationUpdate(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    accuracy: Optional[float] = None
    altitude: Optional[float] = None
    speed: Optional[float] = None
    heading: Optional[float] = None


class LocationOut(BaseModel):
    id: str
    tourist_id: str
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    recorded_at: datetime

    class Config:
        from_attributes = True


# ─── Alert ───────────────────────────────────────────────────────────────────

class AlertCreate(BaseModel):
    tourist_id: Optional[str] = None
    zone_id: Optional[str] = None
    title: str
    message: str
    severity: str = "medium"
    alert_type: str


class AlertUpdate(BaseModel):
    status: Optional[str] = None
    acknowledged_by: Optional[str] = None


class AlertOut(BaseModel):
    id: str
    tourist_id: Optional[str] = None
    zone_id: Optional[str] = None
    title: str
    message: str
    severity: str
    alert_type: str
    status: str
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─── SOS ─────────────────────────────────────────────────────────────────────

class SOSTrigger(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    message: Optional[str] = "Emergency SOS"


class SOSOut(BaseModel):
    id: str
    tourist_id: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ─── GeoZone ─────────────────────────────────────────────────────────────────

class GeoZoneCreate(BaseModel):
    name: str
    description: Optional[str] = None
    type: str = "safe"
    radius: Optional[float] = 1000
    polygon: Optional[dict] = None


class GeoZoneUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    radius: Optional[float] = None
    is_active: Optional[bool] = None


class GeoZoneOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    type: str
    radius: Optional[float] = None
    polygon: Optional[dict] = None
    is_active: bool
    tourist_count: int = 0
    alert_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Auth ─────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: str


# ─── EFIR ────────────────────────────────────────────────────────────────────

class EFIRCreate(BaseModel):
    tourist_id: str
    incident_type: str
    incident_date: str
    location: Optional[str] = None
    description: str
    evidence_urls: Optional[list[str]] = []


class EFIROut(BaseModel):
    id: str
    tourist_id: Optional[str] = None
    tourist_name: Optional[str] = None
    fir_number: Optional[str] = None
    incident_type: str
    incident_date: str
    incident_location: Optional[str] = None
    description: str
    status: str
    blockchain_hash: Optional[str] = None
    submitted_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Analytics ───────────────────────────────────────────────────────────────

class KPIsOut(BaseModel):
    active_tourists: int
    active_tourists_delta: float
    active_alerts: int
    active_alerts_delta: float
    sos_today: int
    sos_today_delta: float
    avg_response_minutes: float
    avg_response_minutes_delta: float


# ─── Registration ─────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    role: str = "tourist"
    full_name: Optional[str] = None


class UniqueIdEmailResponse(BaseModel):
    message: str
    unique_id: str
    role: str


# ─── Itinerary ────────────────────────────────────────────────────────────────

class ItineraryStopCreate(BaseModel):
    spot_name: str
    address: Optional[str] = None
    stop_type: str = "tourist_spot"
    planned_arrival: Optional[str] = None
    planned_departure: Optional[str] = None
    expected_duration_hours: float = 3.0
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    notes: Optional[str] = None


class ItineraryStopOut(BaseModel):
    id: str
    itinerary_id: str
    spot_name: str
    address: Optional[str] = None
    stop_type: str
    planned_arrival: Optional[str] = None
    planned_departure: Optional[str] = None
    expected_duration_hours: float
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ItineraryCreate(BaseModel):
    title: str = "My Trip"
    start_date: str
    end_date: str
    notes: Optional[str] = None
    stops: Optional[list[ItineraryStopCreate]] = []


class ItineraryUpdate(BaseModel):
    title: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class ItineraryOut(BaseModel):
    id: str
    tourist_id: str
    title: str
    start_date: str
    end_date: str
    is_active: bool
    notes: Optional[str] = None
    stops: list[ItineraryStopOut] = []
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Authority Profile ────────────────────────────────────────────────────────

class AuthorityProfileCreate(BaseModel):
    authority_type: str = "police"
    org_name: str
    badge_number: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    agency_tour_types: Optional[list[str]] = []
    jurisdiction_spots: Optional[list[str]] = []


class AuthorityProfileUpdate(BaseModel):
    org_name: Optional[str] = None
    badge_number: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    agency_tour_types: Optional[list[str]] = None
    jurisdiction_spots: Optional[list[str]] = None


class AuthorityProfileOut(BaseModel):
    id: str
    user_id: str
    authority_type: str
    org_name: str
    badge_number: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    agency_tour_types: list[str] = []
    jurisdiction_spots: list[str] = []
    verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Safety Check ─────────────────────────────────────────────────────────────

class SafetyCheckRespondRequest(BaseModel):
    response: str  # "safe" | "unsafe"


class SafetyCheckOut(BaseModel):
    id: str
    tourist_id: str
    reason: Optional[str] = None
    sent_at: datetime
    response: Optional[str] = None
    responded_at: Optional[datetime] = None
    escalated: bool
    created_at: datetime

    class Config:
        from_attributes = True

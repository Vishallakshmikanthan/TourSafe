// ─── Tourist Types ───────────────────────────────────────────────────────────

export interface Tourist {
  id: string;
  user_id: string;
  name?: string;
  full_name: string;
  nationality: string;
  passport_number: string;
  phone: string;
  email: string;
  date_of_birth: string;
  gender: "male" | "female" | "other";
  profile_photo_url?: string;
  did_address?: string;
  did_status: "active" | "pending" | "revoked";
  current_zone_id?: string;
  current_zone?: string;
  current_location?: { latitude: number; longitude: number };
  status?: "safe" | "alert" | "sos";
  incident_count?: number;
  last_seen_at?: string;
  is_active: boolean;
  created_at: string;
}

export interface TouristLocation {
  id: string;
  tourist_id: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  recorded_at: string;
  zone_id?: string;
}

export interface MedicalInfo {
  tourist_id: string;
  blood_group: string;
  allergies: string[];
  conditions: string[];
  medications: string[];
  emergency_contacts: EmergencyContact[];
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  is_primary: boolean;
}

// ─── Alert Types ──────────────────────────────────────────────────────────────

export type AlertSeverity = "critical" | "high" | "medium" | "low";
export type AlertType =
  | "sos"
  | "inactivity"
  | "zone_exit"
  | "anomaly"
  | "weather"
  | "infrastructure"
  | "crowd"
  | "system";
export type AlertStatus = "active" | "acknowledged" | "resolved" | "escalated";

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description: string;
  tourist_id?: string;
  tourist?: Tourist;
  zone_id?: string;
  zone?: GeoZone;
  latitude?: number;
  longitude?: number;
  created_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
  assigned_to?: string;
  incident_id?: string;
}

// ─── Incident / SOS Types ─────────────────────────────────────────────────────

export type IncidentStatus =
  | "reported"
  | "dispatched"
  | "in_progress"
  | "resolved"
  | "closed";

export interface Incident {
  id: string;
  tourist_id: string;
  tourist?: Tourist;
  type: string;
  description: string;
  status: IncidentStatus;
  latitude: number;
  longitude: number;
  responder_id?: string;
  zone_id?: string;
  efir_id?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface SOSEvent {
  id?: string;
  incident_id: string;
  tourist_id: string;
  tourist_name: string;
  latitude: number;
  longitude: number;
  zone_name: string;
  did_address?: string;
  status: IncidentStatus;
  triggered_at: string;
  acknowledged_by?: string;
}

// ─── Geo-Zone Types ───────────────────────────────────────────────────────────

export type ZoneType = "safe" | "warning" | "danger" | "restricted";
export type ZoneStatus = "active" | "inactive" | "monitoring";

export interface GeoZone {
  id: string;
  name: string;
  description?: string;
  type: ZoneType;
  status: ZoneStatus;
  polygon: GeoJSON.Polygon;
  center_lat: number;
  center_lng: number;
  radius?: number;
  radius_meters?: number;
  tourist_count: number;
  alert_count: number;
  created_at: string;
  updated_at: string;
}

// ─── Blockchain / DID Types ───────────────────────────────────────────────────

export interface BlockchainDID {
  id: string;
  tourist_id: string;
  did_address: string;
  ipfs_hash?: string;
  qr_code_data: string;
  verification_status: "verified" | "pending" | "failed";
  network: "polygon" | "polygon_amoy";
  created_at: string;
  last_verified_at?: string;
}

// ─── E-FIR Types ──────────────────────────────────────────────────────────────

export type EFIRStatus = "draft" | "submitted" | "accepted" | "archived";

export interface EFIR {
  id: string;
  incident_id: string;
  tourist_id: string;
  tourist?: Tourist;
  tourist_name?: string;
  fir_number?: string;
  /** Alias for fir_number returned by some API responses */
  efir_number?: string;
  status: EFIRStatus;
  incident_type: string;
  incident_date: string;
  incident_location: string;
  location?: string;
  location_description?: string;
  description: string;
  evidence_urls: string[];
  attachments?: string[];
  nationality?: string;
  passport_number?: string;
  pdf_url?: string;
  blockchain_hash?: string;
  submitted_at?: string;
  created_at: string;
  updated_at: string;
}

// ─── Analytics Types ──────────────────────────────────────────────────────────

export interface DashboardKPIs {
  active_tourists: number;
  active_tourists_delta: number;
  active_alerts: number;
  active_alerts_delta: number;
  sos_today: number;
  sos_today_delta: number;
  avg_response_time_minutes: number;
  avg_response_time_delta: number;
  zones_at_risk: number;
  resolved_today: number;
}

export interface ResponseTimeDataPoint {
  date: string;
  avg_minutes: number;
  p95_minutes: number;
}

export interface IncidentTrendPoint {
  date: string;
  sos: number;
  inactivity: number;
  zone_exit: number;
  other: number;
}

export interface ZoneStats {
  zone_id: string;
  zone_name: string;
  tourist_count: number;
  alert_count: number;
  risk_score: number;
}

// ─── Auth Types ───────────────────────────────────────────────────────────────

export type UserRole = "tourist" | "authority" | "admin" | "responder";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  name?: string;
  tourist_id?: string;
  authority_id?: string;
}

// ─── WebSocket Message Types ──────────────────────────────────────────────────

export type WSMessageType =
  | "sos_event"
  | "location_update"
  | "alert_created"
  | "alert_updated"
  | "incident_updated"
  | "zone_updated"
  | "tourist_status";

export interface WSMessage<T = unknown> {
  type: WSMessageType;
  payload: T;
  timestamp: string;
}

// ─── Map Types ────────────────────────────────────────────────────────────────

export interface MapViewState {
  center: [number, number];
  zoom: number;
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
}

export interface TouristMarker {
  tourist_id: string;
  name: string;
  latitude: number;
  longitude: number;
  status: "safe" | "alert" | "sos" | "inactive";
  last_seen: string;
}

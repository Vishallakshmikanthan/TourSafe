-- ============================================================
-- TourSafe Initial Database Migration
-- PostgreSQL 15+ with PostGIS 3.x and pgcrypto
-- Run against Supabase / self-hosted Postgres
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================
-- ENUM TYPES
-- ============================================================

DO $$ BEGIN
  CREATE TYPE gender_enum AS ENUM ('male', 'female', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END$$;

DO $$ BEGIN
  CREATE TYPE tourist_status_enum AS ENUM ('safe', 'alert', 'sos', 'inactive', 'checked_out');
EXCEPTION WHEN duplicate_object THEN NULL; END$$;

DO $$ BEGIN
  CREATE TYPE alert_severity_enum AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END$$;

DO $$ BEGIN
  CREATE TYPE alert_status_enum AS ENUM ('active', 'acknowledged', 'resolved', 'dismissed');
EXCEPTION WHEN duplicate_object THEN NULL; END$$;

DO $$ BEGIN
  CREATE TYPE alert_type_enum AS ENUM ('sos', 'geofence', 'inactivity', 'anomaly', 'zone_exit', 'system', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END$$;

DO $$ BEGIN
  CREATE TYPE incident_type_enum AS ENUM ('sos', 'inactivity', 'zone_exit', 'anomaly', 'medical', 'theft', 'accident', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END$$;

DO $$ BEGIN
  CREATE TYPE incident_status_enum AS ENUM ('open', 'investigating', 'resolved', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END$$;

DO $$ BEGIN
  CREATE TYPE zone_type_enum AS ENUM ('safe', 'restricted', 'emergency', 'tourist', 'buffer');
EXCEPTION WHEN duplicate_object THEN NULL; END$$;

DO $$ BEGIN
  CREATE TYPE did_status_enum AS ENUM ('active', 'revoked', 'pending');
EXCEPTION WHEN duplicate_object THEN NULL; END$$;

DO $$ BEGIN
  CREATE TYPE efir_status_enum AS ENUM ('draft', 'submitted', 'under_review', 'resolved', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END$$;

-- ============================================================
-- TABLES
-- ============================================================

-- Tourists
CREATE TABLE IF NOT EXISTS tourists (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name           TEXT NOT NULL,
    email               TEXT UNIQUE,
    phone               TEXT,
    passport_number     TEXT UNIQUE NOT NULL,
    nationality         TEXT NOT NULL,
    gender              gender_enum,
    date_of_birth       DATE,
    photo_url           TEXT,
    supabase_user_id    TEXT UNIQUE,
    status              tourist_status_enum NOT NULL DEFAULT 'safe',
    current_zone_id     UUID,
    last_seen_at        TIMESTAMPTZ,
    check_in_date       DATE,
    check_out_date      DATE,
    emergency_contacts  JSONB DEFAULT '[]'::jsonb,
    incident_count      INTEGER NOT NULL DEFAULT 0,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tourist location history
CREATE TABLE IF NOT EXISTS tourist_locations (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tourist_id  UUID NOT NULL REFERENCES tourists(id) ON DELETE CASCADE,
    location    GEOMETRY(POINT, 4326) NOT NULL,
    accuracy    FLOAT,
    speed       FLOAT,
    heading     FLOAT,
    altitude    FLOAT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Geographic zones
CREATE TABLE IF NOT EXISTS geo_zones (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            TEXT NOT NULL,
    description     TEXT,
    zone_type       zone_type_enum NOT NULL DEFAULT 'tourist',
    polygon         GEOMETRY(POLYGON, 4326),
    center_point    GEOMETRY(POINT, 4326),
    radius          FLOAT,
    risk_level      INTEGER NOT NULL DEFAULT 1 CHECK (risk_level BETWEEN 1 AND 5),
    color           TEXT DEFAULT '#046A38',
    tourist_count   INTEGER NOT NULL DEFAULT 0,
    alert_count     INTEGER NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK from tourists to geo_zones after geo_zones exists
ALTER TABLE tourists
    ADD CONSTRAINT fk_tourists_current_zone
    FOREIGN KEY (current_zone_id) REFERENCES geo_zones(id) ON DELETE SET NULL
    NOT VALID;

-- Alerts
CREATE TABLE IF NOT EXISTS alerts (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tourist_id  UUID REFERENCES tourists(id) ON DELETE SET NULL,
    zone_id     UUID REFERENCES geo_zones(id) ON DELETE SET NULL,
    title       TEXT NOT NULL,
    message     TEXT,
    severity    alert_severity_enum NOT NULL DEFAULT 'medium',
    alert_type  alert_type_enum NOT NULL DEFAULT 'system',
    status      alert_status_enum NOT NULL DEFAULT 'active',
    metadata    JSONB DEFAULT '{}'::jsonb,
    acknowledged_at  TIMESTAMPTZ,
    resolved_at      TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Incidents
CREATE TABLE IF NOT EXISTS incidents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tourist_id      UUID REFERENCES tourists(id) ON DELETE SET NULL,
    zone_id         UUID REFERENCES geo_zones(id) ON DELETE SET NULL,
    incident_type   incident_type_enum NOT NULL DEFAULT 'other',
    description     TEXT,
    status          incident_status_enum NOT NULL DEFAULT 'open',
    latitude        FLOAT,
    longitude       FLOAT,
    resolved_by     TEXT,
    response_time   INTERVAL,
    metadata        JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Blockchain DID registry
CREATE TABLE IF NOT EXISTS blockchain_dids (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tourist_id      UUID NOT NULL REFERENCES tourists(id) ON DELETE CASCADE,
    did_address     TEXT NOT NULL UNIQUE,
    did_document    JSONB,
    transaction_hash TEXT,
    status          did_status_enum NOT NULL DEFAULT 'active',
    issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- E-FIR (Electronic First Information Reports)
CREATE TABLE IF NOT EXISTS efirs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tourist_id      UUID REFERENCES tourists(id) ON DELETE SET NULL,
    incident_id     UUID REFERENCES incidents(id) ON DELETE SET NULL,
    fir_number      TEXT UNIQUE,
    incident_type   TEXT,
    description     TEXT NOT NULL,
    incident_date   TIMESTAMPTZ,
    location        TEXT,
    zone_name       TEXT,
    status          efir_status_enum NOT NULL DEFAULT 'draft',
    blockchain_hash TEXT,
    officer_name    TEXT,
    submitted_at    TIMESTAMPTZ,
    resolved_at     TIMESTAMPTZ,
    archived_at     TIMESTAMPTZ,
    attachments     TEXT[] DEFAULT ARRAY[]::TEXT[],
    metadata        JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- PostGIS spatial indexes (GIST)
CREATE INDEX IF NOT EXISTS idx_tourist_locations_geom
    ON tourist_locations USING GIST (location);

CREATE INDEX IF NOT EXISTS idx_geo_zones_polygon
    ON geo_zones USING GIST (polygon);

CREATE INDEX IF NOT EXISTS idx_geo_zones_center
    ON geo_zones USING GIST (center_point);

-- B-Tree indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tourist_locations_tourist_id
    ON tourist_locations (tourist_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_tourist_id
    ON alerts (tourist_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_status
    ON alerts (status, severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_incidents_tourist_id
    ON incidents (tourist_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_incidents_status
    ON incidents (status, incident_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_efirs_tourist_id
    ON efirs (tourist_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_efirs_status
    ON efirs (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_blockchain_dids_tourist
    ON blockchain_dids (tourist_id);

CREATE INDEX IF NOT EXISTS idx_tourists_status
    ON tourists (status, is_active);

CREATE INDEX IF NOT EXISTS idx_tourists_passport
    ON tourists (passport_number);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_tourists_updated_at
    BEFORE UPDATE ON tourists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END$$;

DO $$ BEGIN
  CREATE TRIGGER trg_geo_zones_updated_at
    BEFORE UPDATE ON geo_zones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END$$;

DO $$ BEGIN
  CREATE TRIGGER trg_alerts_updated_at
    BEFORE UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END$$;

DO $$ BEGIN
  CREATE TRIGGER trg_incidents_updated_at
    BEFORE UPDATE ON incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END$$;

DO $$ BEGIN
  CREATE TRIGGER trg_efirs_updated_at
    BEFORE UPDATE ON efirs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END$$;

-- ============================================================
-- ROW LEVEL SECURITY (Supabase)
-- ============================================================

ALTER TABLE tourists             ENABLE ROW LEVEL SECURITY;
ALTER TABLE tourist_locations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents            ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_zones            ENABLE ROW LEVEL SECURITY;
ALTER TABLE blockchain_dids      ENABLE ROW LEVEL SECURITY;
ALTER TABLE efirs                ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (used by FastAPI backend with service_role key)
CREATE POLICY "service_role_all_tourists"
    ON tourists FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_locations"
    ON tourist_locations FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_alerts"
    ON alerts FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_incidents"
    ON incidents FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_zones"
    ON geo_zones FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_dids"
    ON blockchain_dids FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_efirs"
    ON efirs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Tourists can read their own data
CREATE POLICY "tourist_read_own"
    ON tourists FOR SELECT TO authenticated
    USING (supabase_user_id = auth.uid()::text);

CREATE POLICY "tourist_read_own_locations"
    ON tourist_locations FOR SELECT TO authenticated
    USING (tourist_id IN (
        SELECT id FROM tourists WHERE supabase_user_id = auth.uid()::text
    ));

CREATE POLICY "tourist_read_own_alerts"
    ON alerts FOR SELECT TO authenticated
    USING (tourist_id IN (
        SELECT id FROM tourists WHERE supabase_user_id = auth.uid()::text
    ));

CREATE POLICY "tourist_read_own_efirs"
    ON efirs FOR SELECT TO authenticated
    USING (tourist_id IN (
        SELECT id FROM tourists WHERE supabase_user_id = auth.uid()::text
    ));

-- Zones are publicly readable
CREATE POLICY "zones_public_read"
    ON geo_zones FOR SELECT TO authenticated USING (is_active = true);

-- ============================================================
-- SEED: DEFAULT TOURIST ZONE
-- ============================================================

INSERT INTO geo_zones (name, description, zone_type, risk_level, color)
VALUES
    ('Taj Mahal Complex', 'UNESCO World Heritage Site — Agra', 'tourist', 1, '#046A38'),
    ('Red Fort Area', 'Historical monument — Delhi', 'tourist', 1, '#046A38'),
    ('Restricted Border Zone Alpha', 'Border restricted zone', 'restricted', 5, '#C53030'),
    ('Emergency Response Zone 1', 'Coordinated emergency response area', 'emergency', 4, '#FF6B00')
ON CONFLICT DO NOTHING;

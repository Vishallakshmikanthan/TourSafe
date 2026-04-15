-- ============================================================
-- TourSafe Migration 002 — Itinerary, Authority, Safety Check
-- Run against Supabase / self-hosted Postgres after 001_initial.sql
-- ============================================================

-- New enum types
DO $$ BEGIN
  CREATE TYPE stop_type_enum AS ENUM ('hotel', 'tourist_spot', 'transport', 'restaurant', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END$$;

DO $$ BEGIN
  CREATE TYPE authority_type_enum AS ENUM ('police', 'agency', 'hospital', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END$$;

DO $$ BEGIN
  CREATE TYPE safety_response_enum AS ENUM ('safe', 'unsafe', 'no_response');
EXCEPTION WHEN duplicate_object THEN NULL; END$$;

-- ─── Itineraries ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS itineraries (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tourist_id   UUID NOT NULL REFERENCES tourists(id) ON DELETE CASCADE,
    title        VARCHAR(300) NOT NULL DEFAULT 'My Trip',
    start_date   VARCHAR(20)  NOT NULL,
    end_date     VARCHAR(20)  NOT NULL,
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
    notes        TEXT,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_itineraries_tourist ON itineraries(tourist_id);

-- ─── Itinerary Stops ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS itinerary_stops (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    itinerary_id            UUID NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
    spot_name               VARCHAR(300)     NOT NULL,
    address                 VARCHAR(500),
    stop_type               stop_type_enum   DEFAULT 'tourist_spot',
    planned_arrival         VARCHAR(30),
    planned_departure       VARCHAR(30),
    expected_duration_hours FLOAT            DEFAULT 3.0,
    latitude                FLOAT,
    longitude               FLOAT,
    notes                   TEXT,
    created_at              TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stops_itinerary ON itinerary_stops(itinerary_id);

-- ─── Authority Profiles ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS authority_profiles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             TEXT NOT NULL UNIQUE,
    authority_type      authority_type_enum NOT NULL DEFAULT 'police',
    org_name            VARCHAR(300) NOT NULL,
    badge_number        VARCHAR(100),
    contact_phone       VARCHAR(30),
    contact_email       VARCHAR(200),
    agency_tour_types   TEXT[]       DEFAULT '{}',
    jurisdiction_spots  JSONB        DEFAULT '[]',
    verified            BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_authority_user ON authority_profiles(user_id);

-- ─── Safety Check Events ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS safety_check_events (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tourist_id    UUID NOT NULL REFERENCES tourists(id) ON DELETE CASCADE,
    incident_id   UUID REFERENCES incidents(id) ON DELETE SET NULL,
    reason        VARCHAR(300),
    sent_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    response      safety_response_enum,
    responded_at  TIMESTAMPTZ,
    escalated     BOOLEAN     NOT NULL DEFAULT FALSE,
    escalated_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_safety_check_tourist ON safety_check_events(tourist_id);

-- 062_activity_consent.sql
-- Activity tracking, superadmin sessions, and Terms/Privacy consent.
--
-- Design constraint: scripts/run-migrations.mjs splits statement-by-statement
-- on semicolons. This file therefore contains NO DO $$ blocks and no
-- semicolons inside string literals or inline comments. Keep it that way.
-- (Migration 014 was silently skipped in production because it broke this
-- shape. Every new column added here MUST be column-probed after running.)
--
-- Three tables with strictly separated read scopes:
--   activity_events  - tenant-visible WHAT (NO ip/geo columns on purpose)
--   auth_sessions    - superadmin-only WHERE-FROM (no tenant policy at all)
--   consent_records  - per (business, user, versions) acceptance proof
--
-- Event category/action vocabulary is validated in application code
-- (src/lib/activity, Task 6), not in the DB, so adding categories later does
-- not require a migration.

-- ============================================================
-- 1. activity_events — human-initiated tenant activity log
-- ============================================================

CREATE TABLE IF NOT EXISTS activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_label TEXT,
  category TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  summary TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_events_business_created
  ON activity_events(business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_events_created
  ON activity_events(created_at DESC);

ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business scoped activity_events" ON activity_events;
DROP POLICY IF EXISTS "Super admin full access on activity_events" ON activity_events;
DROP POLICY IF EXISTS "Service role full access on activity_events" ON activity_events;

-- Tenants read their own business, superadmins read everything.
CREATE POLICY "Business scoped activity_events" ON activity_events
  FOR SELECT
  USING (business_id = get_user_business_id() OR is_superadmin());

CREATE POLICY "Super admin full access on activity_events" ON activity_events
  FOR ALL
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- Writes happen only via the service role (src/app/api/activity, Task 6).
CREATE POLICY "Service role full access on activity_events" ON activity_events
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 2. auth_sessions — superadmin-only session / geo capture
-- ============================================================
-- Written by the proxy (src/lib/analytics/session, Task 3) via the service
-- role using the hc_sid cookie as the session key. There is deliberately NO
-- tenant-facing policy: Postgres RLS restricts rows, not columns, so uprooting
-- IP/city here is what keeps location data out of tenant hands.

CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  ip_address TEXT,
  city TEXT,
  country TEXT,
  country_region TEXT,
  latitude NUMERIC(9, 6),
  longitude NUMERIC(9, 6),
  user_agent TEXT,
  path TEXT,
  session_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_sessions_session_id
  ON auth_sessions(session_id, user_id);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_business_last_seen
  ON auth_sessions(business_id, last_seen DESC);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_last_seen
  ON auth_sessions(last_seen DESC);

ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin full access on auth_sessions" ON auth_sessions;
DROP POLICY IF EXISTS "Service role full access on auth_sessions" ON auth_sessions;

CREATE POLICY "Super admin full access on auth_sessions" ON auth_sessions
  FOR ALL
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

CREATE POLICY "Service role full access on auth_sessions" ON auth_sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 3. consent_records — durable Terms/Privacy acceptance proof
-- ============================================================
-- One row per (user, terms_version, privacy_version) so a user can hold a
-- receipt for every version bump. IP/UA are recorded server-side by the
-- accept endpoint (Task 12). Users cannot self-forge acceptance (no user
-- INSERT policy).

CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  terms_version INTEGER NOT NULL DEFAULT 1,
  privacy_version INTEGER NOT NULL DEFAULT 1,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS consent_records_user_versions_key
  ON consent_records(user_id, terms_version, privacy_version);

CREATE INDEX IF NOT EXISTS idx_consent_records_business_created
  ON consent_records(business_id, created_at DESC);

ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own consent_records" ON consent_records;
DROP POLICY IF EXISTS "Super admin full access on consent_records" ON consent_records;
DROP POLICY IF EXISTS "Service role full access on consent_records" ON consent_records;

CREATE POLICY "Users view own consent_records" ON consent_records
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Super admin full access on consent_records" ON consent_records
  FOR ALL
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

CREATE POLICY "Service role full access on consent_records" ON consent_records
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 4. businesses.consent_state — enforcement mode per business
-- ============================================================
-- 'required' — hard gate in the proxy (new signups, default).
-- 'soft'     — existing tenants may keep working with a notice (Task 16).

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS consent_state TEXT NOT NULL DEFAULT 'required';

ALTER TABLE businesses DROP CONSTRAINT IF EXISTS businesses_consent_state_check;
ALTER TABLE businesses ADD CONSTRAINT businesses_consent_state_check
  CHECK (consent_state IN ('soft', 'required'));

CREATE INDEX IF NOT EXISTS idx_businesses_consent_state_required
  ON businesses(consent_state) WHERE consent_state = 'required';

-- ============================================================
-- 5. system_settings seeds
-- ============================================================

INSERT INTO system_settings (id, value) VALUES
  ('legal_versions', '{"terms_version": 1, "terms_updated_at": "2026-10-08T00:00:00Z", "privacy_version": 1, "privacy_updated_at": "2026-10-08T00:00:00Z"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- enforce_from: first timestamp that separates 'required' from 'soft'
-- businesses. NULL until Task 16 sets it, the proxy gate honors it.
INSERT INTO system_settings (id, value) VALUES
  ('consent_gate', '{"enforce_from": null}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Post-apply column probe (run against the target project):
--   PATCH /rest/v1/businesses?id=00000000-0000-0000-0000-000000000000
--   { "consent_state": null }   -> 204 = column exists, 400 PGRST204 = missing
-- Same probe for auth_sessions.ip_address and consent_records.terms_version.
-- ============================================================
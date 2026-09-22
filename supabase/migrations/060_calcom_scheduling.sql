-- ============================================================
-- 060_calcom_scheduling.sql — Cal.com scheduling / bookings sync
--
-- Stores bookings received from the Cal.com webhook so the
-- dashboard can show who booked what. Written by
-- src/app/api/calcom/webhook/route.ts (service-role client),
-- read by src/app/(dashboard)/bookings/page.tsx.
--
-- Credentials for the Cal.com API live in business_integrations
-- (type = 'calcom'); see src/lib/integrations/calcom.ts. The row
-- below in system_settings provides global (env-style) fallbacks
-- for self-hosted deployments, mirroring 'integrations_global'.
-- ============================================================

CREATE TABLE IF NOT EXISTS cal_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  -- Cal.com's `uid` from the webhook payload — the per-booking
  -- natural key used for idempotent upserts.
  cal_uid TEXT NOT NULL,
  cal_booking_id BIGINT,
  cal_event_type_id BIGINT,
  event_title TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  attendee_name TEXT,
  attendee_email TEXT,
  status TEXT NOT NULL DEFAULT 'booked'
    CHECK (status IN ('booked', 'rescheduled', 'cancelled')),
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, cal_uid)
);

DROP TRIGGER IF EXISTS set_cal_bookings_updated_at ON cal_bookings;
CREATE TRIGGER set_cal_bookings_updated_at BEFORE UPDATE ON cal_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_cal_bookings_business_start
  ON cal_bookings(business_id, start_time DESC);

ALTER TABLE cal_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their business bookings"
  ON cal_bookings FOR SELECT
  USING (business_id = get_user_business_id() OR is_admin_view_all());

CREATE POLICY "Users can create their business bookings"
  ON cal_bookings FOR INSERT
  WITH CHECK (business_id = get_user_business_id() OR is_admin_view_all());

CREATE POLICY "Users can update their business bookings"
  ON cal_bookings FOR UPDATE
  USING (business_id = get_user_business_id() OR is_admin_view_all())
  WITH CHECK (business_id = get_user_business_id() OR is_admin_view_all());

CREATE POLICY "Users can delete their business bookings"
  ON cal_bookings FOR DELETE
  USING (business_id = get_user_business_id() OR is_admin_view_all());

-- The webhook writes through the service-role client (which bypasses
-- RLS), so this is purely defensive — but it MUST be scoped to the
-- service_role role. An unscoped `USING (true)` policy applies to
-- PUBLIC and would leak every tenant's bookings (see migration 048).
DROP POLICY IF EXISTS "Service role full access on cal_bookings" ON cal_bookings;
CREATE POLICY "Service role full access on cal_bookings" ON cal_bookings
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Global Cal.com defaults (self-hosted fallback keys).
INSERT INTO system_settings (id, value) VALUES
('calcom_global', '{"enabled": true, "default_account": {}}'::jsonb)
ON CONFLICT (id) DO NOTHING;
-- 066_restrict_activity_service_role_policies.sql
--
-- Same root cause as 048_restrict_service_role_policies.sql, but for the three
-- tables introduced by 062_activity_consent.sql. Those "Service role full
-- access" policies were declared WITHOUT a `TO service_role` clause. In
-- PostgreSQL a policy with an empty role list applies to PUBLIC (every role),
-- so `USING (true)` let ANY authenticated (or anonymous) client read every row
-- on:
--   * activity_events  (the reported leak — other tenants' activity feed)
--   * auth_sessions    (IP / city / geo of every user)
--   * consent_records  (every acceptance record)
--
-- service_role already has BYPASSRLS, so these policies are purely defensive
-- for that role; restricting them to service_role costs nothing and removes
-- the PUBLIC hole. The tenant-scoped and superadmin policies are unchanged.
-- Shape kept semicolon-simple for scripts/run-migrations.mjs.

-- activity_events
DROP POLICY IF EXISTS "Service role full access on activity_events" ON activity_events;
CREATE POLICY "Service role full access on activity_events" ON activity_events
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- auth_sessions
DROP POLICY IF EXISTS "Service role full access on auth_sessions" ON auth_sessions;
CREATE POLICY "Service role full access on auth_sessions" ON auth_sessions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- consent_records
DROP POLICY IF EXISTS "Service role full access on consent_records" ON consent_records;
CREATE POLICY "Service role full access on consent_records" ON consent_records
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

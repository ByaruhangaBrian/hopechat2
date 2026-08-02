-- 048_restrict_service_role_policies.sql
--
-- Root cause of the cross-tenant SMS/broadcast leak: the "Service role full
-- access" policies created in migrations 033/042/044 were declared WITHOUT a
-- `TO service_role` clause. In PostgreSQL a policy with an empty role list
-- applies to PUBLIC (all roles), so `USING (true)` let ANY authenticated user
-- read (and write) every row on:
--   * sms_broadcasts          (the reported leak — other tenants' SMS history)
--   * sms_recipients
--   * credit_usage_logs
--   * ai_usage_logs
--   * admin_alerts
--   * admin_impersonation_logs
--   * business_expenses
-- and insert unrestricted rows on messages / http_logs.
--
-- The service_role role already has BYPASSRLS, so these policies are purely
-- defensive for that role; restricting them to service_role costs nothing and
-- removes the PUBLIC hole. The tenant-scoped "Business scoped ..." and
-- "Super admin full access ..." policies (using get_user_business_id() /
-- is_admin_view_all()) are unchanged.

-- sms_broadcasts
DROP POLICY IF EXISTS "Service role full access on sms_broadcasts" ON sms_broadcasts;
CREATE POLICY "Service role full access on sms_broadcasts" ON sms_broadcasts
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- sms_recipients
DROP POLICY IF EXISTS "Service role full access on sms_recipients" ON sms_recipients;
CREATE POLICY "Service role full access on sms_recipients" ON sms_recipients
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- credit_usage_logs
DROP POLICY IF EXISTS "Service role full access on credit_usage_logs" ON credit_usage_logs;
CREATE POLICY "Service role full access on credit_usage_logs" ON credit_usage_logs
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ai_usage_logs
DROP POLICY IF EXISTS "Service role full access on ai_usage_logs" ON ai_usage_logs;
CREATE POLICY "Service role full access on ai_usage_logs" ON ai_usage_logs
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- admin_alerts
DROP POLICY IF EXISTS "Service role full access on admin_alerts" ON admin_alerts;
CREATE POLICY "Service role full access on admin_alerts" ON admin_alerts
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- admin_impersonation_logs
DROP POLICY IF EXISTS "Service role full access on impersonation_logs" ON admin_impersonation_logs;
CREATE POLICY "Service role full access on impersonation_logs" ON admin_impersonation_logs
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- business_expenses
DROP POLICY IF EXISTS "Service role full access on business_expenses" ON business_expenses;
CREATE POLICY "Service role full access on business_expenses" ON business_expenses
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- messages (INSERT only)
DROP POLICY IF EXISTS "Service role can insert messages" ON messages;
CREATE POLICY "Service role can insert messages" ON messages
  FOR INSERT TO service_role
  WITH CHECK (true);

-- http_logs (INSERT only)
DROP POLICY IF EXISTS "Service role can insert http logs" ON http_logs;
CREATE POLICY "Service role can insert http logs" ON http_logs
  FOR INSERT TO service_role
  WITH CHECK (true);

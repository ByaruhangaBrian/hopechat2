-- 047_tenant_isolation_and_business_delete.sql
--
-- 1. Restore impersonation in get_user_business_id().
--    The live function (rewritten via the SQL editor as a JWT-first fast
--    path) DROPPED the x-impersonated-business-id header check that
--    migrations 019/025 shipped. Without it, a superadmin impersonating a
--    tenant cannot scope reads to the tenant's business, so tenant data
--    was only reachable through the leaky is_superadmin() OR-legs.
-- 2. Add Businesses_Delete so the admin UI delete actually removes the
--    tenant. Children already CASCADE via FKs; auth.users cleanup is handled
--    by the migration-023 trigger. The missing policy made deleteBusiness()
--    silently delete 0 rows while showing a success toast.
-- 3. Swap the remaining tenant-scoped policies from is_superadmin() to
--    is_admin_view_all() so a superadmin browsing the dashboard (no
--    x-admin-view-all header) can no longer read every tenant's rows.
--    This closes the cross-tenant SMS history leak. is_admin_view_all()
--    stays true on /admin pages (header injected by src/lib/supabase/client.ts).

-- ------------------------------------------------------------------
-- 1. get_user_business_id(): honor x-impersonated-business-id first,
--    then JWT metadata fast-path, then auth.users, then profiles.
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_business_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'auth', 'public'
AS $$
DECLARE
  v_business_id UUID;
  v_headers JSON;
  v_impersonated TEXT;
BEGIN
  -- 0. Impersonation override (superadmins only). The browser client sets
  --    x-impersonated-business-id when the impersonate cookie is present.
  IF is_superadmin() THEN
    BEGIN
      v_headers := current_setting('request.headers', true)::JSON;
      v_impersonated := v_headers ->> 'x-impersonated-business-id';
    EXCEPTION WHEN OTHERS THEN
      v_impersonated := NULL;
    END;
    IF v_impersonated IS NOT NULL AND v_impersonated <> '' THEN
      RETURN v_impersonated::UUID;
    END IF;
  END IF;

  -- 1. JWT metadata (kept in sync by handle_new_user).
  v_business_id := (auth.jwt() -> 'app_metadata' ->> 'business_id')::UUID;
  IF v_business_id IS NOT NULL THEN
    RETURN v_business_id;
  END IF;

  v_business_id := (auth.jwt() -> 'user_metadata' ->> 'business_id')::UUID;
  IF v_business_id IS NOT NULL THEN
    RETURN v_business_id;
  END IF;

  -- 2. Fallback to auth.users metadata.
  SELECT (raw_app_meta_data->>'business_id')::UUID
  INTO v_business_id
  FROM auth.users
  WHERE id = auth.uid();

  IF v_business_id IS NOT NULL THEN
    RETURN v_business_id;
  END IF;

  -- 3. Absolute last resort: query profiles (SECURITY DEFINER bypasses RLS).
  SELECT business_id INTO v_business_id FROM public.profiles WHERE user_id = auth.uid();

  RETURN v_business_id;
END;
$$;

-- ------------------------------------------------------------------
-- 2. Businesses_Delete policy
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Businesses_Delete" ON businesses;
CREATE POLICY "Businesses_Delete" ON businesses
  FOR DELETE TO authenticated
  USING (is_superadmin());

-- ------------------------------------------------------------------
-- 3. Tenant policy swap: is_superadmin() -> is_admin_view_all()
-- ------------------------------------------------------------------

-- sms_broadcasts
DROP POLICY IF EXISTS "Business scoped sms_broadcasts" ON sms_broadcasts;
CREATE POLICY "Business scoped sms_broadcasts" ON sms_broadcasts
  FOR ALL
  USING (business_id = get_user_business_id() OR is_admin_view_all())
  WITH CHECK (business_id = get_user_business_id() OR is_admin_view_all());

DROP POLICY IF EXISTS "Super admin full access on sms_broadcasts" ON sms_broadcasts;
CREATE POLICY "Super admin full access on sms_broadcasts" ON sms_broadcasts
  FOR ALL
  USING (is_admin_view_all())
  WITH CHECK (is_admin_view_all());

-- sms_recipients
DROP POLICY IF EXISTS "Business scoped sms_recipients" ON sms_recipients;
CREATE POLICY "Business scoped sms_recipients" ON sms_recipients
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sms_broadcasts
      WHERE sms_broadcasts.id = sms_recipients.sms_broadcast_id
        AND (sms_broadcasts.business_id = get_user_business_id() OR is_admin_view_all())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sms_broadcasts
      WHERE sms_broadcasts.id = sms_recipients.sms_broadcast_id
        AND (sms_broadcasts.business_id = get_user_business_id() OR is_admin_view_all())
    )
  );

DROP POLICY IF EXISTS "Super admin full access on sms_recipients" ON sms_recipients;
CREATE POLICY "Super admin full access on sms_recipients" ON sms_recipients
  FOR ALL
  USING (is_admin_view_all())
  WITH CHECK (is_admin_view_all());

-- business_integrations
DROP POLICY IF EXISTS "Users can manage own business integrations" ON business_integrations;
CREATE POLICY "Users can manage own business integrations" ON business_integrations
  FOR ALL
  USING (business_id = get_user_business_id() OR is_admin_view_all())
  WITH CHECK (business_id = get_user_business_id() OR is_admin_view_all());

DROP POLICY IF EXISTS "Users can view own business integrations" ON business_integrations;
CREATE POLICY "Users can view own business integrations" ON business_integrations
  FOR SELECT
  USING (business_id = get_user_business_id() OR is_admin_view_all());

-- credit_usage_logs
DROP POLICY IF EXISTS "Business scoped credit_usage_logs" ON credit_usage_logs;
CREATE POLICY "Business scoped credit_usage_logs" ON credit_usage_logs
  FOR SELECT
  USING (business_id = get_user_business_id() OR is_admin_view_all());

DROP POLICY IF EXISTS "Super admin full access on credit_usage_logs" ON credit_usage_logs;
CREATE POLICY "Super admin full access on credit_usage_logs" ON credit_usage_logs
  FOR ALL
  USING (is_admin_view_all())
  WITH CHECK (is_admin_view_all());

-- invitations
DROP POLICY IF EXISTS "Business members can view invitations" ON invitations;
CREATE POLICY "Business members can view invitations" ON invitations
  FOR ALL
  USING (business_id = get_user_business_id() OR is_admin_view_all())
  WITH CHECK (business_id = get_user_business_id() OR is_admin_view_all());

-- payment_transactions
DROP POLICY IF EXISTS "Superadmins can manage all payment_transactions" ON payment_transactions;
CREATE POLICY "Superadmins can manage all payment_transactions" ON payment_transactions
  FOR ALL
  USING (is_admin_view_all())
  WITH CHECK (is_admin_view_all());

-- subscriptions
DROP POLICY IF EXISTS "Business scoped subscriptions" ON subscriptions;
CREATE POLICY "Business scoped subscriptions" ON subscriptions
  FOR SELECT
  USING (business_id = get_user_business_id() OR is_admin_view_all());

DROP POLICY IF EXISTS "Superadmins can manage subscriptions" ON subscriptions;
CREATE POLICY "Superadmins can manage subscriptions" ON subscriptions
  FOR ALL
  USING (is_admin_view_all())
  WITH CHECK (is_admin_view_all());

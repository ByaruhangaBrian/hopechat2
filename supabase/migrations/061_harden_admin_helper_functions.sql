-- 061_harden_admin_helper_functions.sql
--
-- Security hardening: anonymous clients could read all tenant data.
--
-- Root cause: is_superadmin() returns NULL when the caller has no profile row
-- (i.e. anonymous / pre-signup requests). In PL/pgSQL an `IF NOT NULL`
-- condition is treated as *false*, so functions shaped like
--
--     IF NOT is_superadmin() THEN RETURN FALSE; END IF;
--
-- did NOT return FALSE for anonymous callers — they fell through and could
-- return TRUE (or an unbounded business_id), letting RLS policies such as
-- `business_id = get_user_business_id() OR is_superadmin_not_impersonating()`
-- grant anonymous full database read access.
--
-- Fix: coerce the NULL to false at every gate. Also drop any residual
-- 019-era "Business scoped <table>" policies that reference the
-- is_superadmin_not_impersonating() bypass (the final, intended policy set is
-- the 025-era "Strict business scoped <table>" + is_admin_view_all()).

-- 1. Harden is_superadmin_not_impersonating()
CREATE OR REPLACE FUNCTION is_superadmin_not_impersonating()
RETURNS BOOLEAN AS $$
DECLARE
  headers JSON;
  impersonated_id TEXT;
BEGIN
  -- Check if user is superadmin at all
  IF NOT COALESCE(is_superadmin(), false) THEN
    RETURN FALSE;
  END IF;

  -- Try to get impersonated ID from headers (passed by our Supabase client)
  BEGIN
    headers := current_setting('request.headers', true)::JSON;
    impersonated_id := headers ->> 'x-impersonated-business-id';
  EXCEPTION WHEN OTHERS THEN
    impersonated_id := NULL;
  END;

  -- Also check session variable (fallback for internal DB calls if we use them)
  IF impersonated_id IS NULL OR impersonated_id = '' THEN
    impersonated_id := current_setting('app.impersonated_business_id', true);
  END IF;

  RETURN impersonated_id IS NULL OR impersonated_id = '';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Harden is_admin_view_all()
CREATE OR REPLACE FUNCTION is_admin_view_all()
RETURNS BOOLEAN AS $$
DECLARE
  headers JSON;
  view_all TEXT;
BEGIN
  -- Check if user is superadmin at all
  IF NOT COALESCE(is_superadmin(), false) THEN
    RETURN FALSE;
  END IF;

  -- Check for explicit admin view-all header
  BEGIN
    headers := current_setting('request.headers', true)::JSON;
    view_all := headers ->> 'x-admin-view-all';
  EXCEPTION WHEN OTHERS THEN
    view_all := NULL;
  END;

  RETURN view_all = 'true';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3. Harden get_user_business_id()
-- Preserves migration-047's JWT-metadata fast path (read-heavy RLS helper),
-- but adds the COALESCE guard so anonymous/no-profile callers can never take
-- the superadmin impersonation branch.
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
  IF COALESCE(is_superadmin(), false) THEN
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

-- 4. Drop residual leaky "Business scoped <table>" policies that bypass
--    tenancy for anonymous clients. Safe to run anywhere: idempotent, and
--    removes only policies that must not exist in the final schema.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename AS t, policyname AS p
    FROM pg_policies
    WHERE schemaname = 'public'
      AND qual IS NOT NULL
      AND qual LIKE '%is_superadmin_not_impersonating%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.p, r.t);
    RAISE NOTICE 'dropped leaky policy % on %', r.p, r.t;
  END LOOP;
END $$;
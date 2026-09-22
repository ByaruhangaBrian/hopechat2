-- 059_harden_superadmin_escalation.sql
--
-- CRITICAL privilege-escalation fix.
--
-- handle_new_user() previously promoted a new account to superadmin when
-- `raw_user_meta_data->>'is_superadmin'` (or raw_app_meta_data) was true.
-- raw_user_meta_data is CLIENT-CONTROLLED: a normal signup can set
-- `data: { is_superadmin: true }` and arrive fully privileged. Because
-- every downstream gate (RLS is_superadmin(), is_admin_view_all(),
-- get_user_business_id(), the /admin proxy guard) funnels through
-- profiles.is_superadmin / app_metadata.is_superadmin, this was a full
-- account-takeover-of-the-platform bug.
--
-- Fix:
--   1. Superadmin status is now derived ONLY from an explicit email
--      allowlist inside the trigger. No claim from user/app metadata is
--      ever trusted.
--   2. One-time cleanup: revoke superadmin from any existing profile
--      whose email is not allowlisted, and sync auth.users app_metadata
--      so issued JWTs stop carrying the false claim.

-- ------------------------------------------------------------------
-- 1. Superadmin from allowlist only.
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_business_id UUID;
  business_name TEXT;
  is_admin_email BOOLEAN;
  metadata_business_id TEXT;
  existing_biz_count INTEGER;
  current_seats INTEGER;
  max_seats INTEGER;
  tier_id_val TEXT;
  trial_config JSONB;
  trial_days INTEGER;
  trial_credits INTEGER;
  trial_features JSONB;
  tier_credits INTEGER;
  biz_status TEXT;
  biz_credits INTEGER;
  biz_features JSONB;
  v_app_meta JSONB;
BEGIN
  -- Superadmin is granted ONLY to an explicitly allowlisted account.
  -- Never trust user_metadata / app_metadata here: both can be seeded
  -- client-side and would turn "invite anyone" into "anyone is admin".
  is_admin_email := (
    lower(btrim(NEW.email)) = 'hopetechsolutionsltd@gmail.com'
  );

  -- Global trial settings (managed via Admin Settings -> Trial).
  trial_config := COALESCE((
    SELECT value FROM public.system_settings WHERE id = 'trial_settings'
  ), '{}'::jsonb);
  trial_days := COALESCE((trial_config->>'trial_days')::integer, 14);
  trial_credits := COALESCE((trial_config->>'trial_credits')::integer, 500);
  trial_features := COALESCE(trial_config->'trial_features', '{}'::jsonb);

  -- Provided business id (admin onboard / invitation): link and enforce seats.
  metadata_business_id := NEW.raw_user_meta_data->>'business_id';
  IF metadata_business_id IS NULL OR metadata_business_id = '' THEN
    metadata_business_id := NEW.raw_app_meta_data->>'business_id';
  END IF;

  IF metadata_business_id IS NOT NULL AND metadata_business_id <> '' THEN
    SELECT count(*) INTO existing_biz_count
    FROM public.businesses WHERE id = metadata_business_id::UUID;

    IF existing_biz_count > 0 THEN
      new_business_id := metadata_business_id::UUID;

      IF NOT is_admin_email THEN
        SELECT count(*) INTO current_seats
        FROM public.profiles WHERE business_id = new_business_id;
        SELECT b.tier_id INTO tier_id_val
        FROM public.businesses b WHERE b.id = new_business_id;
        SELECT t.max_team_seats INTO max_seats
        FROM public.subscription_tiers t WHERE t.id = tier_id_val;
        IF max_seats IS NOT NULL AND current_seats >= max_seats THEN
          RAISE EXCEPTION 'Maximum team seats limit (%) reached for this business tier. Please upgrade your subscription to add more agents.', max_seats;
        END IF;
      END IF;
    ELSE
      metadata_business_id := NULL;
    END IF;
  END IF;

  -- New business with trial provisioning (default bronze).
  IF metadata_business_id IS NULL OR metadata_business_id = '' THEN
    business_name := COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Business');

    IF trial_days > 0 THEN
      biz_status := 'trialing';
      biz_credits := trial_credits;
      biz_features := jsonb_build_object(
        'inbox_enabled', true,
        'contacts_enabled', true,
        'ai_enabled', true,
        'automations_enabled', true,
        'pipelines_enabled', true,
        'broadcasts_enabled', false,
        'flows_enabled', false,
        'multimodal_enabled', false
      ) || trial_features;
    ELSE
      biz_status := 'active';
      SELECT COALESCE(base_credits_monthly, 1500) INTO tier_credits
      FROM public.subscription_tiers WHERE id = 'bronze';
      biz_credits := COALESCE(tier_credits, 1500);
      biz_features := jsonb_build_object(
        'ai_enabled', true,
        'inbox_enabled', true,
        'contacts_enabled', true,
        'broadcasts_enabled', false,
        'flows_enabled', false,
        'multimodal_enabled', false,
        'automations_enabled', true,
        'pipelines_enabled', true
      );
    END IF;

    INSERT INTO public.businesses (name, status, plan_tier, tier_id, credits_remaining, features)
    VALUES (business_name, biz_status, 'basic', 'bronze', biz_credits, biz_features)
    RETURNING id INTO new_business_id;
  END IF;

  INSERT INTO public.profiles (user_id, full_name, email, business_id, role, is_superadmin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    new_business_id,
    'owner',
    is_admin_email
  )
  ON CONFLICT (user_id) DO UPDATE SET
    business_id = EXCLUDED.business_id,
    is_superadmin = EXCLUDED.is_superadmin,
    full_name = CASE WHEN public.profiles.full_name = '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END;

  -- Keep auth.users app_metadata in sync (read by get_user_business_id()).
  v_app_meta := COALESCE(NEW.raw_app_meta_data, '{}'::jsonb);
  v_app_meta := jsonb_set(v_app_meta, '{business_id}', to_jsonb(new_business_id::text));
  v_app_meta := jsonb_set(v_app_meta, '{is_superadmin}', is_admin_email::text::jsonb);
  UPDATE auth.users SET raw_app_meta_data = v_app_meta WHERE id = NEW.id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE; -- surface signup failures (e.g. seat limit) so auth rolls back cleanly
END;
$$;

-- ------------------------------------------------------------------
-- 2. Cleanup: revoke superadmin from every non-allowlisted account.
--    (Includes accounts that escalated before this migration and any
--    future duplicates made via the admin API without app_metadata.)
-- ------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  v_meta JSONB;
BEGIN
  FOR r IN
    SELECT user_id, email, app_meta
    FROM (
      SELECT p.user_id, p.email, u.raw_app_meta_data AS app_meta
      FROM public.profiles p
      LEFT JOIN auth.users u ON u.id = p.user_id
      WHERE p.is_superadmin = true
    ) x
    WHERE lower(btrim(email)) IS DISTINCT FROM 'hopetechsolutionsltd@gmail.com'
  LOOP
    UPDATE public.profiles SET is_superadmin = false WHERE user_id = r.user_id;

    v_meta := COALESCE(r.app_meta, '{}'::jsonb);
    v_meta := jsonb_set(v_meta, '{is_superadmin}', 'false'::jsonb);
    UPDATE auth.users SET raw_app_meta_data = v_meta WHERE id = r.user_id;

    RAISE NOTICE 'Revoked superadmin from % (%)', r.email, r.user_id;
  END LOOP;
END $$;

-- Ensure the allowlisted account is (still) superadmin across both layers.
UPDATE public.profiles
SET is_superadmin = true
WHERE lower(btrim(email)) = 'hopetechsolutionsltd@gmail.com';

UPDATE auth.users u
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{is_superadmin}',
  'true'::jsonb
)
WHERE lower(btrim(u.email)) = 'hopetechsolutionsltd@gmail.com';
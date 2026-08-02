-- 046_provision_owner_trial_isolation.sql
-- New-signup provisioning + tenant isolation hardening.
--
-- 1. handle_new_user() now provisions a full business (with global trial
--    tier from system_settings 'trial_settings'), an owner profile, and
--    keeps auth.users app_metadata in sync so get_user_business_id()
--    resolves for the fresh session. This replaces the bare profile-only
--    version live in production, which was stranding new signups with
--    role 'user' and no business (no trial, and settings locked).
-- 2. Backfills existing profiles that have no business_id (non-superadmin)
--    into a trial business owned by them.
-- 3. Closes the authenticated-wide read on businesses (Businesses_Select
--    was USING(true), letting any tenant list every business).

-- ------------------------------------------------------------------
-- 1. handle_new_user(): full provisioning with global trial tier
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
  is_admin_email := (
    NEW.email = 'hopetechsolutionsltd@gmail.com'
    OR (NEW.raw_user_meta_data->>'is_superadmin')::boolean = true
    OR (NEW.raw_app_meta_data->>'is_superadmin')::boolean = true
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
-- 2. Backfill existing stranded profiles (no business, not superadmin)
-- ------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  trial_config JSONB;
  trial_days INTEGER;
  trial_credits INTEGER;
  trial_features JSONB;
  tier_credits INTEGER;
  biz_status TEXT;
  biz_credits INTEGER;
  biz_features JSONB;
  new_biz_id UUID;
  new_app_meta JSONB;
BEGIN
  trial_config := COALESCE((
    SELECT value FROM public.system_settings WHERE id = 'trial_settings'
  ), '{}'::jsonb);
  trial_days := COALESCE((trial_config->>'trial_days')::integer, 14);
  trial_credits := COALESCE((trial_config->>'trial_credits')::integer, 500);
  trial_features := COALESCE(trial_config->'trial_features', '{}'::jsonb);
  SELECT COALESCE(base_credits_monthly, 1500) INTO tier_credits
  FROM public.subscription_tiers WHERE id = 'bronze';
  tier_credits := COALESCE(tier_credits, 1500);

  FOR r IN
    SELECT p.user_id, p.full_name, p.email, u.raw_user_meta_data->>'business_name' AS biz_name
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.user_id
    WHERE p.business_id IS NULL AND p.is_superadmin = false
  LOOP
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
      biz_credits := tier_credits;
      biz_features := '{"ai_enabled": true, "inbox_enabled": true, "contacts_enabled": true, "broadcasts_enabled": false, "flows_enabled": false, "multimodal_enabled": false, "automations_enabled": true, "pipelines_enabled": true}'::jsonb;
    END IF;

    INSERT INTO public.businesses (name, status, plan_tier, tier_id, credits_remaining, features)
    VALUES (COALESCE(NULLIF(r.biz_name, ''), 'My Business'), biz_status, 'basic', 'bronze', biz_credits, biz_features)
    RETURNING id INTO new_biz_id;

    UPDATE public.profiles
    SET business_id = new_biz_id, role = 'owner'
    WHERE user_id = r.user_id;

    IF r.user_id IS NOT NULL THEN
      new_app_meta := COALESCE((SELECT raw_app_meta_data FROM auth.users WHERE id = r.user_id), '{}'::jsonb);
      new_app_meta := jsonb_set(new_app_meta, '{business_id}', to_jsonb(new_biz_id::text));
      UPDATE auth.users SET raw_app_meta_data = new_app_meta WHERE id = r.user_id;
    END IF;

    RAISE NOTICE 'Backfilled user % into business %', r.user_id, new_biz_id;
  END LOOP;
END $$;

-- ------------------------------------------------------------------
-- 3. Close the authenticated-wide businesses read
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Businesses_Select" ON businesses;
CREATE POLICY "Businesses_Select" ON businesses
  FOR SELECT TO authenticated
  USING (id = get_user_business_id() OR is_superadmin());

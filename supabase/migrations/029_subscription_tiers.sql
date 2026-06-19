-- 1. Create subscription_tiers Table
CREATE TABLE IF NOT EXISTS subscription_tiers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_ugx NUMERIC NOT NULL,
  base_credits_monthly INT NOT NULL,
  max_team_seats INT NOT NULL,
  allow_broadcasts BOOLEAN DEFAULT false,
  allow_flows BOOLEAN DEFAULT false,
  allow_multimodal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on subscription_tiers
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;

-- Allow select for authenticated users, full management for superadmins
CREATE POLICY "Allow authenticated users to read tiers" ON subscription_tiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow superadmins full access to tiers" ON subscription_tiers FOR ALL TO authenticated USING (is_superadmin()) WITH CHECK (is_superadmin());

-- 2. Seed Subscription Tiers
INSERT INTO subscription_tiers (id, name, price_ugx, base_credits_monthly, max_team_seats, allow_broadcasts, allow_flows, allow_multimodal)
VALUES 
  ('bronze', 'Bronze Plan', 65000, 1500, 1, false, false, false),
  ('silver', 'Silver Plan', 180000, 5000, 3, true, true, false),
  ('gold', 'Gold Plan', 450000, 9999999, 10, true, true, true)
ON CONFLICT (id) DO NOTHING;

-- 3. Add tier_id Column to Businesses
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS tier_id TEXT REFERENCES subscription_tiers(id) DEFAULT 'bronze';

-- Update existing businesses to bronze tier
UPDATE businesses SET tier_id = 'bronze' WHERE tier_id IS NULL;

-- 4. Update handle_new_user() trigger to enforce max_team_seats
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
BEGIN
  -- 1. Determine if user should be a superadmin
  is_admin_email := (
    NEW.email = 'hopetechsolutionsltd@gmail.com' 
    OR (NEW.raw_user_meta_data->>'is_superadmin')::boolean = true
    OR (NEW.raw_app_meta_data->>'is_superadmin')::boolean = true
  );

  -- 2. Extract Business ID from metadata
  metadata_business_id := NEW.raw_user_meta_data->>'business_id';
  
  -- If not in user_metadata, check app_metadata (sometimes set by admin API)
  IF metadata_business_id IS NULL OR metadata_business_id = '' THEN
    metadata_business_id := NEW.raw_app_meta_data->>'business_id';
  END IF;

  -- 3. Verify Business ID exists if provided
  IF metadata_business_id IS NOT NULL AND metadata_business_id <> '' THEN
    SELECT count(*) INTO existing_biz_count FROM public.businesses WHERE id = metadata_business_id::UUID;
    
    IF existing_biz_count > 0 THEN
      new_business_id := metadata_business_id::UUID;
      
      -- Enforce max_team_seats limit (superadmins bypass this)
      IF NOT is_admin_email THEN
        DECLARE
          current_seats INTEGER;
          max_seats INTEGER;
          tier_id_val TEXT;
        BEGIN
          -- Count existing profiles for this business
          SELECT count(*) INTO current_seats FROM public.profiles WHERE business_id = new_business_id;
          
          -- Get the business's tier and its max_team_seats limit
          SELECT b.tier_id INTO tier_id_val FROM public.businesses b WHERE b.id = new_business_id;
          SELECT t.max_team_seats INTO max_seats FROM public.subscription_tiers t WHERE t.id = tier_id_val;
          
          -- If seats limit exceeded, block creation by raising an exception
          IF max_seats IS NOT NULL AND current_seats >= max_seats THEN
            RAISE EXCEPTION 'Maximum team seats limit (%) reached for this business tier. Please upgrade your subscription to add more agents.', max_seats;
          END IF;
        END;
      END IF;
      
    ELSE
      -- Provided ID doesn't exist, fallback to creation
      metadata_business_id := NULL;
    END IF;
  END IF;

  -- 4. Create new business if no valid ID was provided
  IF metadata_business_id IS NULL OR metadata_business_id = '' THEN
    business_name := COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Business');
    
    INSERT INTO public.businesses (name, tier_id)
    VALUES (business_name, 'bronze')
    RETURNING id INTO new_business_id;
  END IF;

  -- 5. Create Profile
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
    full_name = CASE WHEN profiles.full_name = '' THEN EXCLUDED.full_name ELSE profiles.full_name END;

  -- 6. Sync superadmin status to auth.users app_metadata for middleware efficiency
  IF is_admin_email THEN
    UPDATE auth.users 
    SET raw_app_meta_data = jsonb_set(
      COALESCE(raw_app_meta_data, '{}'::jsonb), 
      '{is_superadmin}', 
      'true'::jsonb
    )
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE; -- Re-raise exception to block signup transaction if check failed
END;
$$;

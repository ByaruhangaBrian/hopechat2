-- Fix onboarding duplication by hardening the handle_new_user trigger
-- This ensures that if a business_id is provided in the metadata, it is used instead of creating a new business.

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
    ELSE
      -- Provided ID doesn't exist, fallback to creation
      metadata_business_id := NULL;
    END IF;
  END IF;

  -- 4. Create new business if no valid ID was provided
  IF metadata_business_id IS NULL OR metadata_business_id = '' THEN
    business_name := COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Business');
    
    INSERT INTO public.businesses (name)
    VALUES (business_name)
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

  -- 6. Sync superadmin status to auth.users app_metadata for middleware
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
  RAISE WARNING 'Failed to create business/profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

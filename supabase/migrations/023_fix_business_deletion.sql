-- Fix missing cascade on profiles
-- When a business is deleted, its associated profiles should also be deleted.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_business_id_fkey;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_business_id_fkey 
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;

-- Trigger to delete auth.users
-- Since profiles are deleted via cascade from business, we want to ensure
-- the actual auth users are also removed from the system.
CREATE OR REPLACE FUNCTION public.handle_profile_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Protect the primary platform admin from accidental deletion if their business is wiped
  IF OLD.email = 'hopetechsolutionsltd@gmail.com' THEN
    RETURN OLD;
  END IF;
  
  -- Delete the actual auth user
  DELETE FROM auth.users WHERE id = OLD.user_id;
  RETURN OLD;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't block the profile deletion
  RAISE WARNING 'Failed to delete auth user %: %', OLD.user_id, SQLERRM;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set the owner to postgres so it can manage auth.users
ALTER FUNCTION public.handle_profile_deletion() OWNER TO postgres;

DROP TRIGGER IF EXISTS on_profile_deleted ON public.profiles;
CREATE TRIGGER on_profile_deleted
  AFTER DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_profile_deletion();

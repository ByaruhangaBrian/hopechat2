-- Profiles RLS for impersonation.
-- During impersonation, useAuth fetches the TENANT's profile (WHERE business_id = imp.id),
-- not the superadmin's own. RLS allows this via business_id = get_user_business_id()
-- which returns the impersonated business UUID from the x-impersonated-business-id header.
-- The superadmin does NOT see their own profile while impersonating.

DROP POLICY IF EXISTS "Strict business scoped profiles" ON profiles;
CREATE POLICY "Strict business scoped profiles" ON profiles FOR SELECT 
  USING (
    business_id = get_user_business_id() 
    OR is_admin_view_all()
  );

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT 
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE 
  USING (user_id = auth.uid() OR is_admin_view_all());

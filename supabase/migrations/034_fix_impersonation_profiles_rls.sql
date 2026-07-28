-- Fix profiles RLS so superadmins can see their own profile during impersonation.
-- Migration 025 broke impersonation by requiring business_id match, which blocks
-- the superadmin's own profile row when get_user_business_id() returns the
-- impersonated business UUID instead of the superadmin's own business_id.

-- Update profiles policy: allow superadmin to always see their own row
DROP POLICY IF EXISTS "Strict business scoped profiles" ON profiles;
CREATE POLICY "Strict business scoped profiles" ON profiles FOR SELECT 
  USING (
    business_id = get_user_business_id() 
    OR is_admin_view_all() 
    OR (is_superadmin() AND user_id = auth.uid())
  );

-- Also fix profiles INSERT/UPDATE policies so superadmin can write during impersonation
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT 
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE 
  USING (user_id = auth.uid() OR is_admin_view_all());

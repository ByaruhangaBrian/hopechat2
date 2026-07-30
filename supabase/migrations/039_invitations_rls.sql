-- Enable RLS on invitations table
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Business members can view invitations for their business
DROP POLICY IF EXISTS "Business members can view invitations" ON invitations;
CREATE POLICY "Business members can view invitations" ON invitations
  FOR ALL
  USING (business_id = get_user_business_id() OR is_superadmin());

-- Add impersonation support to get_user_business_id

CREATE OR REPLACE FUNCTION get_user_business_id()
RETURNS UUID AS $$
DECLARE
  impersonated_id TEXT;
BEGIN
  -- 1. Check if superadmin is impersonating via session variable
  -- This allows the UI to 'filter' as if they were that tenant
  IF is_superadmin() THEN
    impersonated_id := current_setting('app.impersonated_business_id', true);
    IF impersonated_id IS NOT NULL AND impersonated_id <> '' THEN
      RETURN impersonated_id::UUID;
    END IF;
  END IF;

  -- 2. Fallback to their own business_id
  RETURN (SELECT business_id FROM profiles WHERE user_id = auth.uid());
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to set impersonation session variable
CREATE OR REPLACE FUNCTION set_impersonation(business_id UUID)
RETURNS VOID AS $$
BEGIN
  IF is_superadmin() THEN
    PERFORM set_config('app.impersonated_business_id', business_id::TEXT, false);
  ELSE
    RAISE EXCEPTION 'Only superadmins can impersonate';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clear impersonation
CREATE OR REPLACE FUNCTION clear_impersonation()
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.impersonated_business_id', '', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add maintenance mode and system announcements to system_settings
INSERT INTO system_settings (id, value) VALUES 
('system_config', '{"maintenance_mode": false, "announcement": ""}'::jsonb)
ON CONFLICT (id) DO NOTHING;


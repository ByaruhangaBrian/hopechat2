-- 1. Harden system_settings policies
-- Currently, any authenticated user can read all system settings.
-- We restrict this so only Super Admins can see sensitive credentials.

DROP POLICY IF EXISTS "Everyone can view system settings" ON system_settings;
CREATE POLICY "Everyone can view system settings" ON system_settings 
  FOR SELECT USING (id IN ('system_config', 'integrations_global', 'whatsapp_global'));

-- Ensure only Super Admins can manage all system settings
DROP POLICY IF EXISTS "Superadmins can manage system settings" ON system_settings;
CREATE POLICY "Superadmins can manage system settings" ON system_settings 
  FOR ALL USING (is_superadmin());

-- 2. Initialize platform_credentials row if it doesn't exist
INSERT INTO system_settings (id, value) VALUES 
('platform_credentials', '{
  "supabase_url": "",
  "supabase_anon_key": "",
  "meta_app_id": "",
  "meta_app_secret": "",
  "gemini_global_key": ""
}'::jsonb)
ON CONFLICT (id) DO NOTHING;

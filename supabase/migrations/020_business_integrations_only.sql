-- ============================================================
-- Fix: Create business_integrations table (migration 020)
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS business_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, type)
);

ALTER TABLE business_integrations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_business_id') THEN
        CREATE FUNCTION get_user_business_id() RETURNS UUID AS 'SELECT business_id FROM profiles WHERE user_id = auth.uid();' LANGUAGE sql STABLE SECURITY DEFINER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_superadmin') THEN
        CREATE FUNCTION is_superadmin() RETURNS BOOLEAN AS 'SELECT is_superadmin FROM profiles WHERE user_id = auth.uid();' LANGUAGE sql STABLE SECURITY DEFINER;
    END IF;
END $$;

DROP POLICY IF EXISTS "Users can view own business integrations" ON business_integrations;
CREATE POLICY "Users can view own business integrations" 
  ON business_integrations FOR SELECT 
  USING (business_id = get_user_business_id() OR is_superadmin());

DROP POLICY IF EXISTS "Users can manage own business integrations" ON business_integrations;
CREATE POLICY "Users can manage own business integrations" 
  ON business_integrations FOR ALL 
  USING (business_id = get_user_business_id() OR is_superadmin())
  WITH CHECK (business_id = get_user_business_id() OR is_superadmin());

INSERT INTO system_settings (id, value) VALUES 
('integrations_global', '{"google_sheets": {"enabled": true, "default_service_account": {}}}'::jsonb)
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_business_integrations_business_id ON business_integrations(business_id);
CREATE INDEX IF NOT EXISTS idx_business_integrations_type ON business_integrations(type);

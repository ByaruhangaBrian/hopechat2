-- ============================================================
-- 057_business_session_settings.sql — per-business runtime settings
--
-- Stores cross-cutting business configuration that the WhatsApp
-- runtime reads (e.g. how many hours of inactivity before a test
-- session is discarded). Read by src/lib/tests/settings.ts; edited
-- from Settings -> Tests in the dashboard.
-- ============================================================

CREATE TABLE IF NOT EXISTS business_settings (
  business_id UUID PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_business_settings_updated_at ON business_settings;
CREATE TRIGGER set_business_settings_updated_at BEFORE UPDATE ON business_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their business settings"
  ON business_settings FOR SELECT
  USING (business_id = get_user_business_id() OR is_admin_view_all());

CREATE POLICY "Users can create their business settings"
  ON business_settings FOR INSERT
  WITH CHECK (business_id = get_user_business_id() OR is_admin_view_all());

CREATE POLICY "Users can update their business settings"
  ON business_settings FOR UPDATE
  USING (business_id = get_user_business_id() OR is_admin_view_all())
  WITH CHECK (business_id = get_user_business_id() OR is_admin_view_all());

CREATE POLICY "Users can delete their business settings"
  ON business_settings FOR DELETE
  USING (business_id = get_user_business_id() OR is_admin_view_all());
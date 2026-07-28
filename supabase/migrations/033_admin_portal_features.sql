-- Migration 033: Admin portal features
-- Tables for: admin alerts, impersonation logs, AI usage tracking, business expenses

-- 1. Admin Alerts - configurable automated notifications
CREATE TABLE IF NOT EXISTS admin_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'low_credits',
    'whatsapp_disconnected',
    'business_status_changed',
    'tier_changed',
    'payment_failed',
    'high_ai_usage',
    'quota_exceeded',
    'custom'
  )),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_alerts_business ON admin_alerts(business_id);
CREATE INDEX idx_admin_alerts_type ON admin_alerts(alert_type);
CREATE INDEX idx_admin_alerts_unread ON admin_alerts(is_read) WHERE is_read = FALSE;

-- 2. Admin Impersonation Logs
CREATE TABLE IF NOT EXISTS admin_impersonation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  admin_email TEXT NOT NULL,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX idx_impersonation_logs_admin ON admin_impersonation_logs(admin_user_id);
CREATE INDEX idx_impersonation_logs_business ON admin_impersonation_logs(business_id);

-- 3. AI Usage Tracking
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  model TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
  action TEXT NOT NULL CHECK (action IN (
    'chat_response',
    'image_analysis',
    'voice_transcription',
    'document_summary',
    'flow_execution'
  )),
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  latency_ms INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 1,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_usage_business ON ai_usage_logs(business_id);
CREATE INDEX idx_ai_usage_created ON ai_usage_logs(created_at);
CREATE INDEX idx_ai_usage_action ON ai_usage_logs(action);

-- 4. Business Expenses / Ledger
CREATE TABLE IF NOT EXISTS business_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN (
    'server_hosting',
    'whatsapp_api',
    'gemini_api',
    'pesapal_fees',
    'staff',
    'marketing',
    'infrastructure',
    'other'
  )),
  description TEXT NOT NULL,
  amount_ugx DECIMAL(15,2) NOT NULL,
  amount_usd DECIMAL(15,2) DEFAULT 0,
  reference TEXT,
  expense_date DATE DEFAULT CURRENT_DATE,
  created_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expenses_date ON business_expenses(expense_date);
CREATE INDEX idx_expenses_category ON business_expenses(category);

-- 5. Broadcast Monitor - enhanced tracking per business
-- (broadcasts table already exists, this adds a view for admin monitoring)
CREATE OR REPLACE VIEW admin_broadcast_monitor AS
SELECT 
  b.id,
  b.business_id,
  biz.name as business_name,
  b.name as broadcast_name,
  b.template_name,
  b.status,
  b.total_recipients,
  b.sent_count,
  b.delivered_count,
  b.read_count,
  b.replied_count,
  b.failed_count,
  b.created_at,
  CASE 
    WHEN b.total_recipients > 0 THEN 
      ROUND((b.sent_count::numeric / b.total_recipients) * 100, 1)
    ELSE 0 
  END as delivery_rate
FROM broadcasts b
JOIN businesses biz ON b.business_id = biz.id
ORDER BY b.created_at DESC;

-- 6. Admin Alert Settings (stored in system_settings)
-- Key: 'admin_alert_settings'
-- Value: {
--   "low_credits_threshold": 100,
--   "high_ai_usage_threshold": 1000,
--   "quota_exceeded_threshold": 90,
--   "enabled_alerts": ["low_credits", "whatsapp_disconnected", "business_status_changed", "tier_changed"],
--   "webhook_url": null,
--   "email_notifications": false
-- }

-- RLS Policies
ALTER TABLE admin_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_impersonation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_expenses ENABLE ROW LEVEL SECURITY;

-- Super admin only access
CREATE POLICY "Super admin full access on admin_alerts" ON admin_alerts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_superadmin = true)
  );

CREATE POLICY "Super admin full access on impersonation_logs" ON admin_impersonation_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_superadmin = true)
  );

CREATE POLICY "Super admin full access on ai_usage_logs" ON ai_usage_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_superadmin = true)
  );

CREATE POLICY "Super admin full access on business_expenses" ON business_expenses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_superadmin = true)
  );

-- Also allow service role (admin client) full access
CREATE POLICY "Service role full access on admin_alerts" ON admin_alerts
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on impersonation_logs" ON admin_impersonation_logs
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on ai_usage_logs" ON ai_usage_logs
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on business_expenses" ON business_expenses
  FOR ALL USING (true) WITH CHECK (true);

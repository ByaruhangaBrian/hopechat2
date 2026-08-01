-- 042_credit_usage_logs.sql
-- Ledger of every credit consumption across the platform.
-- Written by src/lib/credits (consumeCredits) via the service role.
-- Readable by tenant owners (scoped) and super admins (all).

CREATE TABLE IF NOT EXISTS credit_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('ai_chat', 'interactive_form', 'bulk_broadcast')),
  credits_used INTEGER NOT NULL CHECK (credits_used > 0),
  description TEXT,
  reference_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_usage_business ON credit_usage_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_credit_usage_created ON credit_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_usage_action ON credit_usage_logs(action);

ALTER TABLE credit_usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business scoped credit_usage_logs" ON credit_usage_logs;
DROP POLICY IF EXISTS "Super admin full access on credit_usage_logs" ON credit_usage_logs;
DROP POLICY IF EXISTS "Service role full access on credit_usage_logs" ON credit_usage_logs;

-- Tenants can read their own usage; superadmins can read everything.
CREATE POLICY "Business scoped credit_usage_logs" ON credit_usage_logs
  FOR SELECT
  USING (business_id = get_user_business_id() OR is_superadmin());

CREATE POLICY "Super admin full access on credit_usage_logs" ON credit_usage_logs
  FOR ALL
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

CREATE POLICY "Service role full access on credit_usage_logs" ON credit_usage_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

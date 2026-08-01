-- 044_sms_broadcasts.sql
-- Bulk SMS broadcasts, mirroring the WhatsApp broadcasts flow.
--
-- Sending model:
--   * Businesses compose a plain message (max 160 chars) and pick an
--     audience (all / tags / custom field / CSV) — no templates, no
--     per-recipient personalization.
--   * Recipients are stored in sms_recipients and dispatched in one
--     KintuSMS call (comma-separated numbers).
--   * Credits are deducted once per broadcast: recipients × the
--     `sms_per_message` cost configured under `credit_costs`, recorded
--     on the `credit_usage_logs` ledger with action `sms`.
--
-- SMS provider credentials live in the `sms_settings` system setting so
-- super admins can swap providers without redeploying.

-- 1. Allow `sms` in the credit usage ledger (drop + recreate CHECK).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'credit_usage_logs'::regclass
      AND conname = 'credit_usage_logs_action_check'
  ) THEN
    ALTER TABLE credit_usage_logs DROP CONSTRAINT credit_usage_logs_action_check;
  END IF;
END $$;

ALTER TABLE credit_usage_logs
  ADD CONSTRAINT credit_usage_logs_action_check
  CHECK (action IN ('ai_chat', 'interactive_form', 'bulk_broadcast', 'sms'));

-- 2. Cost configuration: per-message SMS credit cost.
UPDATE system_settings
SET value = value || '{"sms_per_message": {"credits": 1, "label": "SMS Message"}}'::jsonb,
    updated_at = NOW()
WHERE id = 'credit_costs'
  AND NOT (value ? 'sms_per_message');

-- 3. SMS provider credentials (swappable via Admin Settings → SMS).
--    NOTE: the gateway password is intentionally not seeded here (it is a
--    live secret). Super admins must set it once in Admin Settings → SMS
--    after this migration is applied; sends are refused until then.
INSERT INTO system_settings (id, value, updated_at)
VALUES (
  'sms_settings',
  '{
    "url": "http://www.kintusms.com/api.php",
    "username": "icapital",
    "password": "",
    "sender": "HeloWOrld",
    "enabled": true
  }'::jsonb,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 4. sms_broadcasts
CREATE TABLE IF NOT EXISTS sms_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  audience_filter JSONB,
  status TEXT NOT NULL DEFAULT 'sending' CHECK (status IN ('sending', 'sent', 'failed')),
  total_recipients INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  credits_used INTEGER NOT NULL DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_broadcasts_business ON sms_broadcasts(business_id);
CREATE INDEX IF NOT EXISTS idx_sms_broadcasts_user ON sms_broadcasts(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_broadcasts_created ON sms_broadcasts(created_at);

ALTER TABLE sms_broadcasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business scoped sms_broadcasts" ON sms_broadcasts;
DROP POLICY IF EXISTS "Super admin full access on sms_broadcasts" ON sms_broadcasts;
DROP POLICY IF EXISTS "Service role full access on sms_broadcasts" ON sms_broadcasts;

CREATE POLICY "Business scoped sms_broadcasts" ON sms_broadcasts
  FOR ALL
  USING (business_id = get_user_business_id() OR is_superadmin())
  WITH CHECK (business_id = get_user_business_id() OR is_superadmin());

CREATE POLICY "Super admin full access on sms_broadcasts" ON sms_broadcasts
  FOR ALL
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

CREATE POLICY "Service role full access on sms_broadcasts" ON sms_broadcasts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 5. sms_recipients
CREATE TABLE IF NOT EXISTS sms_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sms_broadcast_id UUID NOT NULL REFERENCES sms_broadcasts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  recipient_phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_recipients_broadcast ON sms_recipients(sms_broadcast_id);
CREATE INDEX IF NOT EXISTS idx_sms_recipients_contact ON sms_recipients(contact_id);

ALTER TABLE sms_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business scoped sms_recipients" ON sms_recipients;
DROP POLICY IF EXISTS "Super admin full access on sms_recipients" ON sms_recipients;
DROP POLICY IF EXISTS "Service role full access on sms_recipients" ON sms_recipients;

CREATE POLICY "Business scoped sms_recipients" ON sms_recipients
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sms_broadcasts
      WHERE sms_broadcasts.id = sms_recipients.sms_broadcast_id
        AND (sms_broadcasts.business_id = get_user_business_id() OR is_superadmin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sms_broadcasts
      WHERE sms_broadcasts.id = sms_recipients.sms_broadcast_id
        AND (sms_broadcasts.business_id = get_user_business_id() OR is_superadmin())
    )
  );

CREATE POLICY "Super admin full access on sms_recipients" ON sms_recipients
  FOR ALL
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

CREATE POLICY "Service role full access on sms_recipients" ON sms_recipients
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6. updated_at trigger for sms_broadcasts
DROP TRIGGER IF EXISTS set_updated_at ON sms_broadcasts;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON sms_broadcasts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

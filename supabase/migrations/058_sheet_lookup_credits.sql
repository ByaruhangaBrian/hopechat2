-- 058_sheet_lookup_credits.sql
-- Google Sheets lookups are billed to the business: every real Google Sheets
-- API call (AI `search_business_data` tool or `lookup_spreadsheet` automation
-- step) costs `spreadsheet_lookup` credits.
--
-- Also fixes a latent gap: the `credit_usage_logs.action` CHECK (last set by
-- 044_sms_broadcasts.sql) never allowed `test_attempt`, so the tests module's
-- ledger rows have been silently rejected.

-- 1. Extend the credit usage ledger CHECK to allow test_attempt + spreadsheet_lookup.
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
  CHECK (action IN ('ai_chat', 'interactive_form', 'bulk_broadcast', 'sms', 'test_attempt', 'spreadsheet_lookup'));

-- 2. Default cost for the new action (merge only — never clobber admin-edited values).
UPDATE system_settings
SET value = value || '{"spreadsheet_lookup": {"credits": 1, "label": "Google Sheets Lookup"}}'::jsonb,
    updated_at = NOW()
WHERE id = 'credit_costs'
  AND NOT (value ? 'spreadsheet_lookup');
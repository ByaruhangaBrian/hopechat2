-- 043_credit_usage_contact.sql
-- Track which contact consumed credits so businesses can see per-contact usage.
-- contact_id is populated by src/lib/credits (consumeCredits) alongside the
-- metadata.contact_id value it already writes, and backfilled below for old rows.

ALTER TABLE credit_usage_logs
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_credit_usage_contact ON credit_usage_logs(contact_id);
CREATE INDEX IF NOT EXISTS idx_credit_usage_biz_contact ON credit_usage_logs(business_id, contact_id);

-- Backfill from the metadata JSON that older ledger rows carried.
UPDATE credit_usage_logs
SET contact_id = (metadata->>'contact_id')::uuid
WHERE contact_id IS NULL
  AND metadata ? 'contact_id'
  AND (metadata->>'contact_id') IS NOT NULL
  AND (metadata->>'contact_id') <> ''
  AND (metadata->>'contact_id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 030_http_logs_business_id.sql — Add business_id column and allow 'system' direction

ALTER TABLE http_logs ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;

ALTER TABLE http_logs DROP CONSTRAINT IF EXISTS http_logs_direction_check;
ALTER TABLE http_logs ADD CONSTRAINT http_logs_direction_check CHECK (direction IN ('incoming', 'outgoing', 'system'));

CREATE INDEX IF NOT EXISTS idx_http_logs_business_id ON http_logs(business_id);

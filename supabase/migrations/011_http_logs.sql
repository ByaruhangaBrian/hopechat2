-- Create http_logs table for monitoring incoming/outgoing webhooks and API calls

CREATE TABLE IF NOT EXISTS http_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  service TEXT NOT NULL,
  endpoint TEXT,
  payload JSONB,
  headers JSONB,
  status_code INTEGER,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_http_logs_user_id ON http_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_http_logs_created_at ON http_logs(created_at);

ALTER TABLE http_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own http logs" ON http_logs;
CREATE POLICY "Users can view own http logs" ON http_logs FOR SELECT USING (auth.uid() = user_id);

-- Service-role insertion: service role bypasses RLS; allow insert checks to pass for inserts
DROP POLICY IF EXISTS "Service role can insert http logs" ON http_logs;
CREATE POLICY "Service role can insert http logs" ON http_logs FOR INSERT WITH CHECK (true);

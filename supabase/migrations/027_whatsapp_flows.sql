-- ============================================================
-- 027_whatsapp_flows.sql — Support for WhatsApp Flows and Interactive Messages
-- ============================================================

-- Add waiting_on_message_id to automation_pending_executions to allow
-- resuming an automation when a specific message is replied to.
ALTER TABLE automation_pending_executions 
ADD COLUMN IF NOT EXISTS waiting_on_message_id TEXT;

-- Add expires_at to automation_pending_executions for interaction timeouts.
ALTER TABLE automation_pending_executions 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Index for fast lookup by message_id when a webhook reply arrives.
CREATE INDEX IF NOT EXISTS idx_automation_pending_message_id 
ON automation_pending_executions(waiting_on_message_id) 
WHERE status = 'pending' AND waiting_on_message_id IS NOT NULL;

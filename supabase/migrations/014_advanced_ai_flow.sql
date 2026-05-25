-- ============================================================
-- ADVANCED AI FLOW ENHANCEMENTS
-- ============================================================

-- 1. ENHANCE CONVERSATIONS TABLE
ALTER TABLE conversations 
  ADD COLUMN IF NOT EXISTS human_takeover BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS escalated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS paused BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. ENHANCE WHATSAPP_AI_JOBS TABLE
ALTER TABLE whatsapp_ai_jobs 
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE;

-- Unique constraint for pending jobs per conversation to enable debouncing
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_ai_jobs_debounce 
  ON whatsapp_ai_jobs (conversation_id) 
  WHERE (status = 'pending');

-- 3. ENHANCE MESSAGES TABLE
ALTER TABLE messages 
  ADD COLUMN IF NOT EXISTS whatsapp_message_id TEXT;

CREATE INDEX IF NOT EXISTS idx_messages_whatsapp_id ON messages(whatsapp_message_id);

-- Ensure human_takeover column exists and has a predictable default
-- This flag will be used to prevent automations from overriding manual AI toggles.

ALTER TABLE conversations 
  ADD COLUMN IF NOT EXISTS human_takeover BOOLEAN DEFAULT false;

-- Sync human_takeover for existing conversations: 
-- If AI is already disabled, assume human intervention for safety.
UPDATE conversations 
SET human_takeover = true 
WHERE ai_enabled = false;

-- Now enforce NOT NULL
ALTER TABLE conversations 
  ALTER COLUMN human_takeover SET NOT NULL;

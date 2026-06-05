-- Ensure human_takeover has a predictable default and is synced
-- This flag will be used to prevent automations from overriding manual AI toggles.

ALTER TABLE conversations 
  ALTER COLUMN human_takeover SET DEFAULT false,
  ALTER COLUMN human_takeover SET NOT NULL;

-- Sync human_takeover for existing conversations: 
-- If AI is already disabled, assume human intervention for safety.
UPDATE conversations 
SET human_takeover = true 
WHERE ai_enabled = false;

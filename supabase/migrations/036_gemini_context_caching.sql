-- Gemini Context Caching toggle + cache references.
-- Defaults to OFF (free-tier safe). Admin toggles ON when on paid billing.

-- Global toggle — superadmin UI reads/writes this row
INSERT INTO system_settings (id, value)
VALUES ('gemini_context_caching', 'false'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Per-business cache metadata on ai_settings
ALTER TABLE ai_settings ADD COLUMN IF NOT EXISTS cache_name TEXT;
ALTER TABLE ai_settings ADD COLUMN IF NOT EXISTS cache_fingerprint TEXT;

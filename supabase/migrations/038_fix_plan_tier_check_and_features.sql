-- Fix CHECK constraint to accept bronze/silver/gold tier values
ALTER TABLE businesses DROP CONSTRAINT IF EXISTS businesses_plan_tier_check;
ALTER TABLE businesses ADD CONSTRAINT businesses_plan_tier_check
  CHECK (plan_tier IN ('basic', 'pro', 'enterprise', 'bronze', 'silver', 'gold'));

-- Also migrate existing businesses: ensure every business has all feature keys
UPDATE businesses SET features = features || '{"inbox_enabled": true, "contacts_enabled": true}'::jsonb
  WHERE NOT (features ? 'inbox_enabled') OR NOT (features ? 'contacts_enabled');

-- Update default features to include all known feature flags
ALTER TABLE businesses ALTER COLUMN features
  SET DEFAULT '{"ai_enabled": true, "broadcasts_enabled": true, "automations_enabled": true, "pipelines_enabled": true, "flows_enabled": false, "multimodal_enabled": false, "inbox_enabled": true, "contacts_enabled": true}'::jsonb;

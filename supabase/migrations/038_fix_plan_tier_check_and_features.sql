-- Fix CHECK constraint to accept bronze/silver/gold tier values
ALTER TABLE businesses DROP CONSTRAINT IF EXISTS businesses_plan_tier_check;
ALTER TABLE businesses ADD CONSTRAINT businesses_plan_tier_check
  CHECK (plan_tier IN ('basic', 'pro', 'enterprise', 'bronze', 'silver', 'gold'));

-- Update default features to include all known feature flags
ALTER TABLE businesses ALTER COLUMN features
  SET DEFAULT '{"ai_enabled": true, "broadcasts_enabled": true, "automations_enabled": true, "pipelines_enabled": true, "flows_enabled": false, "multimodal_enabled": false}'::jsonb;

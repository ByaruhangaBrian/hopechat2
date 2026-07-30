-- Add trial configuration columns to subscription_tiers
ALTER TABLE subscription_tiers ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 0;
ALTER TABLE subscription_tiers ADD COLUMN IF NOT EXISTS trial_credits INTEGER DEFAULT 0;
ALTER TABLE subscription_tiers ADD COLUMN IF NOT EXISTS trial_features JSONB DEFAULT '{}'::jsonb;

-- Seed trial defaults for existing tiers (14-day trial, 500 credits, limited features)
UPDATE subscription_tiers
SET
  trial_days = 14,
  trial_credits = 500,
  trial_features = '{"inbox_enabled": true, "contacts_enabled": true, "ai_enabled": true, "automations_enabled": true, "pipelines_enabled": true, "broadcasts_enabled": false, "flows_enabled": false, "multimodal_enabled": false}'::jsonb
WHERE trial_days = 0 AND id = 'bronze';

UPDATE subscription_tiers
SET
  trial_days = 7,
  trial_credits = 1000,
  trial_features = '{"inbox_enabled": true, "contacts_enabled": true, "ai_enabled": true, "automations_enabled": true, "pipelines_enabled": true, "broadcasts_enabled": true, "flows_enabled": false, "multimodal_enabled": false}'::jsonb
WHERE trial_days = 0 AND id = 'silver';

UPDATE subscription_tiers
SET
  trial_days = 0,
  trial_credits = 0,
  trial_features = '{}'::jsonb
WHERE trial_days = 0 AND id = 'gold';

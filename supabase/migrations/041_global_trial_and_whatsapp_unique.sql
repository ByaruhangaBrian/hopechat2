-- 1. Remove per-tier trial columns (reverses 040)
ALTER TABLE subscription_tiers DROP COLUMN IF EXISTS trial_days;
ALTER TABLE subscription_tiers DROP COLUMN IF EXISTS trial_credits;
ALTER TABLE subscription_tiers DROP COLUMN IF EXISTS trial_features;

-- 2. Global trial settings stored in system_settings
INSERT INTO system_settings (id, value) VALUES (
  'trial_settings',
  '{
    "trial_days": 14,
    "trial_credits": 500,
    "trial_features": {
      "inbox_enabled": true,
      "contacts_enabled": true,
      "ai_enabled": true,
      "automations_enabled": true,
      "pipelines_enabled": true,
      "broadcasts_enabled": false,
      "flows_enabled": false,
      "multimodal_enabled": false
    }
  }'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- 3. Prevent trial abuse: WhatsApp Phone Number ID must be unique across businesses
DELETE FROM whatsapp_config a USING whatsapp_config b
WHERE a.id < b.id AND a.phone_number_id = b.phone_number_id;

ALTER TABLE whatsapp_config ADD CONSTRAINT whatsapp_config_phone_number_id_key UNIQUE (phone_number_id);

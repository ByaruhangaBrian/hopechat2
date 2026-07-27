-- ============================================================
-- Pesapal Gateway Migration
-- ============================================================

-- Seed Pesapal gateway settings
INSERT INTO public.system_settings (id, value) VALUES 
('pesapal_global', '{"consumer_key": "", "consumer_secret": "", "site_url": "live.pesapal.com", "is_enabled": false}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Remove legacy Flutterwave settings seed
DELETE FROM public.system_settings WHERE id = 'flutterwave_global';

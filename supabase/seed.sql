-- ============================================================
-- seed.sql — Staging seed data
--
-- Creates an explorable dashboard dataset for the seeded staging
-- admin (`stagingadmin@hopetech.com`). Idempotent: safe to re-run.
--
-- Auth user creation is NOT part of this file — the Supabase Auth
-- Admin API creates the user (password auth), and the
-- `handle_new_user()` trigger auto-provisions the business + owner
-- profile + free trial. This file only adds the sample rows that
-- make the dashboard render populated.
--
-- Apply via: Management API query endpoint or
--   supabase db query --linked --file supabase/seed.sql
-- ============================================================

DO $$
DECLARE
  v_user_id    UUID;
  v_biz_id     UUID;
  v_pipeline   UUID;
  v_stage_new  UUID;
  v_stage_q    UUID;
  v_stage_prop UUID;
  v_stage_won  UUID;
  v_c1 UUID;
  v_c2 UUID;
  v_c3 UUID;
  v_c4 UUID;
  v_c5 UUID;
  v_c6 UUID;
  v_conv1 UUID;
  v_conv2 UUID;
  v_conv3 UUID;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'stagingadmin@hopetech.com';

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'seeded admin not found; skipping seed';
    RETURN;
  END IF;

  SELECT b.id INTO v_biz_id
  FROM public.businesses b
  JOIN public.profiles p ON p.business_id = b.id
  WHERE p.user_id = v_user_id;

  IF v_biz_id IS NULL THEN
    RAISE NOTICE 'seeded business not found; skipping seed';
    RETURN;
  END IF;

  -- ------------------------------------------------------------
  -- Pipeline
  -- ------------------------------------------------------------
  INSERT INTO public.pipelines (id, user_id, name, business_id)
  VALUES ('20000000-0000-4000-8000-000000000001', v_user_id, 'Sales Pipeline', v_biz_id)
  ON CONFLICT (id) DO NOTHING;
  v_pipeline := '20000000-0000-4000-8000-000000000001';

  INSERT INTO public.pipeline_stages (id, pipeline_id, name, position, color) VALUES
    ('20000000-0000-4000-8000-000000000101', v_pipeline, 'New Lead',    0, '#3b82f6'),
    ('20000000-0000-4000-8000-000000000102', v_pipeline, 'Qualified',   1, '#f59e0b'),
    ('20000000-0000-4000-8000-000000000103', v_pipeline, 'Proposal',    2, '#8b5cf6'),
    ('20000000-0000-4000-8000-000000000104', v_pipeline, 'Closed Won',  3, '#10b981')
  ON CONFLICT (id) DO NOTHING;
  v_stage_new  := '20000000-0000-4000-8000-000000000101';
  v_stage_q    := '20000000-0000-4000-8000-000000000102';
  v_stage_prop := '20000000-0000-4000-8000-000000000103';
  v_stage_won  := '20000000-0000-4000-8000-000000000104';

  -- ------------------------------------------------------------
  -- Contacts (spread across the last 14 days)
  -- ------------------------------------------------------------
  INSERT INTO public.contacts (id, user_id, phone, name, email, company, business_id, created_at, updated_at) VALUES
    ('20000000-0000-4000-8000-000000000201', v_user_id, '+256700100001', 'Alice Auma',         'alice@example.com',    'Auma Logistics',    v_biz_id, now() - interval '9 days',  now() - interval '9 days'),
    ('20000000-0000-4000-8000-000000000202', v_user_id, '+256700100002', 'Bob Byaruhanga',      'bob@example.com',      'Byaruhanga Traders', v_biz_id, now() - interval '6 days',  now() - interval '6 days'),
    ('20000000-0000-4000-8000-000000000203', v_user_id, '+256700100003', 'Carol Kasule',        'carol@example.com',    'Kasule Foods',       v_biz_id, now() - interval '3 days',  now() - interval '3 days'),
    ('20000000-0000-4000-8000-000000000204', v_user_id, '+256700100004', 'David Okello',        'david@example.com',    'Okello AutoShop',    v_biz_id, now() - interval '1 day',   now() - interval '1 day'),
    ('20000000-0000-4000-8000-000000000205', v_user_id, '+256700100005', 'Evelyn Nambi',        'evelyn@example.com',   NULL,                 v_biz_id, now() - interval '12 hours', now() - interval '12 hours'),
    ('20000000-0000-4000-8000-000000000206', v_user_id, '+256700100006', 'Farid Ssebaggala',    'farid@example.com',    'Farid Bakery',       v_biz_id, now() - interval '2 hours', now() - interval '2 hours')
  ON CONFLICT (id) DO NOTHING;
  v_c1 := '20000000-0000-4000-8000-000000000201';
  v_c2 := '20000000-0000-4000-8000-000000000202';
  v_c3 := '20000000-0000-4000-8000-000000000203';
  v_c4 := '20000000-0000-4000-8000-000000000204';
  v_c5 := '20000000-0000-4000-8000-000000000205';
  v_c6 := '20000000-0000-4000-8000-000000000206';

  -- ------------------------------------------------------------
  -- Tags
  -- ------------------------------------------------------------
  INSERT INTO public.tags (id, user_id, name, color, business_id) VALUES
    ('20000000-0000-4000-8000-000000000301', v_user_id, 'VIP',  '#f59e0b', v_biz_id),
    ('20000000-0000-4000-8000-000000000302', v_user_id, 'New',  '#3b82f6', v_biz_id),
    ('20000000-0000-4000-8000-000000000303', v_user_id, 'Follow up', '#ef4444', v_biz_id)
  ON CONFLICT (id) DO NOTHING;

  -- ------------------------------------------------------------
  -- Deals
  -- ------------------------------------------------------------
  INSERT INTO public.deals (id, user_id, pipeline_id, stage_id, contact_id, title, value, currency, status, business_id, created_at, updated_at) VALUES
    ('20000000-0000-4000-8000-000000000401', v_user_id, v_pipeline, v_stage_new,  v_c1, 'Diesel delivery contract',  4500000, 'UGX', 'open', v_biz_id, now() - interval '8 days', now() - interval '2 hours'),
    ('20000000-0000-4000-8000-000000000402', v_user_id, v_pipeline, v_stage_q,    v_c3, 'Wholesale spice reorder',    1800000, 'UGX', 'open', v_biz_id, now() - interval '5 days', now() - interval '1 day'),
    ('20000000-0000-4000-8000-000000000403', v_user_id, v_pipeline, v_stage_prop, v_c4, 'Fleet servicing plan',       7200000, 'UGX', 'open', v_biz_id, now() - interval '2 days', now() - interval '3 hours'),
    ('20000000-0000-4000-8000-000000000404', v_user_id, v_pipeline, v_stage_won,  v_c2, 'Monthly bread order',         950000,  'UGX', 'won',  v_biz_id, now() - interval '10 days', now() - interval '4 days')
  ON CONFLICT (id) DO NOTHING;

  -- ------------------------------------------------------------
  -- Conversations + messages (generates response-time samples)
  -- ------------------------------------------------------------
  INSERT INTO public.conversations (id, user_id, contact_id, status, last_message_text, last_message_at, unread_count, business_id, created_at, updated_at) VALUES
    ('20000000-0000-4000-8000-000000000501', v_user_id, v_c1, 'open',   'That works for us. Confirm by Friday?', now() - interval '2 hours', 1, v_biz_id, now() - interval '9 days', now() - interval '2 hours'),
    ('20000000-0000-4000-8000-000000000502', v_user_id, v_c3, 'open',   'Can you share the latest price list?',  now() - interval '1 day',  0, v_biz_id, now() - interval '5 days', now() - interval '1 day'),
    ('20000000-0000-4000-8000-000000000503', v_user_id, v_c6, 'open',   'Hi! I found you on WhatsApp.',           now() - interval '30 min', 1, v_biz_id, now() - interval '2 hours', now() - interval '30 min')
  ON CONFLICT (id) DO NOTHING;
  v_conv1 := '20000000-0000-4000-8000-000000000501';
  v_conv2 := '20000000-0000-4000-8000-000000000502';
  v_conv3 := '20000000-0000-4000-8000-000000000503';

  INSERT INTO public.messages (id, conversation_id, sender_type, sender_id, content_type, content_text, status, created_at, ai_handled, is_ai_response) VALUES
    ('20000000-0000-4000-8000-000000000601', v_conv1, 'customer', NULL, 'text', 'Hello, do you deliver to Ntinda?', 'sent', now() - interval '9 days', false, false),
    ('20000000-0000-4000-8000-000000000602', v_conv1, 'agent',    v_user_id, 'text', 'Yes we do — two day slots.', 'sent', now() - interval '9 days' + interval '5 min', false, false),
    ('20000000-0000-4000-8000-000000000603', v_conv1, 'customer', NULL, 'text', 'Great, what volumes can you handle?', 'sent', now() - interval '8 days', false, false),
    ('20000000-0000-4000-8000-000000000604', v_conv1, 'agent',    v_user_id, 'text', 'Up to 4 tonnes per week.', 'sent', now() - interval '8 days' + interval '8 min', false, false),
    ('20000000-0000-4000-8000-000000000605', v_conv1, 'customer', NULL, 'text', 'That works for us. Confirm by Friday?', 'sent', now() - interval '2 hours', false, false),

    ('20000000-0000-4000-8000-000000000611', v_conv3, 'customer', NULL, 'text', 'Hi! I found you on WhatsApp.', 'sent', now() - interval '30 min', false, false)
  ON CONFLICT (id) DO NOTHING;

  -- ------------------------------------------------------------
  -- Message template (so the Broadcasts screen is usable)
  -- ------------------------------------------------------------
  INSERT INTO public.message_templates (id, user_id, name, category, language, body_text, status, business_id) VALUES
    ('20000000-0000-4000-8000-000000000701', v_user_id, 'New stock alert', 'Marketing', 'en_US', 'Hi {{1}}, fresh stock is in at our warehouse today. Reply to reserve.', 'Approved', v_biz_id)
  ON CONFLICT (id) DO NOTHING;

  -- ------------------------------------------------------------
  -- Broadcast (shows in the activity feed)
  -- ------------------------------------------------------------
  INSERT INTO public.broadcasts (id, user_id, name, template_name, status, total_recipients, sent_count, business_id, created_at) VALUES
    ('20000000-0000-4000-8000-000000000801', v_user_id, 'End of month promo', 'New stock alert', 'sent', 3, 3, v_biz_id, now() - interval '4 days')
  ON CONFLICT (id) DO NOTHING;

  -- ------------------------------------------------------------
  -- Automation + one log entry (activity feed)
  -- ------------------------------------------------------------
  INSERT INTO public.automations (id, user_id, name, description, trigger_type, trigger_config, is_active, execution_count, business_id) VALUES
    ('20000000-0000-4000-8000-000000000901', v_user_id, 'Welcome new contact', 'Greet new contacts automatically', 'new_contact', '{}'::jsonb, true, 1, v_biz_id)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.automation_logs (id, automation_id, user_id, contact_id, trigger_event, steps_executed, status, business_id, created_at) VALUES
    ('20000000-0000-4000-8000-000000000911', '20000000-0000-4000-8000-000000000901', v_user_id, v_c6, 'new_contact',
     '[{"type": "send_text", "status": "completed"}]'::jsonb, 'success', v_biz_id, now() - interval '20 min')
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'seed complete for business %', v_biz_id;
END $$;
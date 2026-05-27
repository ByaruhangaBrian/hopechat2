-- Migration: Fix SaaS Isolation, Backfill Data, and Add Auto-Assignment Triggers

-- 1. Ensure every profile has a business_id
DO $$
DECLARE
  profile_rec RECORD;
  new_biz_id UUID;
BEGIN
  FOR profile_rec IN SELECT * FROM profiles WHERE business_id IS NULL LOOP
    -- Create a business for this user
    INSERT INTO businesses (name)
    VALUES (COALESCE(profile_rec.full_name, 'My Business'))
    RETURNING id INTO new_biz_id;

    -- Update the profile
    UPDATE profiles SET business_id = new_biz_id WHERE id = profile_rec.id;
  END LOOP;
END $$;

-- 2. Backfill business_id for all tenant tables
DO $$
DECLARE
  table_name_var TEXT;
  tables_to_fix TEXT[] := ARRAY[
    'contacts', 'tags', 'custom_fields', 'conversations', 'whatsapp_config', 
    'message_templates', 'pipelines', 'deals', 'broadcasts', 'ai_settings', 
    'http_logs', 'whatsapp_ai_jobs', 'automations', 'automation_logs', 
    'automation_pending_executions'
  ];
BEGIN
  FOREACH table_name_var IN ARRAY tables_to_fix LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = table_name_var AND column_name = 'business_id') THEN
      EXECUTE format(
        'UPDATE %I t SET business_id = p.business_id FROM profiles p WHERE t.user_id = p.user_id AND t.business_id IS NULL',
        table_name_var
      );
    END IF;
  END LOOP;
END $$;

-- 3. Create Trigger Function to auto-fill business_id from user_id
CREATE OR REPLACE FUNCTION public.auto_fill_business_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.business_id IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT business_id INTO NEW.business_id FROM public.profiles WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Apply Triggers to all tenant tables
DO $$
DECLARE
  table_name_var TEXT;
  tables_to_trigger TEXT[] := ARRAY[
    'contacts', 'tags', 'custom_fields', 'conversations', 'whatsapp_config', 
    'message_templates', 'pipelines', 'deals', 'broadcasts', 'ai_settings', 
    'http_logs', 'whatsapp_ai_jobs', 'automations', 'automation_logs', 
    'automation_pending_executions'
  ];
BEGIN
  FOREACH table_name_var IN ARRAY tables_to_trigger LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name_var) THEN
      EXECUTE format(
        'DROP TRIGGER IF EXISTS trg_auto_fill_business_id ON %I',
        table_name_var
      );
      EXECUTE format(
        'CREATE TRIGGER trg_auto_fill_business_id BEFORE INSERT ON %I FOR EACH ROW EXECUTE FUNCTION public.auto_fill_business_id()',
        table_name_var
      );
    END IF;
  END LOOP;
END $$;

-- 5. Fix RLS for message_reactions (missed in 015)
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own reactions" ON message_reactions;
DROP POLICY IF EXISTS "Business scoped message_reactions" ON message_reactions;
CREATE POLICY "Business scoped message_reactions" ON message_reactions FOR ALL
  USING (EXISTS (SELECT 1 FROM conversations c JOIN messages m ON m.conversation_id = c.id WHERE m.id = message_reactions.message_id AND c.business_id = get_user_business_id()));

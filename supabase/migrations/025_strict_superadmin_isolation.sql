-- 1. Create helper for Admin View All mode
-- Returns TRUE only if user is superadmin AND the explicit 'x-admin-view-all' header is present.
CREATE OR REPLACE FUNCTION is_admin_view_all()
RETURNS BOOLEAN AS $$
DECLARE
  headers JSON;
  view_all TEXT;
BEGIN
  -- Check if user is superadmin at all
  IF NOT is_superadmin() THEN
    RETURN FALSE;
  END IF;

  -- Check for explicit admin view-all header
  BEGIN
    headers := current_setting('request.headers', true)::JSON;
    view_all := headers ->> 'x-admin-view-all';
  EXCEPTION WHEN OTHERS THEN
    view_all := NULL;
  END;

  RETURN view_all = 'true';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Update get_user_business_id to be more strict
-- It now prioritizes impersonation, otherwise falls back to the actual profile's business_id.
-- It no longer "defaults" to NULL/Global for superadmins.
CREATE OR REPLACE FUNCTION get_user_business_id()
RETURNS UUID AS $$
DECLARE
  headers JSON;
  impersonated_id TEXT;
  own_id UUID;
BEGIN
  -- Get user's actual business_id first
  SELECT business_id INTO own_id FROM public.profiles WHERE user_id = auth.uid();

  -- If superadmin, allow impersonation override
  IF is_superadmin() THEN
    BEGIN
      headers := current_setting('request.headers', true)::JSON;
      impersonated_id := headers ->> 'x-impersonated-business-id';
    EXCEPTION WHEN OTHERS THEN
      impersonated_id := NULL;
    END;

    IF impersonated_id IS NOT NULL AND impersonated_id <> '' THEN
      RETURN impersonated_id::UUID;
    END IF;
  END IF;

  RETURN own_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3. Update all Tenant Policies to use strict isolation
-- We remove the default 'OR is_superadmin()' which caused leaks.
-- Now superadmins only see everything if is_admin_view_all() is TRUE (Admin Panel mode).
DO $$
DECLARE
  table_name_var TEXT;
  tables_to_scope TEXT[] := ARRAY[
    'contacts', 'tags', 'custom_fields', 'conversations', 'whatsapp_config', 
    'message_templates', 'pipelines', 'deals', 'broadcasts', 'ai_settings', 
    'http_logs', 'whatsapp_ai_jobs', 'automations', 'automation_logs', 
    'automation_pending_executions', 'business_knowledge'
  ];
BEGIN
  FOREACH table_name_var IN ARRAY tables_to_scope LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name_var) THEN
      -- Drop old policies (try variations)
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'Business scoped ' || table_name_var, table_name_var);
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'Strict business scoped ' || table_name_var, table_name_var);
      
      -- Create new strict policy
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR ALL USING (business_id = get_user_business_id() OR is_admin_view_all())', 
        'Strict business scoped ' || table_name_var, 
        table_name_var
      );
    END IF;
  END LOOP;
END $$;

-- 4. Update Special Cases
-- messages
DROP POLICY IF EXISTS "Business scoped messages" ON messages;
CREATE POLICY "Strict business scoped messages" ON messages FOR ALL
  USING (
    is_admin_view_all() OR
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND conversations.business_id = get_user_business_id()
    )
  );

-- profiles
DROP POLICY IF EXISTS "Users can view own business profiles" ON profiles;
CREATE POLICY "Strict business scoped profiles" ON profiles FOR SELECT 
  USING (business_id = get_user_business_id() OR is_admin_view_all());

-- 5. Add unique constraint to phone_number_id to prevent cross-routing
ALTER TABLE whatsapp_config DROP CONSTRAINT IF EXISTS whatsapp_config_phone_number_id_key;
ALTER TABLE whatsapp_config ADD CONSTRAINT whatsapp_config_phone_number_id_key UNIQUE (phone_number_id);

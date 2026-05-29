-- Impersonation-aware RLS and helper functions

-- 1. Helper for superadmin check that respects impersonation
-- Returns TRUE only if superadmin is NOT currently impersonating.
CREATE OR REPLACE FUNCTION is_superadmin_not_impersonating()
RETURNS BOOLEAN AS $$
DECLARE
  headers JSON;
  impersonated_id TEXT;
BEGIN
  -- Check if user is superadmin at all
  IF NOT is_superadmin() THEN
    RETURN FALSE;
  END IF;

  -- Try to get impersonated ID from headers (passed by our Supabase client)
  BEGIN
    headers := current_setting('request.headers', true)::JSON;
    impersonated_id := headers ->> 'x-impersonated-business-id';
  EXCEPTION WHEN OTHERS THEN
    impersonated_id := NULL;
  END;

  -- Also check session variable (fallback for internal DB calls if we use them)
  IF impersonated_id IS NULL OR impersonated_id = '' THEN
    impersonated_id := current_setting('app.impersonated_business_id', true);
  END IF;

  RETURN impersonated_id IS NULL OR impersonated_id = '';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Update get_user_business_id to respect headers
CREATE OR REPLACE FUNCTION get_user_business_id()
RETURNS UUID AS $$
DECLARE
  headers JSON;
  impersonated_id TEXT;
BEGIN
  -- 1. If superadmin, prioritize impersonation
  IF is_superadmin() THEN
    -- Try headers first (best for stateless PostgREST)
    BEGIN
      headers := current_setting('request.headers', true)::JSON;
      impersonated_id := headers ->> 'x-impersonated-business-id';
    EXCEPTION WHEN OTHERS THEN
      impersonated_id := NULL;
    END;

    -- Try session variable (good for RPCs or specific sessions)
    IF impersonated_id IS NULL OR impersonated_id = '' THEN
      impersonated_id := current_setting('app.impersonated_business_id', true);
    END IF;

    IF impersonated_id IS NOT NULL AND impersonated_id <> '' THEN
      RETURN impersonated_id::UUID;
    END IF;
  END IF;

  -- 2. Fallback to their own business_id
  RETURN (SELECT business_id FROM profiles WHERE user_id = auth.uid());
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3. Update all Tenant Policies
-- We change policies from: (business_id = get_user_business_id() OR is_superadmin())
-- to: (business_id = get_user_business_id() OR is_superadmin_not_impersonating())
-- This allows superadmins to see everything in Admin Panel, 
-- but only one tenant's data when they choose to impersonate in the Dashboard.

DO $$
DECLARE
  table_name_var TEXT;
  tables_to_scope TEXT[] := ARRAY[
    'contacts', 'tags', 'custom_fields', 'conversations', 'whatsapp_config', 
    'message_templates', 'pipelines', 'deals', 'broadcasts', 'ai_settings', 
    'http_logs', 'whatsapp_ai_jobs', 'automations', 'automation_logs', 
    'automation_pending_executions'
  ];
BEGIN
  FOREACH table_name_var IN ARRAY tables_to_scope LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name_var) THEN
      -- Drop old scoped policy
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'Business scoped ' || table_name_var, table_name_var);
      
      -- Create new impersonation-aware policy
      EXECUTE format('CREATE POLICY %I ON %I FOR ALL USING (business_id = get_user_business_id() OR is_superadmin_not_impersonating())', 'Business scoped ' || table_name_var, table_name_var);
    END IF;
  END LOOP;
END $$;

-- Update special cases
-- messages
DROP POLICY IF EXISTS "Business scoped messages" ON messages;
CREATE POLICY "Business scoped messages" ON messages FOR ALL
  USING (
    is_superadmin_not_impersonating() OR
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND conversations.business_id = get_user_business_id()
    )
  );

-- profiles
DROP POLICY IF EXISTS "Users can view own business profiles" ON profiles;
CREATE POLICY "Users can view own business profiles" ON profiles FOR SELECT 
  USING (business_id = get_user_business_id() OR is_superadmin_not_impersonating());

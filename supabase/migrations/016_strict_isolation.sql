-- Fix Data Isolation: Remove Superadmin bypass for tenant content tables
-- This ensures superadmins only see their own business data in the regular dashboard.
-- They still have access to everything via the Admin Panel (using service role or specialized policies).

DO $$
DECLARE
  table_name_var TEXT;
  tables_to_isolate TEXT[] := ARRAY[
    'contacts', 'tags', 'custom_fields', 'conversations', 'whatsapp_config', 
    'message_templates', 'pipelines', 'deals', 'broadcasts', 'ai_settings', 
    'whatsapp_ai_jobs', 'automations', 'automation_logs', 
    'automation_pending_executions'
  ];
BEGIN
  FOREACH table_name_var IN ARRAY tables_to_isolate LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name_var) THEN
      -- Drop the previous policy that had the 'OR is_superadmin()' bypass
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'Business scoped ' || table_name_var, table_name_var);
      
      -- Create new strictly isolated policy
      EXECUTE format('CREATE POLICY %I ON %I FOR ALL USING (business_id = get_user_business_id())', 'Strict business scoped ' || table_name_var, table_name_var);
    END IF;
  END LOOP;
END $$;

-- Keep Superadmin bypass for 'businesses' and 'http_logs' as they are system-wide
-- and viewed primarily in the Admin Panel.
-- (Already handled in 015_saas_core.sql but explicitly keeping them scoped with bypass)

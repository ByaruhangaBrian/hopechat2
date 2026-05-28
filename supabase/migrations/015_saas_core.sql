-- SaaS Core Migration: Multi-tenancy, Businesses, and RLS Scoping

-- 1. Create businesses table
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  status TEXT DEFAULT 'active' CHECK (status IN ('trialing', 'active', 'past_due', 'canceled')),
  plan_tier TEXT DEFAULT 'basic' CHECK (plan_tier IN ('basic', 'pro', 'enterprise')),
  usage_quotas JSONB DEFAULT '{"max_contacts": 100, "max_messages": 1000}'::jsonb,
  features JSONB DEFAULT '{"ai_enabled": true, "broadcasts_enabled": true, "automations_enabled": true, "pipelines_enabled": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Update profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT FALSE;

-- 3. Create invitations
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'agent' CHECK (role IN ('owner', 'admin', 'agent')),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. System Settings
CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO system_settings (id, value) VALUES 
('whatsapp_global', '{"verify_token": "hopechat_default_verify_token", "webhook_url": ""}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 5. Add business_id to all tenant-data tables
DO $$
DECLARE
  table_name_var TEXT;
  tables_to_update TEXT[] := ARRAY[
    'contacts', 'tags', 'custom_fields', 'conversations', 'whatsapp_config', 
    'message_templates', 'pipelines', 'deals', 'broadcasts', 'ai_settings', 
    'http_logs', 'whatsapp_ai_jobs', 'automations', 'automation_logs', 
    'automation_pending_executions'
  ];
BEGIN
  FOREACH table_name_var IN ARRAY tables_to_update LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name_var) THEN
      EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE', table_name_var);
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I(business_id)', 'idx_' || table_name_var || '_business_id', table_name_var);
    END IF;
  END LOOP;
END $$;

-- 6. Helper functions
CREATE OR REPLACE FUNCTION get_user_business_id()
RETURNS UUID AS $$
  SELECT business_id FROM profiles WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT is_superadmin FROM profiles WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 7. RLS Policies
-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own business profiles" ON profiles;
CREATE POLICY "Users can view own business profiles" ON profiles FOR SELECT USING (business_id = get_user_business_id() OR is_superadmin());
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id OR is_superadmin());
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id OR is_superadmin());

-- Businesses
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own business" ON businesses;
DROP POLICY IF EXISTS "Superadmins can manage all businesses" ON businesses;
CREATE POLICY "Users can view own business" ON businesses FOR SELECT USING (id = get_user_business_id() OR is_superadmin());
CREATE POLICY "Superadmins can manage all businesses" ON businesses FOR ALL USING (is_superadmin());

-- Standard Business Scoping for all other tables
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
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name_var);
      
      -- Drop legacy policies (try multiple variations)
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'Users can manage own ' || table_name_var, table_name_var);
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'Users can view own ' || table_name_var, table_name_var);
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'Users can manage ' || table_name_var, table_name_var);
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'Business scoped ' || table_name_var, table_name_var);
      
      -- Create new scoped policy
      EXECUTE format('CREATE POLICY %I ON %I FOR ALL USING (business_id = get_user_business_id() OR is_superadmin())', 'Business scoped ' || table_name_var, table_name_var);
    END IF;
  END LOOP;
END $$;

-- Special cases for many-to-many or child tables
-- messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own messages" ON messages;
DROP POLICY IF EXISTS "Business scoped messages" ON messages;
CREATE POLICY "Business scoped messages" ON messages FOR ALL
  USING (EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND (conversations.business_id = get_user_business_id() OR is_superadmin())));

-- system_settings
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Superadmins can manage system settings" ON system_settings;
DROP POLICY IF EXISTS "Everyone can view system settings" ON system_settings;
CREATE POLICY "Superadmins can manage system settings" ON system_settings FOR ALL USING (is_superadmin());
CREATE POLICY "Everyone can view system settings" ON system_settings FOR SELECT USING (auth.role() = 'authenticated');

-- 8. handle_new_user refinement
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_business_id UUID;
  business_name TEXT;
  is_admin_email BOOLEAN;
  metadata_business_id TEXT;
BEGIN
  is_admin_email := (NEW.email = 'hopetechsolutionsltd@gmail.com' OR (NEW.raw_user_meta_data->>'is_superadmin')::boolean = true);
  business_name := COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Business');
  metadata_business_id := NEW.raw_user_meta_data->>'business_id';

  IF metadata_business_id IS NOT NULL AND metadata_business_id <> '' THEN
    new_business_id := metadata_business_id::UUID;
  ELSE
    -- Create a new business for the user
    INSERT INTO public.businesses (name)
    VALUES (business_name)
    RETURNING id INTO new_business_id;
  END IF;

  INSERT INTO public.profiles (user_id, full_name, email, business_id, role, is_superadmin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    new_business_id,
    'owner',
    is_admin_email
  );

  -- Also set is_superadmin in auth.users app_metadata for middleware efficiency
  UPDATE auth.users 
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb), 
    '{is_superadmin}', 
    is_admin_email::text::jsonb
  )
  WHERE id = NEW.id;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to create business/profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- 9. Clean slate logic (optional but recommended per plan)
-- TRUNCATE TABLE contacts, conversations, messages, broadcasts, automations RESTART IDENTITY CASCADE;

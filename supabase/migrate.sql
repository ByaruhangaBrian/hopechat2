-- ============================================================
-- Idempotent migration — safe to run multiple times.
-- Uses IF NOT EXISTS for tables/indexes and DROP IF EXISTS
-- for policies/triggers (Postgres has no CREATE POLICY IF NOT EXISTS).
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- CONTACTS
-- ============================================================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT,
  email TEXT,
  company TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own contacts" ON contacts;
CREATE POLICY "Users can manage own contacts" ON contacts FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- TAGS
-- ============================================================
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own tags" ON tags;
CREATE POLICY "Users can manage own tags" ON tags FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- CONTACT_TAGS (many-to-many)
-- ============================================================
CREATE TABLE IF NOT EXISTS contact_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_contact_tags_contact ON contact_tags(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_tags_tag ON contact_tags(tag_id);

ALTER TABLE contact_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage contact tags" ON contact_tags;
CREATE POLICY "Users can manage contact tags" ON contact_tags FOR ALL
  USING (EXISTS (SELECT 1 FROM contacts WHERE contacts.id = contact_tags.contact_id AND contacts.user_id = auth.uid()));

-- ============================================================
-- CUSTOM_FIELDS
-- ============================================================
CREATE TABLE IF NOT EXISTS custom_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  field_options JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own custom fields" ON custom_fields;
CREATE POLICY "Users can manage own custom fields" ON custom_fields FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- CONTACT_CUSTOM_VALUES
-- ============================================================
CREATE TABLE IF NOT EXISTS contact_custom_values (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  custom_field_id UUID NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, custom_field_id)
);

ALTER TABLE contact_custom_values ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage custom values" ON contact_custom_values;
CREATE POLICY "Users can manage custom values" ON contact_custom_values FOR ALL
  USING (EXISTS (SELECT 1 FROM contacts WHERE contacts.id = contact_custom_values.contact_id AND contacts.user_id = auth.uid()));

-- ============================================================
-- CONTACT_NOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS contact_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contact_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own notes" ON contact_notes;
CREATE POLICY "Users can manage own notes" ON contact_notes FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- CONVERSATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'closed')),
  assigned_agent_id UUID,
  last_message_text TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_contact_id ON conversations(contact_id);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own conversations" ON conversations;
CREATE POLICY "Users can manage own conversations" ON conversations FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'agent', 'bot')),
  sender_id UUID,
  content_type TEXT NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'document', 'audio', 'video', 'location', 'template')),
  content_text TEXT,
  media_url TEXT,
  template_name TEXT,
  message_id TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_message_id ON messages(message_id);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own messages" ON messages;
DROP POLICY IF EXISTS "Service role can insert messages" ON messages;
CREATE POLICY "Users can view own messages" ON messages FOR ALL
  USING (EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid()));
CREATE POLICY "Service role can insert messages" ON messages FOR INSERT WITH CHECK (true);

-- ============================================================
-- WHATSAPP_CONFIG
-- ============================================================
CREATE TABLE IF NOT EXISTS whatsapp_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number_id TEXT NOT NULL,
  waba_id TEXT,
  access_token TEXT NOT NULL,
  verify_token TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected')),
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own config" ON whatsapp_config;
CREATE POLICY "Users can manage own config" ON whatsapp_config FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- MESSAGE_TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Marketing' CHECK (category IN ('Marketing', 'Utility', 'Authentication')),
  language TEXT DEFAULT 'en_US',
  header_type TEXT CHECK (header_type IN ('text', 'image', 'video', 'document')),
  header_content TEXT,
  body_text TEXT NOT NULL,
  footer_text TEXT,
  buttons JSONB,
  status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Pending', 'Approved', 'Rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own templates" ON message_templates;
CREATE POLICY "Users can manage own templates" ON message_templates FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- PIPELINES
-- ============================================================
CREATE TABLE IF NOT EXISTS pipelines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own pipelines" ON pipelines;
CREATE POLICY "Users can manage own pipelines" ON pipelines FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- PIPELINE_STAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline ON pipeline_stages(pipeline_id);

ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage pipeline stages" ON pipeline_stages;
CREATE POLICY "Users can manage pipeline stages" ON pipeline_stages FOR ALL
  USING (EXISTS (SELECT 1 FROM pipelines WHERE pipelines.id = pipeline_stages.pipeline_id AND pipelines.user_id = auth.uid()));

-- ============================================================
-- DEALS
-- ============================================================
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES pipeline_stages(id),
  contact_id UUID NOT NULL REFERENCES contacts(id),
  conversation_id UUID REFERENCES conversations(id),
  title TEXT NOT NULL,
  value NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  notes TEXT,
  expected_close_date DATE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deals_pipeline ON deals(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage_id);

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own deals" ON deals;
CREATE POLICY "Users can manage own deals" ON deals FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- BROADCASTS
-- ============================================================
CREATE TABLE IF NOT EXISTS broadcasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_name TEXT NOT NULL,
  template_language TEXT NOT NULL DEFAULT 'en_US',
  template_variables JSONB,
  audience_filter JSONB,
  scheduled_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed')),
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  replied_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own broadcasts" ON broadcasts;
CREATE POLICY "Users can manage own broadcasts" ON broadcasts FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- BROADCAST_RECIPIENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS broadcast_recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  broadcast_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'replied', 'failed')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_broadcast ON broadcast_recipients(broadcast_id);

ALTER TABLE broadcast_recipients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage broadcast recipients" ON broadcast_recipients;
CREATE POLICY "Users can manage broadcast recipients" ON broadcast_recipients FOR ALL
  USING (EXISTS (SELECT 1 FROM broadcasts WHERE broadcasts.id = broadcast_recipients.broadcast_id AND broadcasts.user_id = auth.uid()));

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at — drop existing triggers first to avoid conflicts
DROP TRIGGER IF EXISTS set_updated_at ON profiles;
DROP TRIGGER IF EXISTS set_updated_at ON contacts;
DROP TRIGGER IF EXISTS set_updated_at ON conversations;
DROP TRIGGER IF EXISTS set_updated_at ON whatsapp_config;
DROP TRIGGER IF EXISTS set_updated_at ON message_templates;
DROP TRIGGER IF EXISTS set_updated_at ON deals;
DROP TRIGGER IF EXISTS set_updated_at ON broadcasts;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON whatsapp_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON message_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON deals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON broadcasts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- AUTO-CREATE PROFILE ON USER SIGNUP
-- Uses SECURITY DEFINER with owner=postgres (bypasses RLS).
-- EXCEPTION block ensures signup still succeeds even if profile
-- insert fails — profile can be created later if needed.
-- ============================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ENABLE REALTIME for key tables (idempotent via DO block)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
  END IF;
END $$;
-- ============================================================
-- Pipeline enhancements:
--   * deals.assigned_to — optional FK to profiles.id
--   * deals.status — CHECK constraint ('open', 'won', 'lost')
--     (replaces the old default 'active' with spec-compliant values)
--
-- Idempotent: safe to run multiple times.
-- ============================================================

-- Add assigned_to (nullable, FK to profiles)
ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_deals_assigned_to ON deals(assigned_to);

-- Normalize status values: any existing 'active' row becomes 'open'
UPDATE deals SET status = 'open' WHERE status = 'active' OR status IS NULL;

-- Replace the old default and enforce allowed values
ALTER TABLE deals ALTER COLUMN status SET DEFAULT 'open';

-- Drop prior CHECK if any (none in 001, but be idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'deals_status_check' AND conrelid = 'deals'::regclass
  ) THEN
    ALTER TABLE deals DROP CONSTRAINT deals_status_check;
  END IF;
END $$;

ALTER TABLE deals
  ADD CONSTRAINT deals_status_check CHECK (status IN ('open', 'won', 'lost'));
-- ============================================================
-- Broadcast recipient correlation + aggregate counts
--
-- Problem this solves:
--   * broadcast_recipients had no column to correlate with Meta's
--     message id, so webhook status updates (sent/delivered/read)
--     could not be mirrored into the recipient row and the broadcast
--     aggregate counts never advanced.
--   * aggregate counts on `broadcasts` (sent/delivered/read/replied/
--     failed) were updated ad-hoc by the sender, which drifted quickly
--     once webhooks arrived out of band.
--
-- This migration:
--   1. Adds whatsapp_message_id (+ unique index) so webhooks can find
--      a recipient given Meta's message id.
--   2. Adds a composite index on (broadcast_id, status) so the
--      aggregate trigger's COUNT(*) FILTER scans are fast.
--   3. Installs an AFTER INSERT/UPDATE/DELETE trigger on
--      broadcast_recipients that re-aggregates the parent broadcasts
--      row. Keeps writer code trivial — the webhook + hook only touch
--      the recipient row; counts stay consistent automatically.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

ALTER TABLE broadcast_recipients
  ADD COLUMN IF NOT EXISTS whatsapp_message_id TEXT;

-- UNIQUE so webhook retries can't create duplicate correlations.
CREATE UNIQUE INDEX IF NOT EXISTS idx_broadcast_recipients_wamid
  ON broadcast_recipients (whatsapp_message_id)
  WHERE whatsapp_message_id IS NOT NULL;

-- Fast path for the aggregate trigger's COUNT(*) FILTER subqueries.
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_broadcast_status
  ON broadcast_recipients (broadcast_id, status);

-- ============================================================
-- Aggregate trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.recompute_broadcast_counts(bid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE broadcasts b SET
    sent_count      = agg.sent_count,
    delivered_count = agg.delivered_count,
    read_count      = agg.read_count,
    replied_count   = agg.replied_count,
    failed_count    = agg.failed_count,
    updated_at      = NOW()
  FROM (
    SELECT
      COUNT(*) FILTER (WHERE status IN ('sent','delivered','read','replied')) AS sent_count,
      COUNT(*) FILTER (WHERE status IN ('delivered','read','replied'))        AS delivered_count,
      COUNT(*) FILTER (WHERE status IN ('read','replied'))                    AS read_count,
      COUNT(*) FILTER (WHERE status = 'replied')                              AS replied_count,
      COUNT(*) FILTER (WHERE status = 'failed')                               AS failed_count
    FROM broadcast_recipients
    WHERE broadcast_id = bid
  ) agg
  WHERE b.id = bid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.broadcast_recipient_aggregate_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_broadcast_counts(OLD.broadcast_id);
    RETURN OLD;
  END IF;

  -- INSERT or UPDATE — only recompute when status changed (or on fresh insert)
  IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.recompute_broadcast_counts(NEW.broadcast_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS broadcast_recipients_aggregate ON broadcast_recipients;
CREATE TRIGGER broadcast_recipients_aggregate
AFTER INSERT OR UPDATE OR DELETE ON broadcast_recipients
FOR EACH ROW EXECUTE FUNCTION public.broadcast_recipient_aggregate_trigger();
-- ============================================================
-- Allow contact deletion without wiping history.
--
-- broadcast_recipients.contact_id and deals.contact_id were declared
-- NOT NULL REFERENCES contacts(id) with no ON DELETE action, so
-- Postgres defaults to NO ACTION. The first time a user tried to
-- delete a contact that had ever received a broadcast or been
-- attached to a deal, the delete failed with:
--
--   ERROR 23503: update or delete on table "contacts" violates
--   foreign key constraint ... on table <other>
--
-- CASCADE is the wrong fix — it would silently wipe historical
-- broadcast recipient rows (breaking audit + retroactively moving
-- broadcasts.sent_count / delivered_count / read_count etc. via the
-- aggregate trigger) and deal rows.
--
-- SET NULL is the right fix: history rows survive with a NULL
-- contact_id. The UI is already null-safe (contact?.name ?? 'Unknown',
-- contact?.phone, etc.).
--
-- Idempotent — safe to run multiple times.
-- ============================================================

-- ── broadcast_recipients.contact_id ────────────────────────────
ALTER TABLE broadcast_recipients
  ALTER COLUMN contact_id DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'broadcast_recipients_contact_id_fkey'
      AND conrelid = 'broadcast_recipients'::regclass
  ) THEN
    ALTER TABLE broadcast_recipients
      DROP CONSTRAINT broadcast_recipients_contact_id_fkey;
  END IF;
END $$;

ALTER TABLE broadcast_recipients
  ADD CONSTRAINT broadcast_recipients_contact_id_fkey
    FOREIGN KEY (contact_id) REFERENCES contacts(id)
    ON DELETE SET NULL;

-- ── deals.contact_id ───────────────────────────────────────────
ALTER TABLE deals
  ALTER COLUMN contact_id DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'deals_contact_id_fkey'
      AND conrelid = 'deals'::regclass
  ) THEN
    ALTER TABLE deals
      DROP CONSTRAINT deals_contact_id_fkey;
  END IF;
END $$;

ALTER TABLE deals
  ADD CONSTRAINT deals_contact_id_fkey
    FOREIGN KEY (contact_id) REFERENCES contacts(id)
    ON DELETE SET NULL;
-- ============================================================
-- Incremental broadcast aggregate trigger.
--
-- Migration 003 installed a trigger that recomputed every counter
-- (sent/delivered/read/replied/failed) via COUNT(*) FILTER on every
-- row change. For a 10k-recipient broadcast, the send loop produces
-- 10k INSERTs + 10k UPDATEs = 20k full aggregate scans, each walking
-- the (broadcast_id, status) index. Workable at small scale, but
-- O(n²) overall.
--
-- This migration replaces that with an incremental trigger that
-- adjusts the parent broadcast's counts by ±1 based on the OLD →
-- NEW.status delta. O(1) per recipient change; no scans at all.
--
-- Semantic model (same as the lib/broadcast-status.ts "forward-only
-- ladder" in the webhook):
--   sent_count       = recipients whose status is at or past 'sent'
--   delivered_count  = ... at or past 'delivered'
--   read_count       = ... at or past 'read'
--   replied_count    = status = 'replied'
--   failed_count     = status = 'failed'
--
-- A webhook that advances a recipient pending → sent → delivered →
-- read → replied bumps every rung it crosses by 1. Going to 'failed'
-- only bumps failed_count (and can only happen from pending / sent,
-- enforced in the webhook).
--
-- Keeps the safety net: a public recompute_broadcast_counts() SQL
-- function is retained so ops can run it manually if counts ever
-- drift (e.g. after bulk DB surgery).
--
-- Idempotent — safe to run multiple times.
-- ============================================================

-- Delta a single column by +1 / -1.
CREATE OR REPLACE FUNCTION public._bcast_bump(bid UUID, col TEXT, delta INT)
RETURNS VOID AS $$
BEGIN
  EXECUTE format(
    'UPDATE broadcasts SET %I = GREATEST(0, %I + $1), updated_at = NOW() WHERE id = $2',
    col, col
  ) USING delta, bid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Columns this recipient's status contributes to.
CREATE OR REPLACE FUNCTION public._bcast_cols_for_status(s TEXT)
RETURNS TEXT[] AS $$
BEGIN
  -- 'pending' contributes to nothing.
  IF s = 'pending' THEN RETURN ARRAY[]::TEXT[]; END IF;
  IF s = 'sent'      THEN RETURN ARRAY['sent_count']; END IF;
  IF s = 'delivered' THEN RETURN ARRAY['sent_count','delivered_count']; END IF;
  IF s = 'read'      THEN RETURN ARRAY['sent_count','delivered_count','read_count']; END IF;
  IF s = 'replied'   THEN RETURN ARRAY['sent_count','delivered_count','read_count','replied_count']; END IF;
  IF s = 'failed'    THEN RETURN ARRAY['failed_count']; END IF;
  RETURN ARRAY[]::TEXT[];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Replace the trigger body with the incremental version.
CREATE OR REPLACE FUNCTION public.broadcast_recipient_aggregate_trigger()
RETURNS TRIGGER AS $$
DECLARE
  old_cols TEXT[];
  new_cols TEXT[];
  c TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    new_cols := _bcast_cols_for_status(NEW.status);
    FOREACH c IN ARRAY new_cols LOOP
      PERFORM _bcast_bump(NEW.broadcast_id, c, 1);
    END LOOP;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    old_cols := _bcast_cols_for_status(OLD.status);
    FOREACH c IN ARRAY old_cols LOOP
      PERFORM _bcast_bump(OLD.broadcast_id, c, -1);
    END LOOP;
    RETURN OLD;
  END IF;

  -- UPDATE: only care if status changed.
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    old_cols := _bcast_cols_for_status(OLD.status);
    new_cols := _bcast_cols_for_status(NEW.status);
    -- Subtract the old contributions, add the new.
    FOREACH c IN ARRAY old_cols LOOP
      PERFORM _bcast_bump(NEW.broadcast_id, c, -1);
    END LOOP;
    FOREACH c IN ARRAY new_cols LOOP
      PERFORM _bcast_bump(NEW.broadcast_id, c, 1);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger itself remains the same (INSERT/UPDATE/DELETE) — just its
-- body has been replaced.

-- Safety net — rebuild counts from scratch. Retained as-is so ops can
-- run it on demand if something ever drifts. Matches the incremental
-- trigger's semantic model exactly.
CREATE OR REPLACE FUNCTION public.recompute_broadcast_counts(bid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE broadcasts b SET
    sent_count      = agg.sent_count,
    delivered_count = agg.delivered_count,
    read_count      = agg.read_count,
    replied_count   = agg.replied_count,
    failed_count    = agg.failed_count,
    updated_at      = NOW()
  FROM (
    SELECT
      COUNT(*) FILTER (WHERE status IN ('sent','delivered','read','replied')) AS sent_count,
      COUNT(*) FILTER (WHERE status IN ('delivered','read','replied'))        AS delivered_count,
      COUNT(*) FILTER (WHERE status IN ('read','replied'))                    AS read_count,
      COUNT(*) FILTER (WHERE status = 'replied')                              AS replied_count,
      COUNT(*) FILTER (WHERE status = 'failed')                               AS failed_count
    FROM broadcast_recipients
    WHERE broadcast_id = bid
  ) agg
  WHERE b.id = bid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
-- ============================================================
-- 006_automations.sql — Automations feature
--
-- Idempotent migration — safe to run multiple times.
-- Follows the same conventions as 001_initial_schema.sql:
--   IF NOT EXISTS on tables/indexes, DROP IF EXISTS before
--   re-creating policies/triggers (Postgres has no
--   CREATE POLICY IF NOT EXISTS).
-- ============================================================

-- ============================================================
-- AUTOMATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS automations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  execution_count INTEGER NOT NULL DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automations_user_id ON automations(user_id);
-- Partial index tuned for the engine's hot path: find active automations
-- whose trigger_type matches the fired event. RLS then narrows by user_id.
CREATE INDEX IF NOT EXISTS idx_automations_active_trigger
  ON automations(trigger_type) WHERE is_active = TRUE;

ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own automations" ON automations;
CREATE POLICY "Users can manage own automations" ON automations FOR ALL
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_updated_at ON automations;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON automations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- AUTOMATION_STEPS
--
-- `position`       — order within parent scope (root scope or a branch).
-- `parent_step_id` — NULL for root-level steps; set to the Condition
--                    step's id for steps that live inside one of its
--                    branches.
-- `branch`         — NULL for root steps. For children of a Condition,
--                    'yes' or 'no' identifying which path.
-- ============================================================
CREATE TABLE IF NOT EXISTS automation_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  parent_step_id UUID REFERENCES automation_steps(id) ON DELETE CASCADE,
  branch TEXT CHECK (branch IN ('yes', 'no')),
  step_type TEXT NOT NULL,
  step_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_steps_automation_id
  ON automation_steps(automation_id, position);
CREATE INDEX IF NOT EXISTS idx_automation_steps_parent
  ON automation_steps(parent_step_id) WHERE parent_step_id IS NOT NULL;

ALTER TABLE automation_steps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage steps of own automations" ON automation_steps;
CREATE POLICY "Users can manage steps of own automations" ON automation_steps FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM automations a
      WHERE a.id = automation_steps.automation_id
        AND a.user_id = auth.uid()
    )
  );

-- ============================================================
-- AUTOMATION_LOGS
--
-- user_id is denormalized for simple RLS; contact_id is nullable so
-- history survives contact deletion (mirrors migration 004's pattern
-- on broadcast_recipients / deals).
-- ============================================================
CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  trigger_event TEXT NOT NULL,
  steps_executed JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_logs_automation
  ON automation_logs(automation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_logs_user ON automation_logs(user_id);

ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own automation logs" ON automation_logs;
CREATE POLICY "Users can view own automation logs" ON automation_logs FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================
-- AUTOMATION_PENDING_EXECUTIONS
--
-- Queue row created when a running automation hits a `wait` step.
-- The cron endpoint drains rows where run_at <= now() and status =
-- 'pending', flips them to 'running', and resumes the automation
-- from `next_step_position` with the saved `context` jsonb.
--
-- Service-role only — writes never originate from the browser, and
-- the engine uses the service-role client. No user policy exposed.
-- ============================================================
CREATE TABLE IF NOT EXISTS automation_pending_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  log_id UUID REFERENCES automation_logs(id) ON DELETE CASCADE,
  parent_step_id UUID REFERENCES automation_steps(id) ON DELETE SET NULL,
  branch TEXT CHECK (branch IN ('yes', 'no')),
  next_step_position INTEGER NOT NULL,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'done', 'failed')),
  run_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_pending_due
  ON automation_pending_executions(run_at) WHERE status = 'pending';

ALTER TABLE automation_pending_executions ENABLE ROW LEVEL SECURITY;
-- No SELECT/INSERT/UPDATE/DELETE policy for authenticated users — all
-- access is server-side via the service-role key.
-- ============================================================
-- 007_automations_increment_counter.sql
--
-- Atomic increment of automations.execution_count + refresh of
-- last_executed_at. Called via PostgREST RPC from the engine.
--
-- Before this, the engine did a read-modify-write:
--   UPDATE automations SET execution_count = <cached + 1> WHERE id = ...
-- so two concurrent dispatches (e.g. the same automation firing for
-- two different contacts in the same second) could both read N and
-- both write N+1, permanently losing one count.
--
-- Idempotent — safe to re-run.
-- ============================================================

CREATE OR REPLACE FUNCTION increment_automation_execution_count(p_automation_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE automations
  SET
    execution_count = execution_count + 1,
    last_executed_at = NOW()
  WHERE id = p_automation_id;
$$;

-- Only the service role needs to call this (engine uses the
-- service-role client). Explicitly lock anon / authenticated out so
-- an authenticated user can't juice someone else's counter via RPC.
REVOKE ALL ON FUNCTION increment_automation_execution_count(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION increment_automation_execution_count(UUID) FROM anon;
REVOKE ALL ON FUNCTION increment_automation_execution_count(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION increment_automation_execution_count(UUID) TO service_role;
-- ============================================================
-- 008_profile_avatars_storage.sql
--
-- Creates the `avatars` Supabase Storage bucket and the RLS policies
-- that let each user manage only their own avatar file while letting
-- everyone read (so rendering <img> tags without signed URLs works).
--
-- File path convention used by the app:
--   avatars/{auth.uid()}/avatar-<timestamp>.<ext>
-- The policies rely on the first path segment matching auth.uid()::text.
--
-- Idempotent — safe to re-run.
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  TRUE,
  2097152, -- 2 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Policies live on storage.objects. Drop-if-exists because Postgres
-- has no CREATE POLICY IF NOT EXISTS, and we want this migration to
-- re-run cleanly.
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
CREATE POLICY "Avatars are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
-- ============================================================
-- Chat actions: reply linkage + reactions
--
-- Adds two things the chat UI now needs:
--
--   1. `messages.reply_to_message_id` — a self-FK so a message can
--      point at the message it replies to. We use the internal UUID
--      (not Meta's message_id text), because Meta IDs aren't unique
--      across phone numbers and can't be FK-constrained. The webhook
--      resolves `context.id` from Meta into our internal UUID before
--      writing. ON DELETE SET NULL — a deleted parent must not nuke
--      its replies (which today never happens, but the constraint
--      should match intent).
--
--   2. `message_reactions` table — one row per (message, actor).
--      Reactions arrive concurrently from agents (UI) and customers
--      (webhook). A row-level uniqueness constraint enforces "one
--      reaction per actor per message" without read-modify-write
--      games on a JSONB column.
--
--      `conversation_id` is denormalised purely so Supabase Realtime
--      can filter on it with a plain `eq`. Realtime can't join.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

-- ============================================================
-- 1. Reply linkage on messages
-- ============================================================
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS reply_to_message_id UUID
  REFERENCES messages(id) ON DELETE SET NULL;

-- Partial index — most messages aren't replies, so skip nulls.
CREATE INDEX IF NOT EXISTS idx_messages_reply_to
  ON messages(reply_to_message_id)
  WHERE reply_to_message_id IS NOT NULL;

-- ============================================================
-- 2. message_reactions
-- ============================================================
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('customer', 'agent')),
  actor_id UUID,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, actor_type, actor_id)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_conversation
  ON message_reactions(conversation_id);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message
  ON message_reactions(message_id);

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see reactions on their conversations" ON message_reactions;
CREATE POLICY "Users see reactions on their conversations" ON message_reactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = message_reactions.conversation_id
      AND c.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users insert reactions on their conversations" ON message_reactions;
CREATE POLICY "Users insert reactions on their conversations" ON message_reactions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = message_reactions.conversation_id
      AND c.user_id = auth.uid()
  ));

-- Agents may remove their own reactions. Customer reactions are managed
-- by the webhook (service-role bypass), not the UI.
DROP POLICY IF EXISTS "Users delete their own agent reactions" ON message_reactions;
CREATE POLICY "Users delete their own agent reactions" ON message_reactions FOR DELETE
  USING (
    actor_type = 'agent'
    AND actor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = message_reactions.conversation_id
        AND c.user_id = auth.uid()
    )
  );

-- Agents may swap their own reaction emoji (UPDATE path is also used by
-- the upsert in /api/whatsapp/react).
DROP POLICY IF EXISTS "Users update their own agent reactions" ON message_reactions;
CREATE POLICY "Users update their own agent reactions" ON message_reactions FOR UPDATE
  USING (
    actor_type = 'agent'
    AND actor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = message_reactions.conversation_id
        AND c.user_id = auth.uid()
    )
  );

-- Realtime — let the thread subscribe filtered by conversation_id.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'message_reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
  END IF;
END $$;
-- AI Settings table for storing per-user AI configuration and training data
create table ai_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  groq_api_key text not null, -- Encrypted via middleware
  system_prompt text not null default 'You are a helpful customer service AI assistant. Respond to customer inquiries promptly and professionally.',
  training_documents text[], -- Array of training document texts
  is_enabled boolean not null default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id)
);

ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own AI settings" ON ai_settings;
CREATE POLICY "Users can manage own AI settings" ON ai_settings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add AI-handled flag to messages table to track which messages were responded to by AI
alter table messages add column if not exists ai_handled boolean default false;
alter table messages add column if not exists is_ai_response boolean default false;

-- Add AI settings to conversations to track if AI is active for this conversation
alter table conversations add column if not exists ai_enabled boolean default false;

create index if not exists idx_ai_settings_user_id on ai_settings(user_id);
-- Create http_logs table for monitoring incoming/outgoing webhooks and API calls

CREATE TABLE IF NOT EXISTS http_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  service TEXT NOT NULL,
  endpoint TEXT,
  payload JSONB,
  headers JSONB,
  status_code INTEGER,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_http_logs_user_id ON http_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_http_logs_created_at ON http_logs(created_at);

ALTER TABLE http_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own http logs" ON http_logs;
CREATE POLICY "Users can view own http logs" ON http_logs FOR SELECT USING (auth.uid() = user_id);

-- Service-role insertion: service role bypasses RLS; allow insert checks to pass for inserts
DROP POLICY IF EXISTS "Service role can insert http logs" ON http_logs;
CREATE POLICY "Service role can insert http logs" ON http_logs FOR INSERT WITH CHECK (true);
-- WHATSAPP AI JOB QUEUE
-- Background queue for WhatsApp webhook AI processing.
CREATE TABLE IF NOT EXISTS whatsapp_ai_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'failed', 'done')),
  retry_count INT NOT NULL DEFAULT 0,
  next_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_ai_jobs_status_next_run ON whatsapp_ai_jobs(status, next_run_at);
-- ============================================================
-- Financial Ledger Schema Migration
-- ============================================================

-- 1. Alterations to the businesses table
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS credits_remaining INTEGER NOT NULL DEFAULT 1500;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS balance_ugx DECIMAL(15, 2) NOT NULL DEFAULT 0.00;

-- 2. Create the payment_transactions table
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  amount_ugx DECIMAL(15, 2) NOT NULL,
  credits_added INTEGER NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('mobile_money', 'card', 'manual_admin')),
  payment_reference TEXT UNIQUE, -- Flutterwave standard tx_ref or manual audit key
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'successful', 'failed')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_business_id ON public.payment_transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON public.payment_transactions(status);

-- 3. Row-Level Security (RLS) Setup
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Strict business scoped payment_transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "Superadmins can manage all payment_transactions" ON public.payment_transactions;

-- Tenant Isolation: Regular members can view their own tenant transactions or if admin_view_all is enabled
CREATE POLICY "Strict business scoped payment_transactions" ON public.payment_transactions
  FOR SELECT
  USING (business_id = get_user_business_id() OR is_admin_view_all());

-- Superadmin Overrides: Superadmins can perform all actions on transactions
CREATE POLICY "Superadmins can manage all payment_transactions" ON public.payment_transactions
  FOR ALL
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- 4. Automated Ledger Trigger Function
CREATE OR REPLACE FUNCTION public.process_transaction_ledger()
RETURNS TRIGGER AS $$
BEGIN
  -- We only credit the business if the status transitions to 'success' or 'successful'
  IF (TG_OP = 'INSERT' AND NEW.status IN ('success', 'successful')) OR
     (TG_OP = 'UPDATE' AND NEW.status IN ('success', 'successful') AND OLD.status NOT IN ('success', 'successful')) THEN
    UPDATE public.businesses
    SET 
      credits_remaining = credits_remaining + NEW.credits_added,
      balance_ugx = balance_ugx + NEW.amount_ugx
    WHERE id = NEW.business_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on payment_transactions
DROP TRIGGER IF EXISTS trigger_process_transaction_ledger ON public.payment_transactions;
CREATE TRIGGER trigger_process_transaction_ledger
  AFTER INSERT OR UPDATE ON public.payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.process_transaction_ledger();

-- 5. Initialize the system settings default configuration for Flutterwave
INSERT INTO public.system_settings (id, value) VALUES 
('flutterwave_global', '{"public_key": "", "secret_key": "", "is_enabled": false}'::jsonb)
ON CONFLICT (id) DO NOTHING;
-- ============================================================
-- ADVANCED AI FLOW ENHANCEMENTS
-- ============================================================

-- 1. ENHANCE CONVERSATIONS TABLE
ALTER TABLE conversations 
  ADD COLUMN IF NOT EXISTS human_takeover BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS escalated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS paused BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. ENHANCE WHATSAPP_AI_JOBS TABLE
ALTER TABLE whatsapp_ai_jobs 
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE;

-- Unique constraint for pending jobs per conversation to enable debouncing
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_ai_jobs_debounce 
  ON whatsapp_ai_jobs (conversation_id) 
  WHERE (status = 'pending');

-- 3. ENHANCE MESSAGES TABLE
ALTER TABLE messages 
  ADD COLUMN IF NOT EXISTS whatsapp_message_id TEXT;

CREATE INDEX IF NOT EXISTS idx_messages_whatsapp_id ON messages(whatsapp_message_id);
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
-- Add impersonation support to get_user_business_id

CREATE OR REPLACE FUNCTION get_user_business_id()
RETURNS UUID AS $$
DECLARE
  impersonated_id TEXT;
BEGIN
  -- 1. Check if superadmin is impersonating via session variable
  -- This allows the UI to 'filter' as if they were that tenant
  IF is_superadmin() THEN
    impersonated_id := current_setting('app.impersonated_business_id', true);
    IF impersonated_id IS NOT NULL AND impersonated_id <> '' THEN
      RETURN impersonated_id::UUID;
    END IF;
  END IF;

  -- 2. Fallback to their own business_id
  RETURN (SELECT business_id FROM profiles WHERE user_id = auth.uid());
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to set impersonation session variable
CREATE OR REPLACE FUNCTION set_impersonation(business_id UUID)
RETURNS VOID AS $$
BEGIN
  IF is_superadmin() THEN
    PERFORM set_config('app.impersonated_business_id', business_id::TEXT, false);
  ELSE
    RAISE EXCEPTION 'Only superadmins can impersonate';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clear impersonation
CREATE OR REPLACE FUNCTION clear_impersonation()
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.impersonated_business_id', '', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add maintenance mode and system announcements to system_settings
INSERT INTO system_settings (id, value) VALUES 
('system_config', '{"maintenance_mode": false, "announcement": ""}'::jsonb)
ON CONFLICT (id) DO NOTHING;

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
-- 020_integrations.sql — Multi-tenant Integrations Hub & Google Sheets

-- 1. Create business_integrations table
CREATE TABLE IF NOT EXISTS business_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, type)
);

-- 2. Add RLS for business_integrations
ALTER TABLE business_integrations ENABLE ROW LEVEL SECURITY;

-- Helper to get user's business_id (already defined in 015 but just in case)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_business_id') THEN
        CREATE FUNCTION get_user_business_id() RETURNS UUID AS 'SELECT business_id FROM profiles WHERE user_id = auth.uid();' LANGUAGE sql STABLE SECURITY DEFINER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_superadmin') THEN
        CREATE FUNCTION is_superadmin() RETURNS BOOLEAN AS 'SELECT is_superadmin FROM profiles WHERE user_id = auth.uid();' LANGUAGE sql STABLE SECURITY DEFINER;
    END IF;
END $$;

DROP POLICY IF EXISTS "Users can view own business integrations" ON business_integrations;
CREATE POLICY "Users can view own business integrations" 
  ON business_integrations FOR SELECT 
  USING (business_id = get_user_business_id() OR is_superadmin());

DROP POLICY IF EXISTS "Users can manage own business integrations" ON business_integrations;
CREATE POLICY "Users can manage own business integrations" 
  ON business_integrations FOR ALL 
  USING (business_id = get_user_business_id() OR is_superadmin())
  WITH CHECK (business_id = get_user_business_id() OR is_superadmin());

-- 3. Update system_settings with global integration defaults
INSERT INTO system_settings (id, value) VALUES 
('integrations_global', '{"google_sheets": {"enabled": true, "default_service_account": {}}}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_business_integrations_business_id ON business_integrations(business_id);
CREATE INDEX IF NOT EXISTS idx_business_integrations_type ON business_integrations(type);
-- AI Knowledge Base table for storing dynamic snippets for AI prompt injection
CREATE TABLE IF NOT EXISTS business_knowledge (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_business_knowledge_business_id ON business_knowledge(business_id);
CREATE INDEX IF NOT EXISTS idx_business_knowledge_active_expiry ON business_knowledge(is_active, expires_at);

-- Enable RLS
ALTER TABLE business_knowledge ENABLE ROW LEVEL SECURITY;

-- Business scoped policy
DROP POLICY IF EXISTS "Business scoped business_knowledge" ON business_knowledge;
CREATE POLICY "Business scoped business_knowledge" ON business_knowledge 
  FOR ALL USING (business_id = get_user_business_id() OR is_superadmin());

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_business_knowledge_updated_at
    BEFORE UPDATE ON business_knowledge
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
-- 1. Harden system_settings policies
-- Currently, any authenticated user can read all system settings.
-- We restrict this so only Super Admins can see sensitive credentials.

DROP POLICY IF EXISTS "Everyone can view system settings" ON system_settings;
CREATE POLICY "Everyone can view system settings" ON system_settings 
  FOR SELECT USING (id IN ('system_config', 'integrations_global', 'whatsapp_global'));

-- Ensure only Super Admins can manage all system settings
DROP POLICY IF EXISTS "Superadmins can manage system settings" ON system_settings;
CREATE POLICY "Superadmins can manage system settings" ON system_settings 
  FOR ALL USING (is_superadmin());

-- 2. Initialize platform_credentials row if it doesn't exist
INSERT INTO system_settings (id, value) VALUES 
('platform_credentials', '{
  "supabase_url": "",
  "supabase_anon_key": "",
  "meta_app_id": "",
  "meta_app_secret": "",
  "gemini_global_key": ""
}'::jsonb)
ON CONFLICT (id) DO NOTHING;
-- Fix missing cascade on profiles
-- When a business is deleted, its associated profiles should also be deleted.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_business_id_fkey;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_business_id_fkey 
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;

-- Trigger to delete auth.users
-- Since profiles are deleted via cascade from business, we want to ensure
-- the actual auth users are also removed from the system.
CREATE OR REPLACE FUNCTION public.handle_profile_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Protect the primary platform admin from accidental deletion if their business is wiped
  IF OLD.email = 'hopetechsolutionsltd@gmail.com' THEN
    RETURN OLD;
  END IF;
  
  -- Delete the actual auth user
  DELETE FROM auth.users WHERE id = OLD.user_id;
  RETURN OLD;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't block the profile deletion
  RAISE WARNING 'Failed to delete auth user %: %', OLD.user_id, SQLERRM;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set the owner to postgres so it can manage auth.users
ALTER FUNCTION public.handle_profile_deletion() OWNER TO postgres;

DROP TRIGGER IF EXISTS on_profile_deleted ON public.profiles;
CREATE TRIGGER on_profile_deleted
  AFTER DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_profile_deletion();
-- Fix onboarding duplication by hardening the handle_new_user trigger
-- This ensures that if a business_id is provided in the metadata, it is used instead of creating a new business.

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
  existing_biz_count INTEGER;
BEGIN
  -- 1. Determine if user should be a superadmin
  is_admin_email := (
    NEW.email = 'hopetechsolutionsltd@gmail.com' 
    OR (NEW.raw_user_meta_data->>'is_superadmin')::boolean = true
    OR (NEW.raw_app_meta_data->>'is_superadmin')::boolean = true
  );

  -- 2. Extract Business ID from metadata
  metadata_business_id := NEW.raw_user_meta_data->>'business_id';
  
  -- If not in user_metadata, check app_metadata (sometimes set by admin API)
  IF metadata_business_id IS NULL OR metadata_business_id = '' THEN
    metadata_business_id := NEW.raw_app_meta_data->>'business_id';
  END IF;

  -- 3. Verify Business ID exists if provided
  IF metadata_business_id IS NOT NULL AND metadata_business_id <> '' THEN
    SELECT count(*) INTO existing_biz_count FROM public.businesses WHERE id = metadata_business_id::UUID;
    
    IF existing_biz_count > 0 THEN
      new_business_id := metadata_business_id::UUID;
    ELSE
      -- Provided ID doesn't exist, fallback to creation
      metadata_business_id := NULL;
    END IF;
  END IF;

  -- 4. Create new business if no valid ID was provided
  IF metadata_business_id IS NULL OR metadata_business_id = '' THEN
    business_name := COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Business');
    
    INSERT INTO public.businesses (name)
    VALUES (business_name)
    RETURNING id INTO new_business_id;
  END IF;

  -- 5. Create Profile
  INSERT INTO public.profiles (user_id, full_name, email, business_id, role, is_superadmin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    new_business_id,
    'owner',
    is_admin_email
  )
  ON CONFLICT (user_id) DO UPDATE SET
    business_id = EXCLUDED.business_id,
    is_superadmin = EXCLUDED.is_superadmin,
    full_name = CASE WHEN profiles.full_name = '' THEN EXCLUDED.full_name ELSE profiles.full_name END;

  -- 6. Sync superadmin status to auth.users app_metadata for middleware
  IF is_admin_email THEN
    UPDATE auth.users 
    SET raw_app_meta_data = jsonb_set(
      COALESCE(raw_app_meta_data, '{}'::jsonb), 
      '{is_superadmin}', 
      'true'::jsonb
    )
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to create business/profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;
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
-- Ensure human_takeover column exists and has a predictable default
-- This flag will be used to prevent automations from overriding manual AI toggles.

ALTER TABLE conversations 
  ADD COLUMN IF NOT EXISTS human_takeover BOOLEAN DEFAULT false;

-- Sync human_takeover for existing conversations: 
-- If AI is already disabled, assume human intervention for safety.
UPDATE conversations 
SET human_takeover = true 
WHERE ai_enabled = false;

-- Now enforce NOT NULL
ALTER TABLE conversations 
  ALTER COLUMN human_takeover SET NOT NULL;
-- ============================================================
-- 027_whatsapp_flows.sql — Support for WhatsApp Flows and Interactive Messages
-- ============================================================

-- Add waiting_on_message_id to automation_pending_executions to allow
-- resuming an automation when a specific message is replied to.
ALTER TABLE automation_pending_executions 
ADD COLUMN IF NOT EXISTS waiting_on_message_id TEXT;

-- Add expires_at to automation_pending_executions for interaction timeouts.
ALTER TABLE automation_pending_executions 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Index for fast lookup by message_id when a webhook reply arrives.
CREATE INDEX IF NOT EXISTS idx_automation_pending_message_id 
ON automation_pending_executions(waiting_on_message_id) 
WHERE status = 'pending' AND waiting_on_message_id IS NOT NULL;
-- Allow business owners to update their business name (needed for onboarding)
-- We check if the user's business_id matches the row being updated.

CREATE POLICY "Owners can update their own business" 
ON public.businesses 
FOR UPDATE 
USING (
  id = (SELECT business_id FROM public.profiles WHERE user_id = auth.uid())
)
WITH CHECK (
  id = (SELECT business_id FROM public.profiles WHERE user_id = auth.uid())
);
-- 1. Create subscription_tiers Table
CREATE TABLE IF NOT EXISTS subscription_tiers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_ugx NUMERIC NOT NULL,
  base_credits_monthly INT NOT NULL,
  max_team_seats INT NOT NULL,
  allow_broadcasts BOOLEAN DEFAULT false,
  allow_flows BOOLEAN DEFAULT false,
  allow_multimodal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on subscription_tiers
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;

-- Allow select for authenticated users, full management for superadmins
CREATE POLICY "Allow authenticated users to read tiers" ON subscription_tiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow superadmins full access to tiers" ON subscription_tiers FOR ALL TO authenticated USING (is_superadmin()) WITH CHECK (is_superadmin());

-- 2. Seed Subscription Tiers
INSERT INTO subscription_tiers (id, name, price_ugx, base_credits_monthly, max_team_seats, allow_broadcasts, allow_flows, allow_multimodal)
VALUES 
  ('bronze', 'Bronze Plan', 65000, 1500, 1, false, false, false),
  ('silver', 'Silver Plan', 180000, 5000, 3, true, true, false),
  ('gold', 'Gold Plan', 450000, 9999999, 10, true, true, true)
ON CONFLICT (id) DO NOTHING;

-- 3. Add tier_id Column to Businesses
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS tier_id TEXT REFERENCES subscription_tiers(id) DEFAULT 'bronze';

-- Update existing businesses to bronze tier
UPDATE businesses SET tier_id = 'bronze' WHERE tier_id IS NULL;

-- 4. Update handle_new_user() trigger to enforce max_team_seats
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
  existing_biz_count INTEGER;
BEGIN
  -- 1. Determine if user should be a superadmin
  is_admin_email := (
    NEW.email = 'hopetechsolutionsltd@gmail.com' 
    OR (NEW.raw_user_meta_data->>'is_superadmin')::boolean = true
    OR (NEW.raw_app_meta_data->>'is_superadmin')::boolean = true
  );

  -- 2. Extract Business ID from metadata
  metadata_business_id := NEW.raw_user_meta_data->>'business_id';
  
  -- If not in user_metadata, check app_metadata (sometimes set by admin API)
  IF metadata_business_id IS NULL OR metadata_business_id = '' THEN
    metadata_business_id := NEW.raw_app_meta_data->>'business_id';
  END IF;

  -- 3. Verify Business ID exists if provided
  IF metadata_business_id IS NOT NULL AND metadata_business_id <> '' THEN
    SELECT count(*) INTO existing_biz_count FROM public.businesses WHERE id = metadata_business_id::UUID;
    
    IF existing_biz_count > 0 THEN
      new_business_id := metadata_business_id::UUID;
      
      -- Enforce max_team_seats limit (superadmins bypass this)
      IF NOT is_admin_email THEN
        DECLARE
          current_seats INTEGER;
          max_seats INTEGER;
          tier_id_val TEXT;
        BEGIN
          -- Count existing profiles for this business
          SELECT count(*) INTO current_seats FROM public.profiles WHERE business_id = new_business_id;
          
          -- Get the business's tier and its max_team_seats limit
          SELECT b.tier_id INTO tier_id_val FROM public.businesses b WHERE b.id = new_business_id;
          SELECT t.max_team_seats INTO max_seats FROM public.subscription_tiers t WHERE t.id = tier_id_val;
          
          -- If seats limit exceeded, block creation by raising an exception
          IF max_seats IS NOT NULL AND current_seats >= max_seats THEN
            RAISE EXCEPTION 'Maximum team seats limit (%) reached for this business tier. Please upgrade your subscription to add more agents.', max_seats;
          END IF;
        END;
      END IF;
      
    ELSE
      -- Provided ID doesn't exist, fallback to creation
      metadata_business_id := NULL;
    END IF;
  END IF;

  -- 4. Create new business if no valid ID was provided
  IF metadata_business_id IS NULL OR metadata_business_id = '' THEN
    business_name := COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Business');
    
    INSERT INTO public.businesses (name, tier_id)
    VALUES (business_name, 'bronze')
    RETURNING id INTO new_business_id;
  END IF;

  -- 5. Create Profile
  INSERT INTO public.profiles (user_id, full_name, email, business_id, role, is_superadmin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    new_business_id,
    'owner',
    is_admin_email
  )
  ON CONFLICT (user_id) DO UPDATE SET
    business_id = EXCLUDED.business_id,
    is_superadmin = EXCLUDED.is_superadmin,
    full_name = CASE WHEN profiles.full_name = '' THEN EXCLUDED.full_name ELSE profiles.full_name END;

  -- 6. Sync superadmin status to auth.users app_metadata for middleware efficiency
  IF is_admin_email THEN
    UPDATE auth.users 
    SET raw_app_meta_data = jsonb_set(
      COALESCE(raw_app_meta_data, '{}'::jsonb), 
      '{is_superadmin}', 
      'true'::jsonb
    )
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE; -- Re-raise exception to block signup transaction if check failed
END;
$$;
-- 030_http_logs_business_id.sql — Add business_id column and allow 'system' direction

ALTER TABLE http_logs ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;

ALTER TABLE http_logs DROP CONSTRAINT IF EXISTS http_logs_direction_check;
ALTER TABLE http_logs ADD CONSTRAINT http_logs_direction_check CHECK (direction IN ('incoming', 'outgoing', 'system'));

CREATE INDEX IF NOT EXISTS idx_http_logs_business_id ON http_logs(business_id);

-- Fix remaining RLS policies that were never updated for impersonation.
-- Migration 025 bulk-updated most tables but missed junction/sub-tables
-- that still use the old `user_id = auth.uid()` pattern.
-- During impersonation, get_user_business_id() returns the impersonated
-- business UUID, so all policies must use it instead of user_id checks.

-- ============================================================
-- 1. pipeline_stages (queried by dashboard pipeline donut)
-- ============================================================
DROP POLICY IF EXISTS "Users can manage pipeline stages" ON pipeline_stages;
DROP POLICY IF EXISTS "Strict business scoped pipeline_stages" ON pipeline_stages;
CREATE POLICY "Strict business scoped pipeline_stages" ON pipeline_stages FOR ALL
  USING (
    is_admin_view_all()
    OR EXISTS (
      SELECT 1 FROM pipelines
      WHERE pipelines.id = pipeline_stages.pipeline_id
        AND pipelines.business_id = get_user_business_id()
    )
  );

-- ============================================================
-- 2. contact_tags
-- ============================================================
DROP POLICY IF EXISTS "Users can manage contact tags" ON contact_tags;
DROP POLICY IF EXISTS "Strict business scoped contact_tags" ON contact_tags;
CREATE POLICY "Strict business scoped contact_tags" ON contact_tags FOR ALL
  USING (
    is_admin_view_all()
    OR EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = contact_tags.contact_id
        AND contacts.business_id = get_user_business_id()
    )
  );

-- ============================================================
-- 3. contact_custom_values
-- ============================================================
DROP POLICY IF EXISTS "Users can manage contact custom values" ON contact_custom_values;
DROP POLICY IF EXISTS "Strict business scoped contact_custom_values" ON contact_custom_values;
CREATE POLICY "Strict business scoped contact_custom_values" ON contact_custom_values FOR ALL
  USING (
    is_admin_view_all()
    OR EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = contact_custom_values.contact_id
        AND contacts.business_id = get_user_business_id()
    )
  );

-- ============================================================
-- 4. broadcast_recipients
-- ============================================================
DROP POLICY IF EXISTS "Users can manage broadcast recipients" ON broadcast_recipients;
DROP POLICY IF EXISTS "Strict business scoped broadcast_recipients" ON broadcast_recipients;
CREATE POLICY "Strict business scoped broadcast_recipients" ON broadcast_recipients FOR ALL
  USING (
    is_admin_view_all()
    OR EXISTS (
      SELECT 1 FROM broadcasts
      WHERE broadcasts.id = broadcast_recipients.broadcast_id
        AND broadcasts.business_id = get_user_business_id()
    )
  );

-- ============================================================
-- 5. message_reactions (from migration 009)
-- ============================================================
DROP POLICY IF EXISTS "Users see reactions on their conversations" ON message_reactions;
DROP POLICY IF EXISTS "Strict business scoped message_reactions SELECT" ON message_reactions;
CREATE POLICY "Strict business scoped message_reactions SELECT" ON message_reactions FOR SELECT
  USING (
    is_admin_view_all()
    OR EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = message_reactions.conversation_id
        AND c.business_id = get_user_business_id()
    )
  );

DROP POLICY IF EXISTS "Users insert reactions on their conversations" ON message_reactions;
DROP POLICY IF EXISTS "Strict business scoped message_reactions INSERT" ON message_reactions;
CREATE POLICY "Strict business scoped message_reactions INSERT" ON message_reactions FOR INSERT
  WITH CHECK (
    is_admin_view_all()
    OR EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = message_reactions.conversation_id
        AND c.business_id = get_user_business_id()
    )
  );

DROP POLICY IF EXISTS "Users delete their own agent reactions" ON message_reactions;
DROP POLICY IF EXISTS "Strict business scoped message_reactions DELETE" ON message_reactions;
CREATE POLICY "Strict business scoped message_reactions DELETE" ON message_reactions FOR DELETE
  USING (
    is_admin_view_all()
    OR (
      actor_type = 'agent'
      AND actor_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM conversations c
        WHERE c.id = message_reactions.conversation_id
          AND c.business_id = get_user_business_id()
      )
    )
  );

DROP POLICY IF EXISTS "Users update their own agent reactions" ON message_reactions;
DROP POLICY IF EXISTS "Strict business scoped message_reactions UPDATE" ON message_reactions;
CREATE POLICY "Strict business scoped message_reactions UPDATE" ON message_reactions FOR UPDATE
  USING (
    is_admin_view_all()
    OR (
      actor_type = 'agent'
      AND actor_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM conversations c
        WHERE c.id = message_reactions.conversation_id
          AND c.business_id = get_user_business_id()
      )
    )
  );

-- ============================================================
-- 6. contact_notes (no business_id — route through contacts)
-- ============================================================
DROP POLICY IF EXISTS "Users can manage own notes" ON contact_notes;
DROP POLICY IF EXISTS "Strict business scoped contact_notes" ON contact_notes;
CREATE POLICY "Strict business scoped contact_notes" ON contact_notes FOR ALL
  USING (
    is_admin_view_all()
    OR EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = contact_notes.contact_id
        AND contacts.business_id = get_user_business_id()
    )
  );

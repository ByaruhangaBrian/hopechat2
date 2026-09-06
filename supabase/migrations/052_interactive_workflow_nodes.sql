-- ============================================================
-- 052_interactive_workflow_nodes.sql — Interactive Menu & Assessment Node Manager
--
-- Supports data-driven nested menus, multi-choice question banks,
-- and subscreen flows sent to WhatsApp customers as interactive messages.
-- ============================================================

-- 1. workflow_nodes
CREATE TABLE IF NOT EXISTS workflow_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  parent_node_id UUID REFERENCES workflow_nodes(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  node_key TEXT NOT NULL,
  node_type TEXT NOT NULL DEFAULT 'menu'
    CHECK (node_type IN ('menu', 'question', 'form', 'action')),
  header_text TEXT,
  body_text TEXT NOT NULL,
  footer_text TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  level INT NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_workflow_nodes_business_key UNIQUE (business_id, node_key)
);

CREATE INDEX IF NOT EXISTS idx_workflow_nodes_business_parent
  ON workflow_nodes(business_id, parent_node_id);

CREATE INDEX IF NOT EXISTS idx_workflow_nodes_business_level
  ON workflow_nodes(business_id, level);

-- 2. node_options
CREATE TABLE IF NOT EXISTS node_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID NOT NULL REFERENCES workflow_nodes(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  next_node_id UUID REFERENCES workflow_nodes(id) ON DELETE SET NULL,
  is_correct_answer BOOLEAN NOT NULL DEFAULT FALSE,
  points INT NOT NULL DEFAULT 0,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_node_options_node_option_id UNIQUE (node_id, option_id)
);

CREATE INDEX IF NOT EXISTS idx_node_options_node_position
  ON node_options(node_id, position);

CREATE INDEX IF NOT EXISTS idx_node_options_next_node
  ON node_options(next_node_id);

-- 3. user_sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  current_node_id UUID REFERENCES workflow_nodes(id) ON DELETE SET NULL,
  quiz_score INT NOT NULL DEFAULT 0,
  session_data JSONB DEFAULT '{}'::jsonb,
  last_interaction_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_user_sessions_business_contact UNIQUE (business_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_business_contact
  ON user_sessions(business_id, contact_id);

CREATE INDEX IF NOT EXISTS idx_user_sessions_current_node
  ON user_sessions(current_node_id);

-- Timestamp maintenance triggers
DROP TRIGGER IF EXISTS set_workflow_nodes_updated_at ON workflow_nodes;
CREATE TRIGGER set_workflow_nodes_updated_at BEFORE UPDATE ON workflow_nodes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_user_sessions_updated_at ON user_sessions;
CREATE TRIGGER set_user_sessions_updated_at BEFORE UPDATE ON user_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE workflow_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: workflow_nodes
CREATE POLICY "Users can view their business workflow nodes"
  ON workflow_nodes FOR SELECT
  USING (business_id = get_user_business_id() OR is_admin_view_all());

CREATE POLICY "Users can create workflow nodes for their business"
  ON workflow_nodes FOR INSERT
  WITH CHECK (business_id = get_user_business_id() OR is_admin_view_all());

CREATE POLICY "Users can update their business workflow nodes"
  ON workflow_nodes FOR UPDATE
  USING (business_id = get_user_business_id() OR is_admin_view_all())
  WITH CHECK (business_id = get_user_business_id() OR is_admin_view_all());

CREATE POLICY "Users can delete their business workflow nodes"
  ON workflow_nodes FOR DELETE
  USING (business_id = get_user_business_id() OR is_admin_view_all());

-- RLS Policies: node_options (via parent workflow_nodes business_id)
CREATE POLICY "Users can view node options for their business"
  ON node_options FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workflow_nodes
      WHERE workflow_nodes.id = node_options.node_id
        AND (workflow_nodes.business_id = get_user_business_id() OR is_admin_view_all())
    )
  );

CREATE POLICY "Users can insert node options for their business"
  ON node_options FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workflow_nodes
      WHERE workflow_nodes.id = node_options.node_id
        AND (workflow_nodes.business_id = get_user_business_id() OR is_admin_view_all())
    )
  );

CREATE POLICY "Users can update node options for their business"
  ON node_options FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workflow_nodes
      WHERE workflow_nodes.id = node_options.node_id
        AND (workflow_nodes.business_id = get_user_business_id() OR is_admin_view_all())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workflow_nodes
      WHERE workflow_nodes.id = node_options.node_id
        AND (workflow_nodes.business_id = get_user_business_id() OR is_admin_view_all())
    )
  );

CREATE POLICY "Users can delete node options for their business"
  ON node_options FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workflow_nodes
      WHERE workflow_nodes.id = node_options.node_id
        AND (workflow_nodes.business_id = get_user_business_id() OR is_admin_view_all())
    )
  );

-- RLS Policies: user_sessions
CREATE POLICY "Users can view user sessions for their business"
  ON user_sessions FOR SELECT
  USING (business_id = get_user_business_id() OR is_admin_view_all());

CREATE POLICY "Users can manage user sessions for their business"
  ON user_sessions FOR ALL
  USING (business_id = get_user_business_id() OR is_admin_view_all())
  WITH CHECK (business_id = get_user_business_id() OR is_admin_view_all());

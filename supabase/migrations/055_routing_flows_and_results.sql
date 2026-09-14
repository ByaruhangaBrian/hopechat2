-- ============================================================
-- 055_routing_flows_and_results.sql — Decision-tree routing +
-- attempt/answer analytics for Tests & Practice.
--
-- routing_flows / routing_steps:
--   A routing flow is a branching screening (class -> subject ->
--   paper -> test). Every step is either a `choice` (the options
--   jump to a next step or directly to a test) or a `text` field
--   (collects one answer, then continues to a next step or test).
--   A choice step with exactly ONE option is auto-skipped, so
--   levels that don't matter for a given branch are never asked.
--
-- test_attempts / test_question_results:
--   One attempt row per finished test (with the routing answers it
--   was reached through) and one row per answered question, so the
--   admin results dashboard can show per-test and per-question
--   accuracy ("which subjects/questions need attention").
-- ============================================================

-- 1. routing_flows
CREATE TABLE IF NOT EXISTS routing_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  entry_step_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. routing_steps
CREATE TABLE IF NOT EXISTS routing_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES routing_flows(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  prompt TEXT NOT NULL,
  step_type TEXT NOT NULL DEFAULT 'choice'
    CHECK (step_type IN ('choice', 'text')),
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  next_step_id UUID REFERENCES routing_steps(id) ON DELETE SET NULL,
  test_id UUID REFERENCES tests(id) ON DELETE SET NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_routing_steps_flow_key UNIQUE (flow_id, key)
);

-- entry_step_id references routing_steps (declared after the steps table)
ALTER TABLE routing_flows DROP CONSTRAINT IF EXISTS fk_routing_flows_entry_step;
ALTER TABLE routing_flows
  ADD CONSTRAINT fk_routing_flows_entry_step
  FOREIGN KEY (entry_step_id) REFERENCES routing_steps(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_routing_flows_business
  ON routing_flows(business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_routing_steps_flow
  ON routing_steps(flow_id, position);

CREATE INDEX IF NOT EXISTS idx_routing_steps_test
  ON routing_steps(test_id);

-- Timestamp maintenance triggers
DROP TRIGGER IF EXISTS set_routing_flows_updated_at ON routing_flows;
CREATE TRIGGER set_routing_flows_updated_at BEFORE UPDATE ON routing_flows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_routing_steps_updated_at ON routing_steps;
CREATE TRIGGER set_routing_steps_updated_at BEFORE UPDATE ON routing_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: routing_flows
ALTER TABLE routing_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE routing_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their business routing flows"
  ON routing_flows FOR SELECT
  USING (business_id = get_user_business_id() OR is_admin_view_all());

CREATE POLICY "Users can create routing flows for their business"
  ON routing_flows FOR INSERT
  WITH CHECK (business_id = get_user_business_id() OR is_admin_view_all());

CREATE POLICY "Users can update their business routing flows"
  ON routing_flows FOR UPDATE
  USING (business_id = get_user_business_id() OR is_admin_view_all())
  WITH CHECK (business_id = get_user_business_id() OR is_admin_view_all());

CREATE POLICY "Users can delete their business routing flows"
  ON routing_flows FOR DELETE
  USING (business_id = get_user_business_id() OR is_admin_view_all());

-- RLS: routing_steps (via parent flow business_id)
CREATE POLICY "Users can view routing steps for their business"
  ON routing_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM routing_flows
      WHERE routing_flows.id = routing_steps.flow_id
        AND (routing_flows.business_id = get_user_business_id() OR is_admin_view_all())
    )
  );

CREATE POLICY "Users can insert routing steps for their business"
  ON routing_steps FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM routing_flows
      WHERE routing_flows.id = routing_steps.flow_id
        AND (routing_flows.business_id = get_user_business_id() OR is_admin_view_all())
    )
  );

CREATE POLICY "Users can update routing steps for their business"
  ON routing_steps FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM routing_flows
      WHERE routing_flows.id = routing_steps.flow_id
        AND (routing_flows.business_id = get_user_business_id() OR is_admin_view_all())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM routing_flows
      WHERE routing_flows.id = routing_steps.flow_id
        AND (routing_flows.business_id = get_user_business_id() OR is_admin_view_all())
    )
  );

CREATE POLICY "Users can delete routing steps for their business"
  ON routing_steps FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM routing_flows
      WHERE routing_flows.id = routing_steps.flow_id
        AND (routing_flows.business_id = get_user_business_id() OR is_admin_view_all())
    )
  );

-- 3. test_attempts — one row per finished attempt (routing answers snapshot)
CREATE TABLE IF NOT EXISTS test_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('practice', 'test')),
  routing_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  score INT NOT NULL DEFAULT 0,
  total INT NOT NULL DEFAULT 0,
  percentage INT NOT NULL DEFAULT 0,
  correct_count INT NOT NULL DEFAULT 0,
  passed BOOLEAN,
  timed_out BOOLEAN NOT NULL DEFAULT FALSE,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_attempts_business_created
  ON test_attempts(business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_test_attempts_test
  ON test_attempts(test_id);

CREATE INDEX IF NOT EXISTS idx_test_attempts_contact
  ON test_attempts(contact_id);

-- 4. test_question_results — one row per answered question per attempt
--    question_text is snapshotted so per-question stats survive edits.
CREATE TABLE IF NOT EXISTS test_question_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
  test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  question_id UUID REFERENCES test_questions(id) ON DELETE SET NULL,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  question_text TEXT,
  selected TEXT,
  correct BOOLEAN NOT NULL DEFAULT FALSE,
  points INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_qr_attempt
  ON test_question_results(attempt_id);

CREATE INDEX IF NOT EXISTS idx_test_qr_test_created
  ON test_question_results(test_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_test_qr_question
  ON test_question_results(question_id);

-- RLS: test_attempts
ALTER TABLE test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_question_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attempts for their business"
  ON test_attempts FOR SELECT
  USING (business_id = get_user_business_id() OR is_admin_view_all());

CREATE POLICY "Users can view question results for their business"
  ON test_question_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tests
      WHERE tests.id = test_question_results.test_id
        AND (tests.business_id = get_user_business_id() OR is_admin_view_all())
    )
  );
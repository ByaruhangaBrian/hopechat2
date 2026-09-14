-- ============================================================
-- 053_school_test_module.sql — School Test/Practice Module
--
-- Replaces the multi-level workflow_nodes menu/assessment builder
-- with a flat, simple module: configurable intro fields + a practice
-- question bank, run one question at a time on WhatsApp.
-- ============================================================

-- 1. tests
CREATE TABLE IF NOT EXISTS tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_message TEXT,
  intro_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  mode TEXT NOT NULL DEFAULT 'practice'
    CHECK (mode IN ('practice', 'test')),
  duration_minutes INT CHECK (duration_minutes IS NULL OR duration_minutes > 0),
  pass_mark INT NOT NULL DEFAULT 0 CHECK (pass_mark >= 0 AND pass_mark <= 100),
  shuffle BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tests_business_created
  ON tests(business_id, created_at DESC);

-- 2. test_questions
CREATE TABLE IF NOT EXISTS test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_answer TEXT,
  points INT NOT NULL DEFAULT 1 CHECK (points >= 0),
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_questions_test_position
  ON test_questions(test_id, position);

-- Timestamp maintenance triggers
DROP TRIGGER IF EXISTS set_tests_updated_at ON tests;
CREATE TRIGGER set_tests_updated_at BEFORE UPDATE ON tests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: tests
CREATE POLICY "Users can view their business tests"
  ON tests FOR SELECT
  USING (business_id = get_user_business_id() OR is_admin_view_all());

CREATE POLICY "Users can create tests for their business"
  ON tests FOR INSERT
  WITH CHECK (business_id = get_user_business_id() OR is_admin_view_all());

CREATE POLICY "Users can update their business tests"
  ON tests FOR UPDATE
  USING (business_id = get_user_business_id() OR is_admin_view_all())
  WITH CHECK (business_id = get_user_business_id() OR is_admin_view_all());

CREATE POLICY "Users can delete their business tests"
  ON tests FOR DELETE
  USING (business_id = get_user_business_id() OR is_admin_view_all());

-- RLS Policies: test_questions (via parent tests business_id)
CREATE POLICY "Users can view test questions for their business"
  ON test_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tests
      WHERE tests.id = test_questions.test_id
        AND (tests.business_id = get_user_business_id() OR is_admin_view_all())
    )
  );

CREATE POLICY "Users can insert test questions for their business"
  ON test_questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tests
      WHERE tests.id = test_questions.test_id
        AND (tests.business_id = get_user_business_id() OR is_admin_view_all())
    )
  );

CREATE POLICY "Users can update test questions for their business"
  ON test_questions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tests
      WHERE tests.id = test_questions.test_id
        AND (tests.business_id = get_user_business_id() OR is_admin_view_all())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tests
      WHERE tests.id = test_questions.test_id
        AND (tests.business_id = get_user_business_id() OR is_admin_view_all())
    )
  );

CREATE POLICY "Users can delete test questions for their business"
  ON test_questions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tests
      WHERE tests.id = test_questions.test_id
        AND (tests.business_id = get_user_business_id() OR is_admin_view_all())
    )
  );

-- 3. Migrate the old dispatch_workflow_node automation steps to dispatch_test.
--    The old steps referenced a workflow_nodes row via node_id; the new steps
--    reference a tests row via test_id (orphaned ids become an empty selection).
UPDATE automation_steps
SET step_type = 'dispatch_test',
    step_config = jsonb_build_object('test_id', step_config->>'node_id')
WHERE step_type = 'dispatch_workflow_node';
-- ============================================================
-- 051_onboarding_funnels.sql — Lead recovery / onboarding funnel
--
-- Tracks a visitor's journey from "entered an email on the
-- signup form" through account creation, onboarding, and first
-- engagement, so the team can follow up with anyone who dropped
-- off (send a recovery email) instead of losing them.
--
-- Stages:
--   email_captured       — typed a valid email on the signup form
--   signed_up            — created an account (auth.signUp success)
--   onboarding_complete  — saved a business name (finished setup)
--   engaged              — whatsapp configured / automation created
--                          / first message sent or received
--
-- The funnel is service-role / admin only. No user policies are
-- exposed (mirrors automation_pending_executions). All reads are
-- server-side via the service-role key.
-- ============================================================

CREATE TABLE IF NOT EXISTS onboarding_funnels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  full_name TEXT,
  business_name TEXT,
  stage TEXT NOT NULL DEFAULT 'email_captured'
    CHECK (stage IN ('email_captured', 'signed_up', 'onboarding_complete', 'engaged')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,

  -- Which recovery email (if any) has already been sent, so a lead is
  -- never emailed twice at the same stage.
  email_kind TEXT,
  email_sent_at TIMESTAMPTZ,
  email_error TEXT,
  emailed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Lets a lead opt out of further recovery emails.
  opt_out BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique email per lead. If the same email is seen again, we upsert
-- toward its most advanced state rather than creating a duplicate row.
CREATE UNIQUE INDEX IF NOT EXISTS onboarding_funnels_email_key
  ON onboarding_funnels(LOWER(email));

-- Fast lookups for the cron scan: find leads stuck at a stage that
-- haven't been emailed yet.
CREATE INDEX IF NOT EXISTS idx_onboarding_funnels_stage
  ON onboarding_funnels(stage, created_at) WHERE opt_out = FALSE;

-- Timestamp maintenance on updates (reuses the existing helper).
DROP TRIGGER IF EXISTS set_funnel_updated_at ON onboarding_funnels;
CREATE TRIGGER set_funnel_updated_at BEFORE UPDATE ON onboarding_funnels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

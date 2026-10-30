-- 067_notifications.sql
-- Persistent notifications for business tenants and superadmins.
--
-- Design constraint: scripts/run-migrations.mjs splits statement-by-statement
-- on semicolons. This file contains NO $$ blocks and no semicolons inside string
-- literals or comments.
--
-- Two main read scopes:
--   scope = 'business': tenant-visible notifications (inbound messages, actions needed,
--                       WhatsApp connection, AI escalations, low credits, subscriptions).
--   scope = 'admin':    superadmin-only system-wide alerts (tenant outages, expiring plans,
--                       failed transactions, new registrations).

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  scope TEXT NOT NULL CHECK (scope IN ('business', 'admin')),
  category TEXT NOT NULL CHECK (category IN ('message', 'action_needed', 'subscription', 'system', 'billing')),
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical', 'success')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  action_label TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  dismissed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_business_created
  ON public.notifications(business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_scope_created
  ON public.notifications(scope, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_business_unread
  ON public.notifications(business_id, is_read)
  WHERE is_read = FALSE;

CREATE INDEX IF NOT EXISTS idx_notifications_admin_unread
  ON public.notifications(scope, is_read)
  WHERE is_read = FALSE;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business scoped notifications" ON public.notifications;
DROP POLICY IF EXISTS "Super admin full access on notifications" ON public.notifications;
DROP POLICY IF EXISTS "Service role full access on notifications" ON public.notifications;

-- 1. Tenants read and update their own business notifications
CREATE POLICY "Business scoped notifications" ON public.notifications
  FOR ALL
  USING (
    scope = 'business' AND (
      business_id = get_user_business_id() OR is_admin_view_all()
    )
  )
  WITH CHECK (
    scope = 'business' AND (
      business_id = get_user_business_id() OR is_admin_view_all()
    )
  );

-- 2. Superadmins have full access to everything
CREATE POLICY "Super admin full access on notifications" ON public.notifications
  FOR ALL
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- 3. Service role full access
CREATE POLICY "Service role full access on notifications" ON public.notifications
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);


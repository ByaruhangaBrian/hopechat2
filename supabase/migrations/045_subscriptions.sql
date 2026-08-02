-- ============================================================
-- Subscriptions Migration
-- ============================================================

-- 1. Extend payment_transactions to distinguish subscription purchases
--    from plain credit top-ups.
ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'credits'
    CHECK (purpose IN ('credits', 'subscription'));

ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS period_months INTEGER CHECK (period_months IN (1, 3, 6, 12));

ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS tier_id TEXT REFERENCES public.subscription_tiers(id);

-- 2. Create the subscriptions table (append-only history; one row per
--    purchase, extended in place on renewal).
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  tier_id TEXT NOT NULL REFERENCES public.subscription_tiers(id),
  period_months INTEGER NOT NULL CHECK (period_months IN (1, 3, 6, 12)),
  amount_ugx DECIMAL(15, 2) NOT NULL,
  starts_on DATE NOT NULL,
  expires_on DATE NOT NULL,
  grace_ends_on DATE NOT NULL,
  payment_transaction_id UUID REFERENCES public.payment_transactions(id),
  -- Set once when the lazy expiry-warning email is sent for this subscription.
  last_reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_business_id ON public.subscriptions(business_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_on ON public.subscriptions(expires_on);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business scoped subscriptions" ON public.subscriptions;
CREATE POLICY "Business scoped subscriptions" ON public.subscriptions
  FOR SELECT
  USING (business_id = get_user_business_id() OR is_admin_view_all() OR is_superadmin());

DROP POLICY IF EXISTS "Superadmins can manage subscriptions" ON public.subscriptions;
CREATE POLICY "Superadmins can manage subscriptions" ON public.subscriptions
  FOR ALL
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- 3. Seed configuration
INSERT INTO system_settings (id, value) VALUES
  ('email_settings', '{
    "host": "",
    "port": 587,
    "secure": false,
    "user": "",
    "password": "",
    "from_name": "HopeChat",
    "from_email": ""
  }'::jsonb),
  ('subscription_settings', '{
    "grace_days": 7,
    "discounts": {"3": 0, "6": 5, "12": 10}
  }'::jsonb)
ON CONFLICT (id) DO NOTHING;

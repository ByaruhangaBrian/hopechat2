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

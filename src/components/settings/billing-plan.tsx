'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Coins, CreditCard, Landmark, Loader2, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

export function BillingPlan() {
  const { profile } = useAuth();
  const searchParams = useSearchParams();

  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | 'card'>('mobile_money');
  const [loading, setLoading] = useState(false);

  // Check top-up status from URL query parameters
  useEffect(() => {
    const topup = searchParams.get('topup');
    const error = searchParams.get('error');

    if (topup === 'success') {
      toast.success('Credits purchased successfully! Your balance has been updated.', {
        duration: 5000,
      });
    } else if (topup === 'failed') {
      let desc = 'The transaction was cancelled or failed to verify.';
      if (error === 'credentials') desc = 'Payment gateway keys are not configured on the server.';
      else if (error === 'verification') desc = 'Verification with Flutterwave failed.';
      else if (error === 'currency') desc = 'Only UGX transactions are accepted.';
      else if (error === 'amount_mismatch') desc = 'Transaction amount mismatch detected.';
      
      toast.error('Payment failed', {
        description: desc,
        duration: 6000,
      });
    }
  }, [searchParams]);

  const creditsToAdd = amount && !isNaN(Number(amount))
    ? Math.round((Number(amount) / 10000) * 250)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.business_id) {
      toast.error('Unable to retrieve business identity details.');
      return;
    }

    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      toast.error('Please enter a valid positive UGX amount.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: value,
          businessId: profile.business_id,
          paymentMethod,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate payment checkout.');
      }

      if (data.link) {
        toast.info('Redirecting to payment gateway...', { duration: 3000 });
        window.location.href = data.link;
      } else {
        throw new Error('No checkout redirection link returned.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Payment initiation failed.');
      setLoading(false);
    }
  };

  const currentPlan = 'Starter Plan';
  const remainingCredits = profile?.business?.credits_remaining ?? 0;
  const balanceUgx = profile?.business?.balance_ugx ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Left Side: Current Plan & Balances */}
        <div className="space-y-6">
          {/* Credits Balance Card */}
          <Card className="relative overflow-hidden border-border bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-card text-foreground shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Account Credits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <Coins className="h-8 w-8 text-primary self-center" />
                <span className="text-4xl font-extrabold tracking-tight tabular-nums">
                  {remainingCredits.toLocaleString()}
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  credits remaining
                </span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground/80">
                Credits are consumed on sending broadcasts and automations. 
                Ledger Balance: <span className="font-mono font-medium text-foreground">UGX {balanceUgx.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </p>
            </CardContent>
          </Card>

          {/* Plan details */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Subscription Status
              </CardTitle>
              <CardDescription>
                Your active service subscription plan configuration.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <span className="text-sm text-muted-foreground">Active Plan</span>
                <span className="text-sm font-semibold text-primary px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                  {currentPlan}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <span className="text-sm text-muted-foreground">Billing Period</span>
                <span className="text-sm font-medium text-foreground">Monthly</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">WhatsApp API Status</span>
                <span className="text-sm font-medium text-emerald-500 flex items-center gap-1">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  Connected
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Buy Credits Form */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Purchase Message Credits
            </CardTitle>
            <CardDescription>
              Instantly add credits to your account using Flutterwave.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="topup-amount" className="text-sm font-semibold text-foreground">
                  Amount in UGX
                </Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                    UGX
                  </span>
                  <Input
                    id="topup-amount"
                    type="number"
                    placeholder="e.g. 50000"
                    required
                    disabled={loading}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-12 bg-background border-border text-foreground font-semibold text-lg"
                  />
                </div>
                {creditsToAdd > 0 && (
                  <p className="text-xs text-emerald-500 font-semibold flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" />
                    Will add {creditsToAdd.toLocaleString()} message credits.
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground/60">
                  Rate standard: 10,000 UGX = 250 credits. Minimum purchase of 1,000 UGX.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">
                  Payment Method
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setPaymentMethod('mobile_money')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
                      paymentMethod === 'mobile_money'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <Landmark className="h-4 w-4" />
                    Mobile Money
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setPaymentMethod('card')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
                      paymentMethod === 'card'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <CreditCard className="h-4 w-4" />
                    Credit Card
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-border/50">
                <Button type="submit" disabled={loading} className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Initiating Payment...
                    </>
                  ) : (
                    <>
                      Pay and Add Credits
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

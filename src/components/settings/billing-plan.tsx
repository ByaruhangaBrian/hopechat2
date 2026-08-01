'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Coins, CreditCard, Landmark, Loader2, ArrowRight, ShieldCheck, Check, Clock, History, Activity, Users } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Transaction {
  id: string;
  amount_ugx: number;
  credits_added: number;
  payment_method: string;
  status: string;
  payment_reference: string | null;
  timestamp: string;
}

interface CreditUsageLog {
  id: string;
  action: 'ai_chat' | 'interactive_form' | 'bulk_broadcast' | 'sms';
  credits_used: number;
  description: string | null;
  reference_id: string | null;
  created_at: string;
  contact_id: string | null;
  contact: { name: string | null; phone: string } | null;
}

interface ContactUsage {
  contact_id: string;
  name: string;
  phone: string;
  ai_responses: number;
  credits: number;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  ai_chat: { label: 'AI Chat Response', color: 'text-primary' },
  interactive_form: { label: 'Interactive Form / Flow', color: 'text-sky-500' },
  bulk_broadcast: { label: 'Bulk Broadcast', color: 'text-violet-500' },
  sms: { label: 'SMS Broadcast', color: 'text-emerald-500' },
};

export function BillingPlan() {
  const { profile } = useAuth();
  const searchParams = useSearchParams();

  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | 'card'>('mobile_money');
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [liveBalance, setLiveBalance] = useState<{ credits_remaining: number; balance_ugx: number } | null>(null);
  const [usageLogs, setUsageLogs] = useState<CreditUsageLog[]>([]);
  const [contactUsage, setContactUsage] = useState<ContactUsage[]>([]);
  const [usageMonth, setUsageMonth] = useState<number>(0);
  const [usageLoading, setUsageLoading] = useState(true);

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
      else if (error === 'verification') desc = 'Verification with Pesapal failed.';
      else if (error === 'currency') desc = 'Only UGX transactions are accepted.';
      else if (error === 'amount_mismatch') desc = 'Transaction amount mismatch detected.';
      
      toast.error('Payment failed', {
        description: desc,
        duration: 6000,
      });
    }
  }, [searchParams]);

  useEffect(() => {
    async function fetchTransactions() {
      if (!profile?.business_id) return;
      setHistoryLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('id, amount_ugx, credits_added, payment_method, status, payment_reference, timestamp')
        .eq('business_id', profile.business_id!)
        .order('timestamp', { ascending: false })
        .limit(50);
      if (!error && data) setTransactions(data);
      setHistoryLoading(false);
    }
    fetchTransactions();
  }, [profile?.business_id]);

  // Live balance + credit usage, so the page reflects deductions without
  // relying on the (login-cached) auth profile.
  useEffect(() => {
    const businessId = profile?.business_id;
    if (!businessId) return;
    let cancelled = false;
    const supabase = createClient();

    async function fetchLive() {
      setUsageLoading(true);
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [balanceRes, recentRes, monthRes, contactRes] = await Promise.all([
        supabase
          .from('businesses')
          .select('credits_remaining, balance_ugx')
          .eq('id', businessId)
          .single(),
        supabase
          .from('credit_usage_logs')
          .select('id, action, credits_used, description, reference_id, created_at, contact_id, contact:contacts(name, phone)')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('credit_usage_logs')
          .select('credits_used')
          .eq('business_id', businessId)
          .gte('created_at', startOfMonth.toISOString())
          .limit(5000),
        supabase
          .from('credit_usage_logs')
          .select('contact_id, credits_used, action, contact:contacts(name, phone)')
          .eq('business_id', businessId)
          .gte('created_at', startOfMonth.toISOString())
          .limit(5000),
      ]);

      if (cancelled) return;
      if (balanceRes.data) {
        setLiveBalance({
          credits_remaining: balanceRes.data.credits_remaining ?? 0,
          balance_ugx: balanceRes.data.balance_ugx ?? 0,
        });
      }
      if (!recentRes.error && recentRes.data) {
        setUsageLogs(recentRes.data as unknown as CreditUsageLog[]);
      }
      if (!monthRes.error && monthRes.data) {
        setUsageMonth(monthRes.data.reduce((sum, l) => sum + (l.credits_used || 0), 0));
      }
      if (!contactRes.error && contactRes.data) {
        const map = new Map<string, ContactUsage>();
        for (const row of contactRes.data as unknown as CreditUsageLog[]) {
          if (!row.contact_id || !row.contact) continue;
          const c = row.contact;
          const entry = map.get(row.contact_id) ?? {
            contact_id: row.contact_id,
            name: c.name || c.phone,
            phone: c.phone,
            ai_responses: 0,
            credits: 0,
          };
          entry.ai_responses += row.action === 'ai_chat' ? 1 : 0;
          entry.credits += row.credits_used || 0;
          map.set(row.contact_id, entry);
        }
        setContactUsage([...map.values()].sort((a, b) => b.credits - a.credits).slice(0, 10));
      }
      setUsageLoading(false);
    }

    fetchLive();
    return () => {
      cancelled = true;
    };
  }, [profile?.business_id]);

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

  const tierNames: Record<string, string> = {
    bronze: 'Bronze Plan',
    silver: 'Silver Plan',
    gold: 'Gold Plan',
    basic: 'Basic Plan',
    pro: 'Pro Plan',
    enterprise: 'Enterprise Plan',
  };
  const tierId = profile?.business?.tier_id || profile?.business?.plan_tier || '';
  const currentPlan = tierNames[tierId] || tierId || 'Starter Plan';
  const remainingCredits = liveBalance?.credits_remaining ?? profile?.business?.credits_remaining ?? 0;
  const balanceUgx = liveBalance?.balance_ugx ?? profile?.business?.balance_ugx ?? 0;

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
                Credits are consumed on AI chat replies, interactive forms, and broadcasts.
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
              Instantly add credits to your account using Pesapal.
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

      {/* Payment History */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Payment History
          </CardTitle>
          <CardDescription>
            Your recent credit purchases and admin top-ups.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-muted-foreground">Date</TableHead>
                  <TableHead className="text-muted-foreground">Method</TableHead>
                  <TableHead className="text-muted-foreground text-right">Amount</TableHead>
                  <TableHead className="text-muted-foreground text-right">Credits</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-16 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Clock className="h-4 w-4 animate-spin" />
                        Loading payment history...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-16 text-center text-muted-foreground">
                      No payment transactions yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => (
                    <TableRow key={tx.id} className="border-border hover:bg-muted/30">
                      <TableCell className="text-xs font-mono text-muted-foreground/60">
                        {format(new Date(tx.timestamp), 'MMM d, HH:mm')}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium capitalize text-muted-foreground">
                          {tx.payment_method.replace('_', ' ')}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold text-foreground">
                        UGX {tx.amount_ugx.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium text-emerald-500">
                        +{tx.credits_added.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold ${
                            tx.status === 'successful' || tx.status === 'success'
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : tx.status === 'pending'
                              ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                              : 'bg-red-500/10 text-red-500 border-red-500/20'
                          }`}
                        >
                          {tx.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[10px] font-mono text-muted-foreground/40 max-w-[120px] truncate">
                        {tx.payment_reference || '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Credit Usage History */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Credit Usage
            </CardTitle>
            <CardDescription>
              Track how your message credits are being consumed.
            </CardDescription>
          </div>
          <div className="flex gap-3">
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-right">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">This Month</p>
              <p className="text-lg font-bold text-primary tabular-nums">-{usageMonth.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-right">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Remaining</p>
              <p className="text-lg font-bold text-foreground tabular-nums">{remainingCredits.toLocaleString()}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {contactUsage.length > 0 && (
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Top Contacts This Month
              </h3>
              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="hover:bg-transparent border-border">
                      <TableHead className="text-muted-foreground">Contact</TableHead>
                      <TableHead className="text-muted-foreground text-right">AI Responses</TableHead>
                      <TableHead className="text-muted-foreground text-right">Credits</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contactUsage.map((c) => (
                      <TableRow key={c.contact_id} className="border-border hover:bg-muted/30">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-foreground">{c.name}</span>
                            <span className="text-[10px] text-muted-foreground/60 font-mono">{c.phone}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">{c.ai_responses}</TableCell>
                        <TableCell className="text-right text-sm font-bold text-red-500">
                          -{c.credits.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-muted-foreground">Date</TableHead>
                  <TableHead className="text-muted-foreground">Action</TableHead>
                  <TableHead className="text-muted-foreground">Contact</TableHead>
                  <TableHead className="text-muted-foreground">Description</TableHead>
                  <TableHead className="text-muted-foreground text-right">Credits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usageLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-16 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Clock className="h-4 w-4 animate-spin" />
                        Loading usage...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : usageLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-16 text-center text-muted-foreground">
                      No credit usage yet. Usage appears here as your AI, forms, and broadcasts run.
                    </TableCell>
                  </TableRow>
                ) : (
                  usageLogs.map((log) => {
                    const action = ACTION_LABELS[log.action] ?? { label: log.action, color: 'text-foreground' };
                    return (
                      <TableRow key={log.id} className="border-border hover:bg-muted/30">
                        <TableCell className="text-xs font-mono text-muted-foreground/60 whitespace-nowrap">
                          {format(new Date(log.created_at), 'MMM d, HH:mm')}
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs font-semibold ${action.color}`}>{action.label}</span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                          {log.contact?.name || log.contact?.phone || '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[280px] truncate">
                          {log.description || '—'}
                        </TableCell>
                        <TableCell className="text-right text-sm font-bold text-red-500">
                          -{log.credits_used.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

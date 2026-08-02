"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  Radio,
  Zap,
  Loader2,
  ArrowRight,
  Check,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Plan {
  id: string;
  name: string;
  price_ugx: number;
  base_credits_monthly: number;
  allow_broadcasts: boolean;
  allow_flows: boolean;
  allow_multimodal: boolean;
  max_team_seats: number;
  prices: Record<string, number>;
}

export function SubscriptionPurchase() {
  const { profile } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [period, setPeriod] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const currentTierId = profile?.business?.tier_id || profile?.business?.plan_tier;
  const [selectedTierId, setSelectedTierId] = useState<string>(currentTierId || "bronze");

  useEffect(() => {
    if (currentTierId && !selectedTierId) setSelectedTierId(currentTierId);
  }, [currentTierId, selectedTierId]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/payments/plans")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed to load plans"))))
      .then((data) => {
        if (cancelled) return;
        setPlans(data.plans ?? []);
        if (data.plans?.length) {
          setSelectedTierId((prev) => {
            const exists = data.plans.some((p: Plan) => p.id === prev);
            return exists ? prev : data.plans[0].id;
          });
        }
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = plans.find((p) => p.id === selectedTierId);
  const price = selected ? selected.prices[String(period)] ?? null : null;

  const subscribe = async () => {
    if (!profile?.business_id || !selectedTierId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose: "subscription",
          businessId: profile.business_id,
          paymentMethod: "mobile_money",
          tierId: selectedTierId,
          periodMonths: period,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to initiate subscription checkout.");
      if (data.link) {
        toast.info("Redirecting to payment gateway...", { duration: 3000 });
        window.location.href = data.link;
      } else {
        throw new Error("No checkout redirection link returned.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Subscription checkout failed.";
      toast.error(message);
      setLoading(false);
    }
  };

  return (
    <Card className="bg-card border-border shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Subscribe to a Plan
        </CardTitle>
        <CardDescription>
          Pick a plan and billing period. Multi-month plans get a discount, shown below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {loadError ? (
          <p className="text-sm text-red-500">{loadError}</p>
        ) : plans.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading plans...</p>
        ) : (
          <>
            {/* Plan picker */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {plans.map((plan) => {
                const active = selectedTierId === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    disabled={loading}
                    onClick={() => setSelectedTierId(plan.id)}
                    className={`relative rounded-xl border p-4 text-left transition-all ${
                      active
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-background hover:border-primary/40"
                    }`}
                  >
                    {active && (
                      <span className="absolute right-3 top-3 rounded-full bg-primary p-1 text-primary-foreground">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                    <p className="text-sm font-bold text-foreground">{plan.name}</p>
                    <p className="mt-1 text-2xl font-extrabold tabular-nums text-foreground">
                      {plan.price_ugx.toLocaleString()}
                      <span className="text-xs font-medium text-muted-foreground"> UGX/mo</span>
                    </p>
                    <ul className="mt-3 space-y-1 text-[11px] text-muted-foreground">
                      <li className="flex items-center gap-1.5">
                        <Zap className="h-3 w-3 text-primary" />
                        {plan.base_credits_monthly.toLocaleString()} credits / month
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Users className="h-3 w-3 text-primary" />
                        Up to {plan.max_team_seats} seat{plan.max_team_seats === 1 ? "" : "s"}
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Radio className="h-3 w-3 text-primary" />
                        Broadcasts: {plan.allow_broadcasts ? "Yes" : "No"}
                      </li>
                    </ul>
                  </button>
                );
              })}
            </div>

            {/* Period picker */}
            <div>
              <p className="mb-2 text-sm font-semibold text-foreground">Billing Period</p>
              <div className="grid grid-cols-4 gap-2">
                {[1, 3, 6, 12].map((m) => {
                  const active = period === m;
                  const p = selected?.prices[String(m)];
                  const discount = p && m > 1 ? Math.round((1 - p / (selected.price_ugx * m)) * 100) : 0;
                  return (
                    <button
                      key={m}
                      type="button"
                      disabled={loading}
                      onClick={() => setPeriod(m)}
                      className={`relative rounded-lg border px-2 py-2.5 text-center transition-all ${
                        active
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border bg-background text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="text-sm font-bold">{m} mo</span>
                      {discount > 0 && (
                        <span className="block text-[10px] font-semibold text-emerald-500">
                          -{discount}%
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price summary + CTA */}
            {selected && price !== null && (
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {selected.name} · {period} month{period > 1 ? "s" : ""}
                  </span>
                  <span className="text-lg font-extrabold tabular-nums text-foreground">
                    UGX {price.toLocaleString()}
                  </span>
                </div>
                <Button
                  onClick={subscribe}
                  disabled={loading}
                  className="mt-3 w-full gap-2 bg-primary hover:bg-primary/90 font-semibold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Initiating Payment...
                    </>
                  ) : (
                    <>
                      Subscribe · UGX {price.toLocaleString()}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

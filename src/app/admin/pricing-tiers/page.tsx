"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  ShieldCheck,
  RefreshCw,
  Save,
  Coins,
  Settings,
  Tv,
  CheckCircle,
  Cpu,
  Users,
  Clock,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface SubscriptionTier {
  id: string;
  name: string;
  price_ugx: number;
  base_credits_monthly: number;
  max_team_seats: number;
  allow_broadcasts: boolean;
  allow_flows: boolean;
  allow_multimodal: boolean;
}

interface TrialSettings {
  trial_days: number;
  trial_credits: number;
  trial_features: Record<string, boolean>;
}

export default function PricingTiersPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [trialSettings, setTrialSettings] = useState<TrialSettings>({
    trial_days: 14,
    trial_credits: 500,
    trial_features: {
      inbox_enabled: true,
      contacts_enabled: true,
      ai_enabled: true,
      automations_enabled: true,
      pipelines_enabled: true,
      broadcasts_enabled: false,
      flows_enabled: false,
      multimodal_enabled: false,
    },
  });
  const [savingTrial, setSavingTrial] = useState(false);

  const supabase = createClient();

  const isSuperAdmin =
    user?.app_metadata?.is_superadmin === true ||
    profile?.is_superadmin === true ||
    user?.user_metadata?.role === "super_admin";

  const fetchTiers = async () => {
    setLoading(true);
    try {
      const [tiersRes, trialRes] = await Promise.all([
        supabase.from("subscription_tiers").select("*").order("price_ugx", { ascending: true }),
        supabase.from("system_settings").select("value").eq("id", "trial_settings").single(),
      ]);

      if (tiersRes.error) throw tiersRes.error;
      setTiers(tiersRes.data || []);

      if (trialRes.data?.value) {
        setTrialSettings(trialRes.data.value as TrialSettings);
      }
    } catch (err: any) {
      console.error("Error fetching config:", err);
      toast.error("Failed to load configurations.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTrial = async () => {
    setSavingTrial(true);
    try {
      const adminClient = createClient();
      const res = await fetch("/api/admin/trial-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trialSettings),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to save");
      toast.success("Trial settings saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save trial settings");
    } finally {
      setSavingTrial(false);
    }
  };

  useEffect(() => {
    if (!authLoading && isSuperAdmin) {
      fetchTiers();
    }
  }, [authLoading, isSuperAdmin]);

  const handleUpdateField = (id: string, field: keyof SubscriptionTier, value: any) => {
    setTiers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const handleSaveTier = async (tier: SubscriptionTier) => {
    setSavingId(tier.id);
    try {
      const res = await fetch("/api/admin/pricing-tiers", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tier),
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.error || "Failed to save configurations.");
      }

      toast.success(`${tier.name} parameters updated live successfully!`);
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error(err.message || "Failed to update configurations.");
    } finally {
      setSavingId(null);
    }
  };

  // Auth Loading
  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Checking access credentials...</p>
        </div>
      </div>
    );
  }

  // 403 Forbidden Screen
  if (!isSuperAdmin) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center p-6 bg-card border border-border rounded-xl max-w-2xl mx-auto my-12">
        <div className="h-16 w-16 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
          <ShieldCheck className="h-8 w-8 text-destructive animate-pulse" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">403 - Forbidden</h1>
        <p className="text-lg text-muted-foreground mt-4 max-w-md mx-auto">
          Security policy prevents your account role from access to this administrative workspace. Please contact system administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Subscription Pricing Tiers</h1>
          <p className="text-muted-foreground text-sm">
            Configure price parameters, seat limits, and AI/broadcast feature toggles across the platform tiers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchTiers} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh Tiers
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            <span className="text-sm">Fetching configurations...</span>
          </div>
        </div>
      ) : (
        <>
        {/* Global Trial Settings Card */}
        <Card className="border-border bg-card shadow-sm mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg font-bold text-foreground">Trial Configuration</CardTitle>
                <CardDescription>
                  Settings applied to all new businesses during their trial period
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">Trial Days (0 = no trial)</Label>
                <Input
                  type="number"
                  min={0}
                  value={trialSettings.trial_days}
                  onChange={(e) =>
                    setTrialSettings((s) => ({ ...s, trial_days: parseInt(e.target.value, 10) || 0 }))
                  }
                  className="bg-background border-border text-foreground font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">Trial Credits</Label>
                <div className="relative">
                  <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    min={0}
                    value={trialSettings.trial_credits}
                    onChange={(e) =>
                      setTrialSettings((s) => ({ ...s, trial_credits: parseInt(e.target.value, 10) || 0 }))
                    }
                    className="pl-10 bg-background border-border text-foreground font-mono"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Trial Features</p>
              <p className="text-[10px] text-muted-foreground mb-2">Features enabled during trial period</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {["inbox_enabled", "contacts_enabled", "ai_enabled", "automations_enabled", "pipelines_enabled", "broadcasts_enabled", "flows_enabled", "multimodal_enabled"].map((feat) => (
                  <div key={feat} className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/30">
                    <Label className="text-xs text-foreground capitalize">{feat.replace('_enabled', '').replace('_', ' ')}</Label>
                    <Switch
                      checked={trialSettings.trial_features?.[feat] ?? false}
                      onCheckedChange={(val) =>
                        setTrialSettings((s) => ({
                          ...s,
                          trial_features: { ...s.trial_features, [feat]: val },
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end pt-2 border-t border-border/50">
              <Button
                onClick={handleSaveTrial}
                disabled={savingTrial}
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {savingTrial ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="h-4 w-4" /> Save Trial Settings</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {tiers.map((tier) => (
            <Card
              key={tier.id}
              className={`border-border bg-card shadow-sm hover:shadow-md transition-all relative overflow-hidden`}
            >
              {/* Styling decorative header bar */}
              <div
                className={`h-2.5 w-full ${
                  tier.id === "bronze"
                    ? "bg-amber-600/60"
                    : tier.id === "silver"
                    ? "bg-slate-400"
                    : "bg-yellow-500"
                }`}
              />

              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold text-foreground flex items-center justify-between">
                  <span>{tier.name}</span>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground">
                    ID: {tier.id}
                  </span>
                </CardTitle>
                <CardDescription>Configure parameters for {tier.name}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Numeric fields */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`${tier.id}-price`} className="text-xs font-semibold text-muted-foreground">
                      Price (UGX / month)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">
                        UGX
                      </span>
                      <Input
                        id={`${tier.id}-price`}
                        type="number"
                        value={tier.price_ugx}
                        onChange={(e) =>
                          handleUpdateField(tier.id, "price_ugx", parseFloat(e.target.value) || 0)
                        }
                        className="pl-12 bg-background border-border text-foreground font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`${tier.id}-credits`} className="text-xs font-semibold text-muted-foreground">
                      Base Credits Monthly
                    </Label>
                    <div className="relative">
                      <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id={`${tier.id}-credits`}
                        type="number"
                        value={tier.base_credits_monthly}
                        onChange={(e) =>
                          handleUpdateField(
                            tier.id,
                            "base_credits_monthly",
                            parseInt(e.target.value, 10) || 0
                          )
                        }
                        className="pl-10 bg-background border-border text-foreground font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`${tier.id}-seats`} className="text-xs font-semibold text-muted-foreground">
                      Max Team Seats (Agents)
                    </Label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id={`${tier.id}-seats`}
                        type="number"
                        value={tier.max_team_seats}
                        onChange={(e) =>
                          handleUpdateField(
                            tier.id,
                            "max_team_seats",
                            parseInt(e.target.value, 10) || 0
                          )
                        }
                        className="pl-10 bg-background border-border text-foreground font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Feature Toggles */}
                <div className="space-y-4 border-t border-border/50 pt-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Feature Toggles
                  </h4>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium text-foreground">Bulk Broadcasts</Label>
                      <p className="text-[10px] text-muted-foreground">Allow template campaigns</p>
                    </div>
                    <Switch
                      checked={tier.allow_broadcasts}
                      onCheckedChange={(val) => handleUpdateField(tier.id, "allow_broadcasts", val)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium text-foreground">Interactive Flows</Label>
                      <p className="text-[10px] text-muted-foreground">Enable custom buttons/lists</p>
                    </div>
                    <Switch
                      checked={tier.allow_flows}
                      onCheckedChange={(val) => handleUpdateField(tier.id, "allow_flows", val)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium text-foreground">Multimodal Processing</Label>
                      <p className="text-[10px] text-muted-foreground">Support images & voice notes</p>
                    </div>
                    <Switch
                      checked={tier.allow_multimodal}
                      onCheckedChange={(val) => handleUpdateField(tier.id, "allow_multimodal", val)}
                    />
                  </div>
                </div>

                {/* Save button */}
                <div className="pt-4 border-t border-border/50">
                  <Button
                    onClick={() => handleSaveTier(tier)}
                    disabled={savingId !== null}
                    className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                  >
                    {savingId === tier.id ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Saving Configurations...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Configuration
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        </>
      )}
    </div>
  );
}

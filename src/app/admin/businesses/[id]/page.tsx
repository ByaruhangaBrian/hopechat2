"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Building2,
  Users,
  MessageSquare,
  Activity,
  ArrowLeft,
  Calendar,
  Shield,
  CreditCard,
  Zap,
  CheckCircle2,
  XCircle,
  Coins,
  Plus,
  RefreshCw,
  CoinsIcon,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

interface BusinessDetails {
  id: string;
  name: string;
  status: string;
  plan_tier: string;
  tier_id: string;
  credits_remaining: number;
  balance_ugx: number;
  created_at: string;
  features: Record<string, boolean>;
  usage_quotas: Record<string, number>;
}

interface TenantStats {
  userCount: number;
  messageCount: number;
  contactCount: number;
  conversationCount: number;
}

interface TenantUser {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
}

interface WAConfig {
  phone_number_id: string;
  waba_id: string;
  access_token: string;
  verify_token: string;
  status: string;
}

interface Transaction {
  id: string;
  amount_ugx: number;
  credits_added: number;
  payment_method: string;
  payment_reference: string;
  status: string;
  created_at: string;
}

export default function BusinessDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [business, setBusiness] = useState<BusinessDetails | null>(null);
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [stats, setStats] = useState<TenantStats>({ userCount: 0, messageCount: 0, contactCount: 0, conversationCount: 0 });
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [waConfig, setWaConfig] = useState<WAConfig | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Tier change modal
  const [isTierModalOpen, setIsTierModalOpen] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState<string>("");
  const [isChangingTier, setIsChangingTier] = useState(false);

  // Credit refill modal
  const [isRefillModalOpen, setIsRefillModalOpen] = useState(false);
  const [creditsToAdd, setCreditsToAdd] = useState("");
  const [refillReason, setRefillReason] = useState("Cash Deposit Received");
  const [isRefilling, setIsRefilling] = useState(false);

  useEffect(() => {
    async function fetchDetails() {
      if (!id) return;
      setLoading(true);

      const [
        { data: biz },
        { data: bizUsers },
        { data: wa },
        { data: bizLogs },
        { data: tiersData },
      ] = await Promise.all([
        supabase.from("businesses").select("*").eq("id", id).single(),
        supabase.from("profiles").select("*").eq("business_id", id),
        supabase.from("whatsapp_config").select("*").eq("business_id", id).maybeSingle(),
        supabase.from("http_logs").select("*").eq("business_id", id).order("created_at", { ascending: false }).limit(20),
        supabase.from("subscription_tiers").select("*"),
      ]);

      if (!biz) {
        toast.error("Failed to fetch business details");
        router.push("/admin/businesses");
        return;
      }

      setBusiness(biz);
      setUsers(bizUsers || []);
      setWaConfig(wa);
      setLogs(bizLogs || []);
      setTiers(tiersData || []);
      setSelectedTierId(biz.tier_id || "bronze");

      // Fetch related stats
      const [
        { count: userCount },
        { count: contactCount },
        { count: conversationCount },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("business_id", id),
        supabase.from("contacts").select("*", { count: "exact", head: true }).eq("business_id", id),
        supabase.from("conversations").select("*", { count: "exact", head: true }).eq("business_id", id),
      ]);

      // Fetch message count via conversations
      const { data: conversations } = await supabase
        .from("conversations")
        .select("id")
        .eq("business_id", id);

      const conversationIds = conversations?.map(c => c.id) || [];
      let messageCount = 0;
      if (conversationIds.length > 0) {
        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .in("conversation_id", conversationIds);
        messageCount = count || 0;
      }

      // Fetch recent transactions
      const { data: txData } = await supabase
        .from("payment_transactions")
        .select("*")
        .eq("business_id", id)
        .order("created_at", { ascending: false })
        .limit(10);

      setTransactions(txData || []);
      setStats({
        userCount: userCount || 0,
        messageCount,
        contactCount: contactCount || 0,
        conversationCount: conversationCount || 0,
      });

      setLoading(false);
    }

    fetchDetails();
  }, [id, supabase, router]);

  function getTier(): SubscriptionTier | undefined {
    return tiers.find(t => t.id === business?.tier_id);
  }

  async function changeTier() {
    if (!business || !selectedTierId) return;
    setIsChangingTier(true);
    const newTier = tiers.find(t => t.id === selectedTierId);

    const { error } = await supabase
      .from("businesses")
      .update({
        tier_id: selectedTierId,
        plan_tier: selectedTierId,
        usage_quotas: {
          max_contacts: newTier?.id === "gold" ? 10000 : newTier?.id === "silver" ? 5000 : 100,
          max_messages: newTier?.id === "gold" ? 100000 : newTier?.id === "silver" ? 50000 : 1000,
        },
        features: {
          ai_enabled: true,
          broadcasts_enabled: newTier?.allow_broadcasts ?? false,
          flows_enabled: newTier?.allow_flows ?? false,
          multimodal_enabled: newTier?.allow_multimodal ?? false,
          automations_enabled: true,
        }
      })
      .eq("id", business.id);

    if (error) {
      toast.error("Failed to change tier");
    } else {
      toast.success(`Tier changed to ${newTier?.name || selectedTierId}`);
      setBusiness({
        ...business,
        tier_id: selectedTierId,
        plan_tier: selectedTierId,
        features: {
          ai_enabled: true,
          broadcasts_enabled: newTier?.allow_broadcasts ?? false,
          flows_enabled: newTier?.allow_flows ?? false,
          multimodal_enabled: newTier?.allow_multimodal ?? false,
          automations_enabled: true,
        }
      });
      setIsTierModalOpen(false);
    }
    setIsChangingTier(false);
  }

  async function handleManualRefill(e: React.FormEvent) {
    e.preventDefault();
    if (!business) return;

    const credits = parseInt(creditsToAdd, 10);
    if (isNaN(credits) || credits <= 0) {
      toast.error("Please enter a valid positive credits count");
      return;
    }

    setIsRefilling(true);
    try {
      const res = await fetch("/api/admin/manual-topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          creditsToAdd: credits,
          reason: refillReason
        })
      });

      const responseData = await res.json();
      if (!res.ok) throw new Error(responseData.error || "Manual top-up failed");

      toast.success(`Successfully added ${credits} credits`);
      setIsRefillModalOpen(false);
      setCreditsToAdd("");
      setRefillReason("Cash Deposit Received");

      // Refresh business data
      const { data: updatedBiz } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", id)
        .single();
      if (updatedBiz) setBusiness(updatedBiz);

      // Refresh transactions
      const { data: txData } = await supabase
        .from("payment_transactions")
        .select("*")
        .eq("business_id", id)
        .order("created_at", { ascending: false })
        .limit(10);
      setTransactions(txData || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to execute manual refill");
    } finally {
      setIsRefilling(false);
    }
  }

  async function updateWaConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!waConfig) return;

    const { error } = await supabase
      .from("whatsapp_config")
      .upsert({
        ...waConfig,
        business_id: id,
        updated_at: new Date().toISOString()
      });

    if (error) {
      toast.error("Failed to update WhatsApp config");
    } else {
      toast.success("WhatsApp configuration saved");
    }
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground text-sm"><RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading business intelligence...</div>;
  }

  if (!business) return null;

  const tier = getTier();
  const totalTopupCredits = transactions.filter(t => t.status === 'successful').reduce((sum, t) => sum + (t.credits_added || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-muted-foreground hover:text-foreground hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{business.name}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono text-xs">{business.id}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Joined {business.created_at ? format(new Date(business.created_at), "MMM yyyy") : "Unknown"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="border-border text-muted-foreground hover:text-foreground" onClick={() => {
              document.cookie = `impersonated_business_id=${business.id}; path=/; max-age=3600; SameSite=Lax`;
              document.cookie = `impersonated_business_name=${encodeURIComponent(business.name)}; path=/; max-age=3600; SameSite=Lax`;
              toast.success(`Impersonating ${business.name}`);
              setTimeout(() => { window.location.href = "/dashboard"; }, 500);
           }}>
             <Shield className="mr-2 h-4 w-4" />
             Login as Tenant
           </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-muted border border-border p-1 mb-6">
          <TabsTrigger value="overview" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Overview</TabsTrigger>
          <TabsTrigger value="credits" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Credits & Billing</TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Users ({users.length})</TabsTrigger>
          <TabsTrigger value="whatsapp" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">WhatsApp</TabsTrigger>
          <TabsTrigger value="usage" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Usage & Quotas</TabsTrigger>
          <TabsTrigger value="activity" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge className={cn(
                    "capitalize",
                    business.status === "active" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                    business.status === "canceled" ? "bg-red-500/10 text-red-600 dark:text-red-400" :
                    "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  )}>
                    {business.status}
                  </Badge>
                  <Badge variant="outline" className={cn("capitalize border-border", 
                    business.tier_id === "bronze" ? "text-amber-600" : 
                    business.tier_id === "silver" ? "text-slate-500" : 
                    business.tier_id === "gold" ? "text-yellow-600" : "text-muted-foreground"
                  )}>
                    {tier?.name || business.plan_tier}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Coins className="h-3.5 w-3.5" /> Credits Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{(business.credits_remaining || 0).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground/60">{tier?.base_credits_monthly.toLocaleString()} included/mo</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5" /> UGX Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">UGX {parseFloat(business.balance_ugx as any || "0").toLocaleString()}</div>
                <p className="text-xs text-muted-foreground/60">Monetary balance</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Team Size
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stats.userCount} <span className="text-sm font-normal text-muted-foreground">/ {tier?.max_team_seats || 1}</span></div>
                <p className="text-xs text-muted-foreground/60">Team members</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Contacts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-foreground">{stats.contactCount.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Conversations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-foreground">{stats.conversationCount.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-foreground">{stats.messageCount.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Tier Price</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-foreground">UGX {(tier?.price_ugx || 0).toLocaleString()}<span className="text-xs font-normal text-muted-foreground">/mo</span></div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Zap className="h-5 w-5 text-emerald-500" />
                  Enabled Features
                </CardTitle>
                <CardDescription className="text-muted-foreground/60">Tenant capabilities and modules.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(business.features || {}).map(([feature, enabled]) => (
                    <button 
                      key={feature} 
                      onClick={async () => {
                        const newFeatures = { ...business.features, [feature]: !enabled };
                        const { error } = await supabase.from("businesses").update({ features: newFeatures }).eq("id", business.id);
                        if (!error) {
                          setBusiness({ ...business, features: newFeatures });
                          toast.success(`${feature.replace('_enabled', '')} toggled`);
                        }
                      }}
                      className="flex items-center justify-between p-2 rounded bg-muted hover:bg-muted/80 transition-colors text-left"
                    >
                      <span className="text-xs text-foreground/80 capitalize">{feature.replace('_enabled', '').replace('_', ' ')}</span>
                      {enabled ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <XCircle className="h-3.5 w-3.5 text-muted-foreground/40" />}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-emerald-500" />
                  Subscription Summary
                </CardTitle>
                <CardDescription className="text-muted-foreground/60">Billing and tier details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Current Tier</span>
                  <span className="text-sm text-foreground font-bold capitalize">{tier?.name || business.plan_tier}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Monthly Price</span>
                  <span className="text-sm text-foreground font-bold">UGX {(tier?.price_ugx || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Monthly Credits</span>
                  <span className="text-sm text-foreground font-bold">{(tier?.base_credits_monthly || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Max Seats</span>
                  <span className="text-sm text-foreground font-bold">{tier?.max_team_seats || 1}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span className={cn("text-sm font-bold capitalize", business.status === 'active' ? "text-emerald-500" : "text-amber-500")}>
                    {business.status}
                  </span>
                </div>
                <div className="pt-3 border-t border-border flex gap-2">
                  <Button variant="outline" className="flex-1 border-border text-xs h-8 text-muted-foreground" onClick={() => setIsTierModalOpen(true)}>
                    <Zap className="h-3 w-3 mr-1" />
                    Change Tier
                  </Button>
                  <Button variant="outline" className="flex-1 border-border text-xs h-8 text-muted-foreground" onClick={() => setIsRefillModalOpen(true)}>
                    <Coins className="h-3 w-3 mr-1" />
                    Add Credits
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="credits" className="space-y-6">
          {/* Credit summary cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Current Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground flex items-center gap-2">
                  <Coins className="h-6 w-6 text-emerald-500" />
                  {(business.credits_remaining || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground/60 mt-1">credits available</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Allowance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{(tier?.base_credits_monthly || 0).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground/60 mt-1">credits per billing cycle</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Top-ups</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{totalTopupCredits.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground/60 mt-1">credits added via payments</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setIsRefillModalOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="h-4 w-4 mr-1" />
              Manual Credit Refill
            </Button>
          </div>

          {/* Recent Transactions */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Recent Transactions</CardTitle>
              <CardDescription className="text-muted-foreground/60">Payment history and manual top-ups.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Date</TableHead>
                    <TableHead className="text-muted-foreground">Method</TableHead>
                    <TableHead className="text-muted-foreground">Credits</TableHead>
                    <TableHead className="text-muted-foreground">Amount</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No transactions yet.</TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((tx) => (
                      <TableRow key={tx.id} className="border-border hover:bg-muted/50">
                        <TableCell className="text-muted-foreground/60 text-xs font-mono whitespace-nowrap">
                          {format(new Date(tx.created_at), "MMM d, HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] border-border text-muted-foreground capitalize">
                            {tx.payment_method?.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-bold text-emerald-500">
                          +{tx.credits_added.toLocaleString()}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-foreground">
                          {tx.amount_ugx > 0 ? `UGX ${tx.amount_ugx.toLocaleString()}` : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("text-[10px]",
                            tx.status === 'successful' ? "bg-emerald-500/10 text-emerald-600" :
                            tx.status === 'pending' ? "bg-amber-500/10 text-amber-600" :
                            "bg-red-500/10 text-red-600"
                          )}>
                            {tx.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground/60 font-mono max-w-[150px] truncate">
                          {tx.payment_reference}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-foreground">Team Members</CardTitle>
                <CardDescription className="text-muted-foreground/60">
                  {stats.userCount} / {tier?.max_team_seats || 1} seats used
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Name</TableHead>
                    <TableHead className="text-muted-foreground">Email</TableHead>
                    <TableHead className="text-muted-foreground">Role</TableHead>
                    <TableHead className="text-muted-foreground">Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.user_id} className="border-border hover:bg-muted/50">
                      <TableCell className="text-foreground font-medium">{user.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          "text-[10px] uppercase border-border",
                          user.role === 'admin' ? "text-primary border-primary/30" : "text-muted-foreground"
                        )}>{user.role}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground/60 text-xs">
                        {user.created_at ? format(new Date(user.created_at), "MMM d, yyyy") : "N/A"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">WhatsApp Configuration</CardTitle>
              <CardDescription className="text-muted-foreground/60">Manage Meta API credentials for this tenant.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={updateWaConfig} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Phone Number ID</Label>
                    <Input 
                      value={waConfig?.phone_number_id || ""} 
                      onChange={(e) => setWaConfig(prev => prev ? { ...prev, phone_number_id: e.target.value } : null)}
                      className="bg-muted border-border text-foreground font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">WABA ID</Label>
                    <Input 
                      value={waConfig?.waba_id || ""} 
                      onChange={(e) => setWaConfig(prev => prev ? { ...prev, waba_id: e.target.value } : null)}
                      className="bg-muted border-border text-foreground font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Permanent Access Token</Label>
                  <Input 
                    type="password"
                    value={waConfig?.access_token || ""} 
                    onChange={(e) => setWaConfig(prev => prev ? { ...prev, access_token: e.target.value } : null)}
                    className="bg-muted border-border text-foreground font-mono"
                  />
                </div>
                <div className="flex justify-between items-center pt-4">
                  <Badge className={cn(
                    "uppercase text-[10px]",
                    waConfig?.status === 'connected' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                  )}>
                    Status: {waConfig?.status || "Not Configured"}
                  </Badge>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">Save Credentials</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Usage Quotas</CardTitle>
              <CardDescription className="text-muted-foreground/60">Hard limits and resource consumption.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {Object.entries(business.usage_quotas || {}).map(([key, value]) => {
                const current = key === 'max_contacts' ? stats.contactCount : 
                               key === 'max_messages' ? stats.messageCount : 0;
                const percentage = Math.min(100, Math.round((current / value) * 100));
                
                return (
                  <div key={key} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground capitalize">{key.replace('max_', '').replace('_', ' ')}</span>
                      <span className="text-foreground font-medium">{current.toLocaleString()} / {value.toLocaleString()} Max</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                       <div 
                         className={cn(
                           "h-full transition-all duration-500",
                           percentage > 90 ? "bg-destructive" : percentage > 70 ? "bg-amber-500" : "bg-emerald-600"
                         )} 
                         style={{ width: `${percentage}%` }}
                       ></div>
                    </div>
                    <p className="text-[10px] text-muted-foreground/60">Currently using {percentage}% of total capacity.</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Recent Activity</CardTitle>
              <CardDescription className="text-muted-foreground/60">Filtered system logs for this tenant.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Time</TableHead>
                    <TableHead className="text-muted-foreground">Event</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} className="border-border hover:bg-muted/50">
                      <TableCell className="text-muted-foreground/60 text-[10px] font-mono whitespace-nowrap">
                        {format(new Date(log.created_at), "MMM d, HH:mm")}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-bold text-foreground/80 uppercase">{log.service}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(
                          "text-[10px]",
                          log.status_code < 300 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-destructive/10 text-destructive"
                        )}>
                          {log.status_code}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">{log.note || log.endpoint}</TableCell>
                    </TableRow>
                  ))}
                  {logs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No activity recorded yet.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Tier Change Modal */}
      <Dialog open={isTierModalOpen} onOpenChange={setIsTierModalOpen}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Change Subscription Tier
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Update the subscription tier for <strong>{business.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {tiers.map((t) => {
              const isSelected = selectedTierId === t.id;
              const isCurrent = business.tier_id === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTierId(t.id)}
                  className={cn(
                    "w-full text-left p-4 rounded-xl border-2 transition-all duration-200",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border hover:border-primary/30 bg-muted/30 hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "h-3 w-3 rounded-full",
                        t.id === "bronze" ? "bg-amber-600" : t.id === "silver" ? "bg-slate-400" : "bg-yellow-500"
                      )} />
                      <span className="font-bold text-foreground">{t.name}</span>
                      {isCurrent && <Badge className="text-[9px] bg-primary/10 text-primary">Current</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      {isSelected && <CheckCircle2 className="h-5 w-5 text-primary" />}
                      <span className="text-sm font-bold text-primary">UGX {t.price_ugx.toLocaleString()}/mo</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <div><span className="font-semibold text-foreground">{t.base_credits_monthly.toLocaleString()}</span> credits/mo</div>
                    <div><span className="font-semibold text-foreground">{t.max_team_seats}</span> seats</div>
                    <div className="flex gap-1 flex-wrap">
                      {t.allow_broadcasts && <Badge variant="outline" className="text-[9px] border-border">Broadcasts</Badge>}
                      {t.allow_flows && <Badge variant="outline" className="text-[9px] border-border">Flows</Badge>}
                      {t.allow_multimodal && <Badge variant="outline" className="text-[9px] border-border">Multimodal</Badge>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <DialogFooter className="flex justify-between sm:justify-between">
            <Button variant="outline" onClick={() => setIsTierModalOpen(false)} className="border-border text-muted-foreground">Cancel</Button>
            <Button
              onClick={changeTier}
              disabled={isChangingTier || selectedTierId === business.tier_id}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isChangingTier ? <><RefreshCw className="h-4 w-4 animate-spin mr-2" /> Changing...</> : <><Zap className="h-4 w-4 mr-2" /> Change Tier</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credit Refill Modal */}
      <Dialog open={isRefillModalOpen} onOpenChange={setIsRefillModalOpen}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              Manual Credit Refill
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Add credits to <strong>{business.name}</strong>. This creates an audit trail entry.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleManualRefill} className="space-y-4 py-2">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{business.name}</p>
                <p className="text-xs text-muted-foreground">
                  Current: {(business.credits_remaining || 0).toLocaleString()} credits | UGX {parseFloat(business.balance_ugx as any || "0").toLocaleString()}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refill_credits" className="text-sm font-semibold text-foreground">Credits to Add</Label>
              <div className="relative">
                <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="refill_credits"
                  type="number"
                  placeholder="e.g. 1000"
                  required
                  min="1"
                  value={creditsToAdd}
                  onChange={(e) => setCreditsToAdd(e.target.value)}
                  className="pl-10 bg-background border-border text-foreground font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refill_reason" className="text-sm font-semibold text-foreground">Reason (Audit Log)</Label>
              <Select value={refillReason} onValueChange={(v) => v && setRefillReason(v)}>
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-border text-foreground">
                  <SelectItem value="Cash Deposit Received">Cash Deposit Received</SelectItem>
                  <SelectItem value="System Compensation">System Compensation</SelectItem>
                  <SelectItem value="Promotional Credits">Promotional Credits</SelectItem>
                  <SelectItem value="Upgrade Bonus">Upgrade Bonus</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="flex justify-between sm:justify-between pt-2">
              <Button type="button" variant="outline" onClick={() => { setIsRefillModalOpen(false); setCreditsToAdd(""); setRefillReason("Cash Deposit Received"); }} className="border-border text-muted-foreground">
                Cancel
              </Button>
              <Button type="submit" disabled={isRefilling} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {isRefilling ? <><RefreshCw className="h-4 w-4 animate-spin mr-2" /> Processing...</> : <><Plus className="h-4 w-4 mr-2" /> Add Credits</>}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

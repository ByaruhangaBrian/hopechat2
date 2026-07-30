"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Building2,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Eye,
  ShieldAlert,
  Pencil,
  Trash2,
  Coins,
  Plus,
  ArrowUpDown,
  RefreshCw,
  Zap,
  Users,
  CreditCard,
  CoinsIcon,
  Search,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { BusinessForm } from "@/components/admin/business-form";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";

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

interface Business {
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

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);

  // Delete modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [businessToDelete, setBusinessToDelete] = useState<Business | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Feature toggle modal
  const [isToggleModalOpen, setIsToggleModalOpen] = useState(false);
  const [toggleData, setToggleData] = useState<{ businessId: string, feature: string, currentValue: boolean } | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  // Tier change modal
  const [isTierModalOpen, setIsTierModalOpen] = useState(false);
  const [tierChangeData, setTierChangeData] = useState<{ business: Business; newTierId: string } | null>(null);
  const [isChangingTier, setIsChangingTier] = useState(false);

  // Credit refill modal
  const [isRefillModalOpen, setIsRefillModalOpen] = useState(false);
  const [refillBusiness, setRefillBusiness] = useState<Business | null>(null);
  const [creditsToAdd, setCreditsToAdd] = useState("");
  const [refillReason, setRefillReason] = useState("Cash Deposit Received");
  const [isRefilling, setIsRefilling] = useState(false);

  // Search/filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tierFilter, setTierFilter] = useState<string>("all");

  const supabase = createClient();

  async function fetchBusinesses() {
    setLoading(true);
    const { data, error } = await supabase
      .from("businesses")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch businesses");
    } else {
      setBusinesses(data || []);
    }
    setLoading(false);
  }

  async function fetchTiers() {
    const { data, error } = await supabase
      .from("subscription_tiers")
      .select("*")
      .order("price_ugx", { ascending: true });

    if (!error) {
      setTiers(data || []);
    }
  }

  useEffect(() => {
    fetchBusinesses();
    fetchTiers();
  }, [supabase]);

  function getTierForBusiness(biz: Business): SubscriptionTier | undefined {
    return tiers.find(t => t.id === biz.tier_id);
  }

  function getTierBadgeColor(tierId: string | undefined) {
    switch (tierId) {
      case "bronze": return "bg-amber-600/10 text-amber-600 border-amber-600/20";
      case "silver": return "bg-slate-400/10 text-slate-500 border-slate-400/20";
      case "gold": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      default: return "bg-muted text-muted-foreground border-border";
    }
  }

  async function toggleFeature(businessId: string, feature: string, currentValue: boolean) {
    const biz = businesses.find(b => b.id === businessId);
    if (!biz) return;

    if (currentValue) {
      setToggleData({ businessId, feature, currentValue });
      setIsToggleModalOpen(true);
      return;
    }

    await executeToggle(businessId, feature, currentValue);
  }

  async function executeToggle(businessId: string, feature: string, currentValue: boolean) {
    setIsToggling(true);
    const biz = businesses.find(b => b.id === businessId);
    const newFeatures = { ...biz?.features, [feature]: !currentValue };

    const { error } = await supabase
      .from("businesses")
      .update({ features: newFeatures })
      .eq("id", businessId);

    if (error) {
      toast.error("Failed to update feature");
    } else {
      toast.success("Feature updated");
      setBusinesses(prev => prev.map(b => b.id === businessId ? { ...b, features: newFeatures } : b));
    }
    setIsToggling(false);
    setIsToggleModalOpen(false);
  }

  async function deleteBusiness(businessId: string) {
    setIsDeleting(true);
    const { error } = await supabase
      .from("businesses")
      .delete()
      .eq("id", businessId);

    if (error) {
      toast.error("Failed to delete business");
    } else {
      toast.success("Business deleted successfully");
      setBusinesses(prev => prev.filter(b => b.id !== businessId));
    }
    setIsDeleting(false);
    setIsDeleteModalOpen(false);
  }

  async function updateStatus(businessId: string, newStatus: string) {
    const { error } = await supabase
      .from("businesses")
      .update({ status: newStatus })
      .eq("id", businessId);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success("Status updated to " + newStatus);
      setBusinesses(prev => prev.map(b => b.id === businessId ? { ...b, status: newStatus } : b));
    }
  }

  async function changeTier(businessId: string, newTierId: string) {
    setIsChangingTier(true);
    const newTier = tiers.find(t => t.id === newTierId);

    const { error } = await supabase
      .from("businesses")
      .update({
        tier_id: newTierId,
        plan_tier: newTierId,
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
          pipelines_enabled: true,
        }
      })
      .eq("id", businessId);

    if (error) {
      toast.error("Failed to change tier");
    } else {
      toast.success(`Tier changed to ${newTier?.name || newTierId}`);
      setBusinesses(prev => prev.map(b => b.id === businessId ? {
        ...b,
        tier_id: newTierId,
        plan_tier: newTierId,
        features: {
          ai_enabled: true,
          broadcasts_enabled: newTier?.allow_broadcasts ?? false,
          flows_enabled: newTier?.allow_flows ?? false,
          multimodal_enabled: newTier?.allow_multimodal ?? false,
          automations_enabled: true,
        }
      } : b));
    }
    setIsChangingTier(false);
    setIsTierModalOpen(false);
    setTierChangeData(null);
  }

  async function handleManualRefill(e: React.FormEvent) {
    e.preventDefault();
    if (!refillBusiness) return;

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
          businessId: refillBusiness.id,
          creditsToAdd: credits,
          reason: refillReason
        })
      });

      const responseData = await res.json();
      if (!res.ok) throw new Error(responseData.error || "Manual top-up failed");

      toast.success(`Successfully added ${credits} credits to ${refillBusiness.name}`);
      setIsRefillModalOpen(false);
      setRefillBusiness(null);
      setCreditsToAdd("");
      setRefillReason("Cash Deposit Received");
      fetchBusinesses();
    } catch (err: any) {
      toast.error(err.message || "Failed to execute manual refill");
    } finally {
      setIsRefilling(false);
    }
  }

  async function handleFormSubmit(data: any) {
    if (editingBusiness) {
      const { error } = await supabase
        .from("businesses")
        .update(data)
        .eq("id", editingBusiness.id);

      if (error) {
        toast.error("Failed to update business");
        throw error;
      }
      toast.success("Business updated");
      setBusinesses(prev => prev.map(b => b.id === editingBusiness.id ? { ...b, ...data } : b));
    } else {
      const response = await fetch("/api/admin/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to onboard business");
      
      toast.success("Business and owner account created successfully");
      fetchBusinesses();
    }
  }

  const impersonate = async (businessId: string, businessName: string) => {
    let logId: string | null = null;
    try {
      const res = await fetch("/api/admin/impersonation-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, businessName, action: "start" }),
      });
      const data = await res.json();
      logId = data.log_id || null;
    } catch (err) {
      console.error("Failed to log impersonation:", err);
    }
    document.cookie = `impersonated_business_id=${businessId}; path=/; max-age=3600; SameSite=Lax`;
    document.cookie = `impersonated_business_name=${encodeURIComponent(businessName)}; path=/; max-age=3600; SameSite=Lax`;
    if (logId) {
      document.cookie = `impersonation_log_id=${logId}; path=/; max-age=3600; SameSite=Lax`;
    }
    toast.success(`Impersonating ${businessName}`);
    setTimeout(() => { window.location.href = "/dashboard"; }, 500);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20">Active</Badge>;
      case "trialing": return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20">Trial</Badge>;
      case "past_due": return <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20">Past Due</Badge>;
      case "canceled": return <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20">Canceled</Badge>;
      default: return <Badge variant="outline" className="text-muted-foreground border-border">{status}</Badge>;
    }
  };

  // Summary stats
  const totalCredits = businesses.reduce((sum, b) => sum + (b.credits_remaining || 0), 0);
  const totalBalance = businesses.reduce((sum, b) => sum + parseFloat(b.balance_ugx as any || "0"), 0);
  const activeCount = businesses.filter(b => b.status === "active").length;

  // Filtered businesses
  const filteredBusinesses = businesses.filter(biz => {
    const matchesSearch = !search || 
      biz.name.toLowerCase().includes(search.toLowerCase()) ||
      biz.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || biz.status === statusFilter;
    const matchesTier = tierFilter === "all" || biz.tier_id === tierFilter;
    return matchesSearch && matchesStatus && matchesTier;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Businesses</h1>
          <p className="text-muted-foreground">Manage tenants, subscriptions, and credits.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-border text-muted-foreground" onClick={() => { fetchBusinesses(); fetchTiers(); }} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => { setEditingBusiness(null); setIsFormOpen(true); }}>
            New Business
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Total Businesses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{businesses.length}</div>
            <p className="text-xs text-muted-foreground/60">{activeCount} active</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Coins className="h-4 w-4" />
              Total Credits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalCredits.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground/60">Across all businesses</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Total Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">UGX {totalBalance.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground/60">Combined UGX balance</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Active Tiers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {tiers.map(t => {
                const count = businesses.filter(b => b.tier_id === t.id).length;
                return (
                  <Badge key={t.id} variant="outline" className={cn("text-xs border-border", getTierBadgeColor(t.id))}>
                    {t.name}: {count}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border text-foreground"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "all")}>
          <SelectTrigger className="w-[140px] bg-card border-border text-foreground">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border text-foreground">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="trialing">Trialing</SelectItem>
            <SelectItem value="past_due">Past Due</SelectItem>
            <SelectItem value="canceled">Canceled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tierFilter} onValueChange={(v) => setTierFilter(v || "all")}>
          <SelectTrigger className="w-[140px] bg-card border-border text-foreground">
            <SelectValue placeholder="All Tiers" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border text-foreground">
            <SelectItem value="all">All Tiers</SelectItem>
            {tiers.map(t => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(search || statusFilter !== "all" || tierFilter !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStatusFilter("all"); setTierFilter("all"); }} className="text-xs text-muted-foreground">
            Clear filters
          </Button>
        )}
      </div>

      {/* Businesses Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="text-muted-foreground">Business Name</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
              <TableHead className="text-muted-foreground">Tier</TableHead>
              <TableHead className="text-muted-foreground">Credits</TableHead>
              <TableHead className="text-muted-foreground">Balance (UGX)</TableHead>
              <TableHead className="text-muted-foreground">Features</TableHead>
              <TableHead className="text-muted-foreground text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Loading businesses...
                </TableCell>
              </TableRow>
            ) : filteredBusinesses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  {search || statusFilter !== "all" || tierFilter !== "all" ? "No businesses match your filters." : "No businesses found."}
                </TableCell>
              </TableRow>
            ) : (
              filteredBusinesses.map((biz) => {
                const tier = getTierForBusiness(biz);
                return (
                  <TableRow key={biz.id} className="border-border hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{biz.name}</div>
                          <div className="text-xs text-muted-foreground/60">ID: {biz.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(biz.status)}</TableCell>
                    <TableCell>
                      <button
                        onClick={() => { setTierChangeData({ business: biz, newTierId: biz.tier_id || "bronze" }); setIsTierModalOpen(true); }}
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold transition-colors hover:opacity-80 cursor-pointer border",
                          getTierBadgeColor(biz.tier_id)
                        )}
                      >
                        <Zap className="h-3 w-3" />
                        {tier?.name || biz.tier_id || biz.plan_tier}
                      </button>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <Coins className="h-3 w-3" />
                        {(biz.credits_remaining || 0).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-foreground">
                      UGX {parseFloat(biz.balance_ugx as any || "0").toLocaleString(undefined, { minimumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(biz.features || {}).slice(0, 3).map(([feature, enabled]) => (
                          <button
                            key={feature}
                            onClick={() => toggleFeature(biz.id, feature, enabled)}
                            className={cn(
                              "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors",
                              enabled
                                ? "bg-primary/10 text-primary hover:bg-primary/20"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            )}
                          >
                            {enabled ? <CheckCircle2 className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
                            {feature.replace('_enabled', '')}
                          </button>
                        ))}
                        {Object.keys(biz.features || {}).length > 3 && (
                          <span className="text-[10px] text-muted-foreground/60 px-1">+{Object.keys(biz.features).length - 3}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none transition-colors"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-border text-foreground min-w-48">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-muted" />
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => window.location.href = `/admin/businesses/${biz.id}`}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Intelligence
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => { setEditingBusiness(biz); setIsFormOpen(true); }}
                              className="cursor-pointer"
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => { setTierChangeData({ business: biz, newTierId: biz.tier_id || "bronze" }); setIsTierModalOpen(true); }}
                              className="cursor-pointer"
                            >
                              <Zap className="mr-2 h-4 w-4" />
                              Change Tier
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => { setRefillBusiness(biz); setIsRefillModalOpen(true); }}
                              className="cursor-pointer"
                            >
                              <Coins className="mr-2 h-4 w-4" />
                              Manual Credit Refill
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => impersonate(biz.id, biz.name)}
                              className="cursor-pointer"
                            >
                              <ShieldAlert className="mr-2 h-4 w-4" />
                              Login as Tenant
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                          
                          <DropdownMenuSeparator className="bg-muted" />
                          
                          <DropdownMenuGroup>
                            {biz.status !== 'active' && (
                              <DropdownMenuItem onClick={() => updateStatus(biz.id, 'active')} className="cursor-pointer">
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Mark as Active
                              </DropdownMenuItem>
                            )}
                            {biz.status !== 'past_due' && (
                              <DropdownMenuItem onClick={() => updateStatus(biz.id, 'past_due')} className="cursor-pointer">
                                <ShieldAlert className="mr-2 h-4 w-4" />
                                Mark as Past Due
                              </DropdownMenuItem>
                            )}
                            {biz.status !== 'canceled' && (
                              <DropdownMenuItem onClick={() => updateStatus(biz.id, 'canceled')} className="cursor-pointer text-red-500">
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancel Subscription
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuGroup>
                          
                          <DropdownMenuSeparator className="bg-muted" />
                          
                          <DropdownMenuGroup>
                            <DropdownMenuItem 
                              variant="destructive"
                              onClick={() => { setBusinessToDelete(biz); setIsDeleteModalOpen(true); }}
                              className="cursor-pointer"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Business
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Business Form */}
      <BusinessForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        initialData={editingBusiness ? {
          name: editingBusiness.name,
          status: editingBusiness.status,
          tier_id: editingBusiness.tier_id,
        } : undefined}
        tiers={tiers}
        title={editingBusiness ? "Edit Business" : "Create Business"}
        description={editingBusiness ? "Update tenant configuration." : "Provision a new tenant environment."}
      />

      {/* Tier Change Modal */}
      <Dialog open={isTierModalOpen} onOpenChange={setIsTierModalOpen}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Change Subscription Tier
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Update the subscription tier for <strong>{tierChangeData?.business.name}</strong>. This will update features and quotas immediately.
            </DialogDescription>
          </DialogHeader>

          {tierChangeData && (
            <div className="space-y-4 py-2">
              <div className="grid gap-3">
                {tiers.map((tier) => {
                  const isSelected = tierChangeData.newTierId === tier.id;
                  return (
                    <button
                      key={tier.id}
                      onClick={() => setTierChangeData({ ...tierChangeData, newTierId: tier.id })}
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
                            tier.id === "bronze" ? "bg-amber-600" : tier.id === "silver" ? "bg-slate-400" : "bg-yellow-500"
                          )} />
                          <span className="font-bold text-foreground">{tier.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isSelected && <CheckCircle2 className="h-5 w-5 text-primary" />}
                          <span className="text-sm font-bold text-primary">UGX {tier.price_ugx.toLocaleString()}/mo</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                        <div>
                          <span className="font-semibold text-foreground">{tier.base_credits_monthly.toLocaleString()}</span> credits/mo
                        </div>
                        <div>
                          <span className="font-semibold text-foreground">{tier.max_team_seats}</span> seats
                        </div>
                        <div className="flex gap-1">
                          {tier.allow_broadcasts && <Badge variant="outline" className="text-[9px] border-border">Broadcasts</Badge>}
                          {tier.allow_flows && <Badge variant="outline" className="text-[9px] border-border">Flows</Badge>}
                          {tier.allow_multimodal && <Badge variant="outline" className="text-[9px] border-border">Multimodal</Badge>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Current vs New comparison */}
              {tierChangeData.newTierId !== tierChangeData.business.tier_id && (
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    Changing from <strong>{tiers.find(t => t.id === tierChangeData.business.tier_id)?.name || tierChangeData.business.tier_id}</strong> to <strong>{tiers.find(t => t.id === tierChangeData.newTierId)?.name}</strong>
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex justify-between sm:justify-between">
            <Button variant="outline" onClick={() => setIsTierModalOpen(false)} className="border-border text-muted-foreground">
              Cancel
            </Button>
            <Button
              onClick={() => tierChangeData && changeTier(tierChangeData.business.id, tierChangeData.newTierId)}
              disabled={isChangingTier || tierChangeData?.newTierId === tierChangeData?.business.tier_id}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isChangingTier ? (
                <><RefreshCw className="h-4 w-4 animate-spin mr-2" /> Changing...</>
              ) : (
                <><Zap className="h-4 w-4 mr-2" /> Change Tier</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Credit Refill Modal */}
      <Dialog open={isRefillModalOpen} onOpenChange={setIsRefillModalOpen}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              Manual Credit Refill
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Manually add credits to <strong>{refillBusiness?.name}</strong>. This creates an audit trail entry.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleManualRefill} className="space-y-4 py-2">
            {refillBusiness && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{refillBusiness.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Current: {(refillBusiness.credits_remaining || 0).toLocaleString()} credits | UGX {parseFloat(refillBusiness.balance_ugx as any || "0").toLocaleString()}
                  </p>
                </div>
              </div>
            )}

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
              <Button type="button" variant="outline" onClick={() => { setIsRefillModalOpen(false); setRefillBusiness(null); setCreditsToAdd(""); }} className="border-border text-muted-foreground">
                Cancel
              </Button>
              <Button type="submit" disabled={isRefilling} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {isRefilling ? (
                  <><RefreshCw className="h-4 w-4 animate-spin mr-2" /> Processing...</>
                ) : (
                  <><Plus className="h-4 w-4 mr-2" /> Add Credits</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmationModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        title="Delete Business"
        description={`Are you sure you want to permanently delete ${businessToDelete?.name}? This action cannot be undone and will remove all users, contacts, messages, and associated data.`}
        confirmText="Delete Business"
        onConfirm={() => businessToDelete && deleteBusiness(businessToDelete.id)}
        variant="destructive"
        loading={isDeleting}
      />

      {/* Feature Toggle Confirmation */}
      <ConfirmationModal
        open={isToggleModalOpen}
        onOpenChange={setIsToggleModalOpen}
        title="Disable Feature"
        description={`Are you sure you want to disable ${toggleData?.feature.replace('_enabled', '')} for this business?`}
        confirmText="Disable"
        onConfirm={() => toggleData && executeToggle(toggleData.businessId, toggleData.feature, toggleData.currentValue)}
        loading={isToggling}
      />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Building2,
  Coins,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  CoinsIcon,
  CreditCard,
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Business {
  id: string;
  name: string;
  status: string;
  tier_id: string;
  credits_remaining: number;
  balance_ugx: number;
  created_at: string;
  whatsapp_config: any;
}

export default function TenantsDirectoryPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const isSuperAdmin = 
    user?.app_metadata?.is_superadmin === true || 
    profile?.is_superadmin === true || 
    user?.user_metadata?.role === "super_admin";

  useEffect(() => {
    if (!authLoading && isSuperAdmin) {
      fetchBusinesses();
    }
  }, [authLoading, isSuperAdmin]);

  async function fetchBusinesses() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select(`
          id,
          name,
          status,
          tier_id,
          credits_remaining,
          balance_ugx,
          created_at,
          whatsapp_config (
            phone_number_id,
            status
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBusinesses((data || []) as any);
    } catch (err: any) {
      console.error("Error fetching tenants:", err);
      toast.error("Failed to load active tenants directory");
    } finally {
      setLoading(false);
    }
  }

  const getWhatsAppNumber = (biz: Business) => {
    if (!biz.whatsapp_config) return "Not Configured";
    if (Array.isArray(biz.whatsapp_config)) {
      return biz.whatsapp_config[0]?.phone_number_id || "Not Configured";
    }
    return biz.whatsapp_config.phone_number_id || "Not Configured";
  };

  const getWhatsAppStatus = (biz: Business) => {
    if (!biz.whatsapp_config) return null;
    if (Array.isArray(biz.whatsapp_config)) {
      return biz.whatsapp_config[0]?.status || null;
    }
    return biz.whatsapp_config.status || null;
  };

  const getTierBadgeColor = (tierId: string | undefined) => {
    switch (tierId) {
      case "bronze": return "bg-amber-600/10 text-amber-600 border-amber-600/20";
      case "silver": return "bg-slate-400/10 text-slate-500 border-slate-400/20";
      case "gold": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">Active</Badge>;
      case "trialing": return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px]">Trial</Badge>;
      case "past_due": return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px]">Past Due</Badge>;
      case "canceled": return <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[10px]">Canceled</Badge>;
      default: return <Badge variant="outline" className="text-muted-foreground border-border text-[10px]">{status}</Badge>;
    }
  };

  // Auth Loading State
  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Checking access credentials...</p>
        </div>
      </div>
    );
  }

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

  const totalCredits = businesses.reduce((sum, b) => sum + (b.credits_remaining || 0), 0);
  const totalBalance = businesses.reduce((sum, b) => sum + parseFloat(b.balance_ugx as any || "0"), 0);
  const activeCount = businesses.filter(b => b.status === "active").length;
  const connectedWA = businesses.filter(b => getWhatsAppStatus(b) === "connected").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Tenant Directory</h1>
          <p className="text-muted-foreground text-sm">
            Read-only overview of all registered tenants. For tier changes and credit refills, use the <strong>Businesses</strong> page.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchBusinesses} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> Total Tenants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{businesses.length}</div>
            <p className="text-xs text-muted-foreground/60">{activeCount} active</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5" /> Total Credits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalCredits.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground/60">across all tenants</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" /> Total Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">UGX {totalBalance.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground/60">combined UGX</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <CoinsIcon className="h-3.5 w-3.5" /> WA Connected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{connectedWA} <span className="text-sm font-normal text-muted-foreground">/ {businesses.length}</span></div>
            <p className="text-xs text-muted-foreground/60">WhatsApp configured</p>
          </CardContent>
        </Card>
      </div>

      {/* Tenant Directory Table */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            All Tenants
          </CardTitle>
          <CardDescription>
            Directory of all registered businesses with credit balances and WhatsApp status.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50 border-b border-border">
                <TableRow>
                  <TableHead className="font-semibold text-foreground text-sm">Business Name</TableHead>
                  <TableHead className="font-semibold text-foreground text-sm">Status</TableHead>
                  <TableHead className="font-semibold text-foreground text-sm">Tier</TableHead>
                  <TableHead className="font-semibold text-foreground text-sm">WhatsApp</TableHead>
                  <TableHead className="font-semibold text-foreground text-sm">Credits</TableHead>
                  <TableHead className="font-semibold text-foreground text-sm">Balance (UGX)</TableHead>
                  <TableHead className="font-semibold text-foreground text-sm text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Loading directory...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : businesses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                      No registered businesses found.
                    </TableCell>
                  </TableRow>
                ) : (
                  businesses.map((biz) => (
                    <TableRow key={biz.id} className="hover:bg-muted/30 transition-colors border-b border-border/50">
                      <TableCell className="font-medium text-foreground py-4 text-sm">{biz.name}</TableCell>
                      <TableCell>{getStatusBadge(biz.status)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[10px] border-border capitalize", getTierBadgeColor(biz.tier_id))}>
                          {biz.tier_id || "bronze"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{getWhatsAppNumber(biz)}</TableCell>
                      <TableCell className="text-sm">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          <Coins className="h-3.5 w-3.5" />
                          {(biz.credits_remaining || 0).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-foreground">
                        UGX {parseFloat(biz.balance_ugx as any).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell className="text-right py-4">
                        <Button
                          onClick={() => router.push(`/admin/businesses/${biz.id}`)}
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

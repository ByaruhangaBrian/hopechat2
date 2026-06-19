"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  Building2,
  Coins,
  Key,
  ShieldCheck,
  Plus,
  ArrowUpDown,
  RefreshCw,
  Sliders,
  CheckCircle,
  HelpCircle
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Business {
  id: string;
  name: string;
  credits_remaining: number;
  balance_ugx: number;
  created_at: string;
  whatsapp_config: any;
}

export default function TenantsDashboardPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  // Manual Top-up Modal
  const [selectedBiz, setSelectedBiz] = useState<Business | null>(null);
  const [creditsToAdd, setCreditsToAdd] = useState("");
  const [reason, setReason] = useState("Cash Deposit Received");
  const [submittingTopup, setSubmittingTopup] = useState(false);

  const supabase = createClient();

  // 1. Authorization check
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

  // Gateway Settings functions removed (moved to system settings)

  async function handleManualTopup(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBiz) return;
    
    const credits = parseInt(creditsToAdd, 10);
    if (isNaN(credits) || credits <= 0) {
      toast.error("Please enter a valid positive credits count");
      return;
    }

    setSubmittingTopup(true);
    try {
      const res = await fetch("/api/admin/manual-topup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          businessId: selectedBiz.id,
          creditsToAdd: credits,
          reason
        })
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.error || "Manual top-up request failed");
      }

      toast.success(`Successfully added ${credits} credits to ${selectedBiz.name}`);
      setSelectedBiz(null);
      setCreditsToAdd("");
      setReason("Cash Deposit Received");
      // Refresh directory list
      fetchBusinesses();
    } catch (err: any) {
      console.error("Topup execution error:", err);
      toast.error(err.message || "Failed to execute manual refill");
    } finally {
      setSubmittingTopup(false);
    }
  }

  const getWhatsAppNumber = (biz: Business) => {
    if (!biz.whatsapp_config) return "Not Configured";
    if (Array.isArray(biz.whatsapp_config)) {
      return biz.whatsapp_config[0]?.phone_number_id || "Not Configured";
    }
    return biz.whatsapp_config.phone_number_id || "Not Configured";
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

  // 403 Forbidden Access Screen
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Super Admin Center</h1>
          <p className="text-muted-foreground text-sm">
            Manage system tenants and adjust service credits manually.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchBusinesses} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh Directory
          </Button>
        </div>
      </div>

      {/* TENANTS DIRECTORY */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Active System Tenants
            </CardTitle>
            <CardDescription>
              Ledger tracking of message credits, UGX balances, and WhatsApp phone number configurations.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50 border-b border-border">
                  <TableRow>
                    <TableHead className="font-semibold text-foreground text-sm">Business Name</TableHead>
                    <TableHead className="font-semibold text-foreground text-sm">WhatsApp ID</TableHead>
                    <TableHead className="font-semibold text-foreground text-sm">Credits Balance</TableHead>
                    <TableHead className="font-semibold text-foreground text-sm">Monetary Balance (UGX)</TableHead>
                    <TableHead className="font-semibold text-foreground text-sm text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Loading active directory...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : businesses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                        No registered businesses found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    businesses.map((biz) => (
                      <TableRow key={biz.id} className="hover:bg-muted/30 transition-colors border-b border-border/50">
                        <TableCell className="font-medium text-foreground py-4 text-sm">{biz.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{getWhatsAppNumber(biz)}</TableCell>
                        <TableCell className="text-sm">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            <Coins className="h-3.5 w-3.5" />
                            {biz.credits_remaining.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-foreground">
                          UGX {parseFloat(biz.balance_ugx as any).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right py-4">
                          <Button
                            onClick={() => setSelectedBiz(biz)}
                            variant="outline"
                            size="sm"
                            className="bg-primary/5 border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground gap-1.5"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Manual Refill
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


      {/* RENDER ACCESSIBLE MODAL OVERLAY FOR TOPUP */}
      {selectedBiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-all">
          <div className="relative w-full max-w-md rounded-xl bg-card border border-border shadow-2xl p-6 transform transition-all animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2 mb-2">
              <Coins className="h-5 w-5 text-primary" />
              Manual Refill Ledger
            </h3>
            <p className="text-xs text-muted-foreground mb-6">
              Manually increment service credits for <strong className="text-foreground">{selectedBiz.name}</strong>.
            </p>

            <form onSubmit={handleManualTopup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="credits_to_add" className="text-sm font-semibold text-foreground">
                  Credits to Add
                </Label>
                <Input
                  id="credits_to_add"
                  type="number"
                  placeholder="e.g. 1000"
                  required
                  value={creditsToAdd}
                  onChange={(e) => setCreditsToAdd(e.target.value)}
                  className="bg-background border-border text-foreground text-lg font-semibold"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="refill_reason" className="text-sm font-semibold text-foreground">
                  Refill Reason (Audit Audit Log)
                </Label>
                <select
                  id="refill_reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="Cash Deposit Received">Cash Deposit Received</option>
                  <option value="System Compensation">System Compensation</option>
                  <option value="Promotional Credits">Promotional Credits</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-border/50 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedBiz(null)}
                  disabled={submittingTopup}
                  className="border-border text-foreground hover:bg-muted"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submittingTopup} className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  {submittingTopup ? "Processing Refill..." : "Confirm Deposit"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BusinessForm } from "@/components/admin/business-form";

interface Business {
  id: string;
  name: string;
  status: string;
  plan_tier: string;
  created_at: string;
  features: Record<string, boolean>;
}

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
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

  useEffect(() => {
    fetchBusinesses();
  }, [supabase]);

  async function toggleFeature(businessId: string, feature: string, currentValue: boolean) {
    const biz = businesses.find(b => b.id === businessId);
    if (!biz) return;

    if (currentValue && !confirm(`Are you sure you want to disable ${feature.replace('_enabled', '')} for ${biz.name}?`)) {
      return;
    }

    const newFeatures = { ...biz.features, [feature]: !currentValue };

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
  }

  async function deleteBusiness(businessId: string) {
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
      // Use the onboarding API for new businesses
      const response = await fetch("/api/admin/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to onboard business");
      }
      
      toast.success("Business and owner account created successfully");
      fetchBusinesses(); // Refresh the list
    }
  }

  const impersonate = (businessId: string, businessName: string) => {
    // Set cookies for impersonation that middleware/hooks/database can read
    document.cookie = `impersonated_business_id=${businessId}; path=/; max-age=3600; SameSite=Lax`;
    document.cookie = `impersonated_business_name=${encodeURIComponent(businessName)}; path=/; max-age=3600; SameSite=Lax`;
    
    toast.success(`Impersonating ${businessName}`);
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 500);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20">Active</Badge>;
      case "trialing":
        return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20">Trial</Badge>;
      case "past_due":
        return <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20">Past Due</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground border-border">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Businesses</h1>
          <p className="text-muted-foreground">Manage tenants and their subscription features.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-border text-muted-foreground" onClick={fetchBusinesses} disabled={loading}>
            Refresh
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => {
            setEditingBusiness(null);
            setIsFormOpen(true);
          }}>
            New Business
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="text-muted-foreground">Business Name</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
              <TableHead className="text-muted-foreground">Plan</TableHead>
              <TableHead className="text-muted-foreground">Features</TableHead>
              <TableHead className="text-muted-foreground text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Loading businesses...
                </TableCell>
              </TableRow>
            ) : businesses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No businesses found.
                </TableCell>
              </TableRow>
            ) : (
              businesses.map((biz) => (
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
                    <span className="capitalize text-muted-foreground text-sm">{biz.plan_tier}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(biz.features || {}).map(([feature, enabled]) => (
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
                            onClick={() => {
                              setEditingBusiness(biz);
                              setIsFormOpen(true);
                            }}
                            className="cursor-pointer"
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit Settings
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
                        </DropdownMenuGroup>
                        
                        <DropdownMenuSeparator className="bg-muted" />
                        
                        <DropdownMenuGroup>
                          <DropdownMenuItem 
                            variant="destructive"
                            onClick={() => {
                              if (confirm(`Permanently delete ${biz.name}?`)) {
                                deleteBusiness(biz.id);
                              }
                            }}
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
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <BusinessForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        initialData={editingBusiness ? {
          name: editingBusiness.name,
          status: editingBusiness.status,
          plan_tier: editingBusiness.plan_tier,
        } : undefined}
        title={editingBusiness ? "Edit Business" : "Create Business"}
        description={editingBusiness ? "Update tenant configuration." : "Provision a new tenant environment."}
      />
    </div>
  );
}


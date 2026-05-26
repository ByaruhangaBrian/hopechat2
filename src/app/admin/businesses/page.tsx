"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Building2,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Settings,
  ShieldAlert,
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
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20">Active</Badge>;
      case "trialing":
        return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20">Trial</Badge>;
      case "past_due":
        return <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20">Past Due</Badge>;
      default:
        return <Badge className="bg-slate-500/10 text-slate-500 hover:bg-slate-500/20 border-slate-500/20">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Businesses</h1>
          <p className="text-slate-400">Manage tenants and their subscription features.</p>
        </div>
        <Button variant="outline" className="border-slate-800" onClick={fetchBusinesses} disabled={loading}>
          Refresh
        </Button>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-800/50">
            <TableRow className="hover:bg-transparent border-slate-800">
              <TableHead className="text-slate-300">Business Name</TableHead>
              <TableHead className="text-slate-300">Status</TableHead>
              <TableHead className="text-slate-300">Plan</TableHead>
              <TableHead className="text-slate-300">Features</TableHead>
              <TableHead className="text-slate-300 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                  Loading businesses...
                </TableCell>
              </TableRow>
            ) : businesses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                  No businesses found.
                </TableCell>
              </TableRow>
            ) : (
              businesses.map((biz) => (
                <TableRow key={biz.id} className="border-slate-800 hover:bg-slate-800/30">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-800">
                        <Building2 className="h-4 w-4 text-violet-500" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-200">{biz.name}</div>
                        <div className="text-xs text-slate-500">ID: {biz.id.slice(0, 8)}...</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(biz.status)}</TableCell>
                  <TableCell>
                    <span className="capitalize text-slate-300 text-sm">{biz.plan_tier}</span>
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
                              ? "bg-violet-500/10 text-violet-400 hover:bg-violet-500/20" 
                              : "bg-slate-800 text-slate-500 hover:bg-slate-700"
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
                        render={
                          <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-800">
                            <MoreVertical className="h-4 w-4 text-slate-400" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-200">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-slate-800" />
                        <DropdownMenuItem className="focus:bg-slate-800 focus:text-white cursor-pointer">
                          <Settings className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem className="focus:bg-slate-800 focus:text-white cursor-pointer">
                          <ShieldAlert className="mr-2 h-4 w-4" />
                          Login as Tenant
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

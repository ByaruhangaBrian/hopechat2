"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Radio,
  RefreshCw,
  Search,
  Filter,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Users,
  BarChart3,
  Eye,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Broadcast {
  id: string;
  business_id: string;
  business_name: string;
  broadcast_name: string;
  template_name: string;
  status: string;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  replied_count: number;
  failed_count: number;
  delivery_rate: number;
  created_at: string;
}

interface Business {
  id: string;
  name: string;
}

const STATUS_CONFIG: Record<string, { label: string; classes: string; pulse?: boolean }> = {
  draft: { label: "Draft", classes: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  scheduled: { label: "Scheduled", classes: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  sending: { label: "Sending", classes: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", pulse: true },
  sent: { label: "Sent", classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  failed: { label: "Failed", classes: "bg-red-500/10 text-red-400 border-red-500/20" },
};

export default function BroadcastMonitorPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessFilter, setBusinessFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const supabase = createClient();

  async function fetchData() {
    setLoading(true);
    try {
      const { data: bizData } = await supabase.from("businesses").select("id, name").order("name");
      setBusinesses(bizData || []);

      // Fetch broadcasts with business names
      let query = supabase
        .from("broadcasts")
        .select("*, business:businesses(name)")
        .order("created_at", { ascending: false })
        .limit(200);

      if (businessFilter !== "all") query = query.eq("business_id", businessFilter);
      if (statusFilter !== "all") query = query.eq("status", statusFilter);

      const { data, error } = await query;
      if (error) throw error;

      const formatted = (data || []).map((b: any) => ({
        ...b,
        business_name: b.business?.name || "Unknown",
        delivery_rate: b.total_recipients > 0 ? Math.round((b.sent_count / b.total_recipients) * 100) : 0,
      }));

      setBroadcasts(formatted);
    } catch (err) {
      toast.error("Failed to load broadcast data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [businessFilter, statusFilter]);

  const filteredBroadcasts = broadcasts.filter(b =>
    !search ||
    b.broadcast_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.template_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.business_name?.toLowerCase().includes(search.toLowerCase())
  );

  // Summary stats
  const totalBroadcasts = broadcasts.length;
  const totalRecipients = broadcasts.reduce((sum, b) => sum + (b.total_recipients || 0), 0);
  const totalSent = broadcasts.reduce((sum, b) => sum + (b.sent_count || 0), 0);
  const totalDelivered = broadcasts.reduce((sum, b) => sum + (b.delivered_count || 0), 0);
  const overallDeliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;
  const activeSending = broadcasts.filter(b => b.status === "sending").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Radio className="h-6 w-6" />
            Broadcast Monitor
          </h1>
          <p className="text-muted-foreground">Monitor broadcast campaigns across all businesses.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="border-border text-muted-foreground gap-1.5">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Broadcasts</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-foreground">{totalBroadcasts}</div></CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Recipients</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-foreground">{totalRecipients.toLocaleString()}</div></CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Delivered</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-emerald-500">{totalDelivered.toLocaleString()}</div></CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Delivery Rate</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-primary">{overallDeliveryRate}%</div></CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Active Now</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-yellow-500">{activeSending}</div></CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search broadcasts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border text-foreground"
          />
        </div>
        <Select value={businessFilter} onValueChange={(v) => setBusinessFilter(v || "all")}>
          <SelectTrigger className="w-[200px] bg-card border-border text-foreground">
            <Building2 className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Businesses" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border text-foreground">
            <SelectItem value="all">All Businesses</SelectItem>
            {businesses.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "all")}>
          <SelectTrigger className="w-[150px] bg-card border-border text-foreground">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border text-foreground">
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Broadcasts Table */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-muted-foreground">Business</TableHead>
                <TableHead className="text-muted-foreground">Broadcast</TableHead>
                <TableHead className="text-muted-foreground">Template</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Recipients</TableHead>
                <TableHead className="text-muted-foreground">Delivery</TableHead>
                <TableHead className="text-muted-foreground">Failed</TableHead>
                <TableHead className="text-muted-foreground">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Loading broadcasts...
                  </TableCell>
                </TableRow>
              ) : filteredBroadcasts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No broadcasts found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredBroadcasts.map((bcast) => {
                  const statusConfig = STATUS_CONFIG[bcast.status] || STATUS_CONFIG.draft;
                  return (
                    <TableRow key={bcast.id} className="border-border hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">{bcast.business_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-foreground">{bcast.broadcast_name || "Unnamed"}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] border-border">{bcast.template_name}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("text-[10px]", statusConfig.classes, statusConfig.pulse && "animate-pulse")}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-foreground font-mono">{bcast.total_recipients.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${bcast.delivery_rate}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{bcast.delivery_rate}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {bcast.failed_count > 0 ? (
                          <span className="text-sm font-bold text-red-500">{bcast.failed_count}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground/60 whitespace-nowrap">
                        {format(new Date(bcast.created_at), "MMM d, HH:mm")}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

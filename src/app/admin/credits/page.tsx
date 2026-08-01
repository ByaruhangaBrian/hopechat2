"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Coins,
  RefreshCw,
  Search,
  Filter,
  Zap,
  Building2,
  TrendingDown,
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

type CreditAction = "ai_chat" | "interactive_form" | "bulk_broadcast" | "sms";

interface CreditUsageLog {
  id: string;
  business_id: string;
  action: CreditAction;
  credits_used: number;
  description: string | null;
  reference_id: string | null;
  created_at: string;
  business: { name: string } | null;
}

interface UsageByBusiness {
  business_id: string;
  business_name: string;
  calls: number;
  ai_chat: number;
  interactive_form: number;
  bulk_broadcast: number;
  sms: number;
  total_credits: number;
  last_used: string | null;
}

const ACTION_LABELS: Record<string, string> = {
  ai_chat: "AI Chat Response",
  interactive_form: "Interactive Form / Flow",
  bulk_broadcast: "Bulk Broadcast",
  sms: "SMS Broadcast",
};

export default function AdminCreditsPage() {
  const [logs, setLogs] = useState<CreditUsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessFilter, setBusinessFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("30d");
  const supabase = createClient();

  async function fetchLogs() {
    setLoading(true);
    try {
      const days = timeRange === "24h" ? 1 : timeRange === "7d" ? 7 : 30;
      const since = subDays(new Date(), days).toISOString();

      let query = supabase
        .from("credit_usage_logs")
        .select("*, business:businesses(name)")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1000);

      if (businessFilter !== "all") query = query.eq("business_id", businessFilter);
      if (actionFilter !== "all") query = query.eq("action", actionFilter);

      const { data, error } = await query;
      if (error) throw error;
      setLogs((data || []) as CreditUsageLog[]);
    } catch {
      toast.error("Failed to load credit usage data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessFilter, actionFilter, timeRange]);

  const stats = useMemo(() => {
    const totalCredits = logs.reduce((sum, l) => sum + (l.credits_used || 0), 0);
    const businesses = new Set(logs.map((l) => l.business_id));
    const byAction = logs.reduce(
      (acc, l) => {
        if (!acc[l.action]) acc[l.action] = 0;
        acc[l.action] += l.credits_used || 0;
        return acc;
      },
      {} as Record<string, number>,
    );
    const topAction = Object.entries(byAction).sort((a, b) => b[1] - a[1])[0];
    return { totalCredits, businessCount: businesses.size, topAction, byAction };
  }, [logs]);

  const byBusiness = useMemo<UsageByBusiness[]>(() => {
    const map = new Map<string, UsageByBusiness>();
    for (const log of logs) {
      const row = map.get(log.business_id) ?? {
        business_id: log.business_id,
        business_name: log.business?.name || "Unknown",
        calls: 0,
        ai_chat: 0,
        interactive_form: 0,
        bulk_broadcast: 0,
        sms: 0,
        total_credits: 0,
        last_used: null,
      };
      row.calls++;
      row[log.action] += log.credits_used || 0;
      row.total_credits += log.credits_used || 0;
      if (!row.last_used || log.created_at > row.last_used) row.last_used = log.created_at;
      map.set(log.business_id, row);
    }
    return [...map.values()].sort((a, b) => b.total_credits - a.total_credits);
  }, [logs]);

  const filteredByBusiness = byBusiness.filter((b) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return b.business_name.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Coins className="h-6 w-6" />
            Credit Usage
          </h1>
          <p className="text-muted-foreground">
            Monitor credit consumption across all businesses.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading} className="border-border text-muted-foreground gap-1.5">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Credits Used</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary tabular-nums">{stats.totalCredits.toLocaleString()}</div>
            <p className="text-[11px] text-muted-foreground">across selected period</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Active Businesses</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.businessCount.toLocaleString()}</div>
            <p className="text-[11px] text-muted-foreground">consumed credits in period</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Top Action</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground truncate">
              {stats.topAction ? (ACTION_LABELS[stats.topAction[0]] ?? stats.topAction[0]) : "—"}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {stats.topAction ? `${stats.topAction[1].toLocaleString()} credits` : "no activity"}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Events</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{logs.length.toLocaleString()}</div>
            <p className="text-[11px] text-muted-foreground">deduction events</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-lg border border-border bg-card p-1">
          {(["24h", "7d", "30d"] as const).map((range) => (
            <Button key={range} variant={timeRange === range ? "secondary" : "ghost"} size="sm" onClick={() => setTimeRange(range)} className="h-8 text-xs px-3">
              {range === "24h" ? "24 Hours" : range === "7d" ? "7 Days" : "30 Days"}
            </Button>
          ))}
        </div>
        <Select value={businessFilter} onValueChange={(v) => setBusinessFilter(v || "all")}>
          <SelectTrigger className="w-[200px] bg-card border-border text-foreground">
            <Building2 className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Businesses" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border text-foreground">
            <SelectItem value="all">All Businesses</SelectItem>
            {byBusiness.map((b) => (
              <SelectItem key={b.business_id} value={b.business_id}>{b.business_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={(v) => setActionFilter(v || "all")}>
          <SelectTrigger className="w-[180px] bg-card border-border text-foreground">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border text-foreground">
            <SelectItem value="all">All Actions</SelectItem>
            {Object.entries(ACTION_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search business..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-[200px] pl-9 bg-card border-border text-foreground"
          />
        </div>
      </div>

      {/* Top Businesses */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Top Businesses by Credit Usage</CardTitle>
          <CardDescription className="text-muted-foreground/60">
            Businesses consuming the most credits in the selected period.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-muted-foreground">Rank</TableHead>
                <TableHead className="text-muted-foreground">Business</TableHead>
                <TableHead className="text-muted-foreground text-right">AI Chat</TableHead>
                <TableHead className="text-muted-foreground text-right">Forms / Flows</TableHead>
                <TableHead className="text-muted-foreground text-right">Broadcasts</TableHead>
                <TableHead className="text-muted-foreground text-right">SMS</TableHead>
                <TableHead className="text-muted-foreground text-right">Total Credits</TableHead>
                <TableHead className="text-muted-foreground">Last Used</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredByBusiness.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No credit usage for the selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredByBusiness.slice(0, 20).map((b, i) => (
                  <TableRow key={b.business_id} className="border-border hover:bg-muted/30">
                    <TableCell className="text-sm font-bold text-primary tabular-nums">#{i + 1}</TableCell>
                    <TableCell className="text-sm font-medium text-foreground">{b.business_name}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{b.ai_chat}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{b.interactive_form}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{b.bulk_broadcast}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{b.sms}</TableCell>
                    <TableCell className="text-right text-sm font-bold text-primary">{b.total_credits.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-muted-foreground/60 whitespace-nowrap">
                      {b.last_used ? format(new Date(b.last_used), "MMM d, HH:mm") : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Usage */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Recent Deductions</CardTitle>
          <CardDescription className="text-muted-foreground/60">
            Showing latest {Math.min(logs.length, 100)} entries.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-muted-foreground">Time</TableHead>
                <TableHead className="text-muted-foreground">Business</TableHead>
                <TableHead className="text-muted-foreground">Action</TableHead>
                <TableHead className="text-muted-foreground">Description</TableHead>
                <TableHead className="text-muted-foreground text-right">Credits</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Loading...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <TrendingDown className="h-5 w-5" />
                      No credit usage data found.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                logs.slice(0, 100).map((log) => (
                  <TableRow key={log.id} className="border-border hover:bg-muted/30">
                    <TableCell className="text-xs text-muted-foreground/60 font-mono whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(log.created_at), "MMM d, HH:mm")}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-foreground">{log.business?.name || "Unknown"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] border-border">
                        {ACTION_LABELS[log.action] || log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[260px] truncate">
                      {log.description || "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm font-bold text-red-500">
                      -{log.credits_used}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        <Zap className="h-4 w-4 mt-0.5 shrink-0" />
        <p>
          Usage is recorded in <code className="font-mono">credit_usage_logs</code> whenever credits are consumed
          (AI chat replies, interactive forms/flows, and bulk broadcasts). The balance shown to businesses comes from
          <code className="font-mono"> businesses.credits_remaining</code>.
        </p>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Cpu,
  BarChart3,
  RefreshCw,
  Search,
  Filter,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  Coins,
  Building2,
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

interface AIUsageLog {
  id: string;
  business_id: string;
  model: string;
  action: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  latency_ms: number;
  credits_used: number;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

interface Business {
  id: string;
  name: string;
}

interface UsageByBusiness {
  business_id: string;
  business_name: string;
  total_calls: number;
  total_tokens: number;
  total_credits: number;
  avg_latency: number;
  success_rate: number;
}

const ACTION_LABELS: Record<string, string> = {
  chat_response: "Chat Response",
  image_analysis: "Image Analysis",
  voice_transcription: "Voice Transcription",
  document_summary: "Document Summary",
  flow_execution: "Flow Execution",
};

export default function AIUsagePage() {
  const [logs, setLogs] = useState<AIUsageLog[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessFilter, setBusinessFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("7d");
  const supabase = createClient();

  async function fetchBusinesses() {
    const { data } = await supabase.from("businesses").select("id, name").order("name");
    setBusinesses(data || []);
  }

  async function fetchLogs() {
    setLoading(true);
    try {
      const days = timeRange === "24h" ? 1 : timeRange === "7d" ? 7 : 30;
      const since = subDays(new Date(), days).toISOString();

      let query = supabase
        .from("ai_usage_logs")
        .select("*")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500);

      if (businessFilter !== "all") query = query.eq("business_id", businessFilter);
      if (actionFilter !== "all") query = query.eq("action", actionFilter);

      const { data, error } = await query;
      if (error) throw error;
      setLogs(data || []);
    } catch (err: any) {
      toast.error("Failed to load AI usage data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBusinesses();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [businessFilter, actionFilter, timeRange]);

  // Compute stats
  const totalCalls = logs.length;
  const totalTokens = logs.reduce((sum, l) => sum + (l.total_tokens || 0), 0);
  const totalCredits = logs.reduce((sum, l) => sum + (l.credits_used || 0), 0);
  const successRate = totalCalls > 0 ? (logs.filter(l => l.success).length / totalCalls) * 100 : 0;
  const avgLatency = totalCalls > 0 ? logs.reduce((sum, l) => sum + (l.latency_ms || 0), 0) / totalCalls : 0;
  const estimatedCost = totalTokens * 0.000001; // rough estimate

  // Group by business
  const byBusiness: UsageByBusiness[] = businesses.map(biz => {
    const bizLogs = logs.filter(l => l.business_id === biz.id);
    return {
      business_id: biz.id,
      business_name: biz.name,
      total_calls: bizLogs.length,
      total_tokens: bizLogs.reduce((sum, l) => sum + (l.total_tokens || 0), 0),
      total_credits: bizLogs.reduce((sum, l) => sum + (l.credits_used || 0), 0),
      avg_latency: bizLogs.length > 0 ? bizLogs.reduce((sum, l) => sum + (l.latency_ms || 0), 0) / bizLogs.length : 0,
      success_rate: bizLogs.length > 0 ? (bizLogs.filter(l => l.success).length / bizLogs.length) * 100 : 0,
    };
  }).filter(b => b.total_calls > 0).sort((a, b) => b.total_calls - a.total_calls);

  // Group by action
  const byAction = Object.entries(
    logs.reduce((acc, l) => {
      if (!acc[l.action]) acc[l.action] = { count: 0, tokens: 0, credits: 0 };
      acc[l.action].count++;
      acc[l.action].tokens += l.total_tokens || 0;
      acc[l.action].credits += l.credits_used || 0;
      return acc;
    }, {} as Record<string, { count: number; tokens: number; credits: number }>)
  ).sort((a, b) => b[1].count - a[1].count);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Cpu className="h-6 w-6" />
            AI Usage Analytics
          </h1>
          <p className="text-muted-foreground">Monitor Gemini AI usage across all businesses.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading} className="border-border text-muted-foreground gap-1.5">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Calls</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalCalls.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Tokens</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalTokens.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Credits Used</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{totalCredits.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Success Rate</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{successRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Avg Latency</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{(avgLatency / 1000).toFixed(1)}s</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-lg border border-border bg-card p-1">
          {(["24h", "7d", "30d"] as const).map(range => (
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
            {businesses.map(b => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
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
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* By Business */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Usage by Business</CardTitle>
          </CardHeader>
          <CardContent>
            {byBusiness.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No data for selected filters.</p>
            ) : (
              <div className="space-y-3">
                {byBusiness.slice(0, 10).map(b => (
                  <div key={b.business_id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div>
                      <span className="text-sm font-medium text-foreground">{b.business_name}</span>
                      <p className="text-[10px] text-muted-foreground">{b.total_calls} calls • {b.total_tokens.toLocaleString()} tokens</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-primary">{b.total_credits}</span>
                      <p className="text-[10px] text-muted-foreground">credits</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* By Action */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Usage by Action</CardTitle>
          </CardHeader>
          <CardContent>
            {byAction.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No data for selected filters.</p>
            ) : (
              <div className="space-y-3">
                {byAction.map(([action, data]) => (
                  <div key={action} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <div>
                      <span className="text-sm font-medium text-foreground">{ACTION_LABELS[action] || action}</span>
                      <p className="text-[10px] text-muted-foreground">{data.tokens.toLocaleString()} tokens</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs border-border">{data.count} calls</Badge>
                      <span className="text-sm font-bold text-primary">{data.credits}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Logs */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Recent AI Calls</CardTitle>
          <CardDescription className="text-muted-foreground/60">Showing latest {Math.min(logs.length, 50)} entries.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-muted-foreground">Time</TableHead>
                <TableHead className="text-muted-foreground">Action</TableHead>
                <TableHead className="text-muted-foreground">Tokens</TableHead>
                <TableHead className="text-muted-foreground">Latency</TableHead>
                <TableHead className="text-muted-foreground">Credits</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Loading...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No AI usage data found.</TableCell>
                </TableRow>
              ) : (
                logs.slice(0, 50).map((log) => (
                  <TableRow key={log.id} className="border-border hover:bg-muted/30">
                    <TableCell className="text-xs text-muted-foreground/60 font-mono whitespace-nowrap">
                      {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] border-border">{ACTION_LABELS[log.action] || log.action}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-foreground font-mono">
                      {(log.total_tokens || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-foreground">
                      {log.latency_ms ? `${(log.latency_ms / 1000).toFixed(1)}s` : "—"}
                    </TableCell>
                    <TableCell className="text-sm font-bold text-primary">{log.credits_used}</TableCell>
                    <TableCell>
                      {log.success ? (
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Success
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[10px]">
                          <XCircle className="h-3 w-3 mr-1" /> Failed
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

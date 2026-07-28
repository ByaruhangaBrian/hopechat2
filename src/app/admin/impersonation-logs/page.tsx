"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Shield,
  User,
  Building2,
  Clock,
  RefreshCw,
  Search,
  Globe,
  Monitor,
  LogOut,
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

interface ImpersonationLog {
  id: string;
  admin_user_id: string;
  admin_email: string;
  business_id: string;
  business_name: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  ip_address: string;
  user_agent: string;
}

export default function ImpersonationLogsPage() {
  const [logs, setLogs] = useState<ImpersonationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const supabase = createClient();

  async function fetchLogs() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/impersonation-log?limit=100");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLogs(data.logs || []);
    } catch (err: any) {
      toast.error("Failed to load impersonation logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => 
    !search || 
    log.admin_email?.toLowerCase().includes(search.toLowerCase()) ||
    log.business_name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalSessions = logs.length;
  const activeSessions = logs.filter(l => !l.ended_at).length;
  const avgDuration = logs.filter(l => l.duration_seconds).reduce((sum, l) => sum + (l.duration_seconds || 0), 0) / (logs.filter(l => l.duration_seconds).length || 1);

  function formatDuration(seconds: number | null) {
    if (!seconds) return "—";
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return `${mins}m ${secs}s`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m`;
  }

  function getBrowser(ua: string) {
    if (!ua) return "Unknown";
    if (ua.includes("Chrome")) return "Chrome";
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Safari")) return "Safari";
    if (ua.includes("Edge")) return "Edge";
    return "Other";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Impersonation Logs
          </h1>
          <p className="text-muted-foreground">Audit trail of all admin impersonation sessions.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading} className="border-border text-muted-foreground gap-1.5">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalSessions}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Now</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{activeSessions}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatDuration(Math.round(avgDuration))}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by admin email or business name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-card border-border text-foreground"
        />
      </div>

      {/* Table */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-muted-foreground">Admin</TableHead>
                <TableHead className="text-muted-foreground">Business</TableHead>
                <TableHead className="text-muted-foreground">Started</TableHead>
                <TableHead className="text-muted-foreground">Duration</TableHead>
                <TableHead className="text-muted-foreground">Browser</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Loading logs...
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No impersonation sessions found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id} className="border-border hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                          <User className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="text-sm font-medium text-foreground">{log.admin_email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm text-foreground">{log.business_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="text-xs text-foreground">{format(new Date(log.started_at), "MMM d, HH:mm")}</span>
                        <p className="text-[10px] text-muted-foreground/60">{formatDistanceToNow(new Date(log.started_at), { addSuffix: true })}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-foreground font-mono">{formatDuration(log.duration_seconds)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Monitor className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{getBrowser(log.user_agent)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.ended_at ? (
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">
                          <LogOut className="h-3 w-3 mr-1" />
                          Ended
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px] animate-pulse">
                          Active
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

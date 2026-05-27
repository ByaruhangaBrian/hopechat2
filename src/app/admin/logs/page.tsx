"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import {
  FileCode,
  Search,
  ChevronDown,
  Clock,
  ShieldCheck,
  Activity as ActivityIcon,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LogEntry {
  id: string;
  business_id: string;
  user_id?: string;
  direction: string;
  service: string;
  endpoint: string;
  status_code: number;
  created_at: string;
  payload: any;
  note: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [timeRange, setTimeRange] = useState<"1d" | "7d">("7d");
  const supabase = createClient();

  async function fetchLogs() {
    setLoading(true);
    
    let query = supabase
      .from("http_logs")
      .select("*")
      .order("created_at", { ascending: false });

    // Time filtering
    const days = timeRange === "1d" ? 1 : 7;
    const since = subDays(new Date(), days).toISOString();
    query = query.gte("created_at", since);

    if (search) {
      query = query.or(`service.ilike.%${search}%,endpoint.ilike.%${search}%,note.ilike.%${search}%`);
    }

    const { data, error } = await query.limit(100);

    if (error) {
      toast.error("Failed to fetch logs");
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchLogs();
  }, [supabase, timeRange]);

  const getServiceIcon = (service: string) => {
    switch (service) {
      case 'auth': return <ShieldCheck className="h-4 w-4 text-violet-400" />;
      case 'system': return <ActivityIcon className="h-4 w-4 text-blue-400" />;
      case 'whatsapp': return <FileCode className="h-4 w-4 text-emerald-400" />;
      default: return <FileCode className="h-4 w-4 text-slate-400" />;
    }
  };

  const getStatusBadge = (code: number) => {
    if (!code) return <Badge variant="outline" className="text-slate-500 border-slate-800">N/A</Badge>;
    if (code >= 200 && code < 300) return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">{code}</Badge>;
    if (code >= 400) return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">{code}</Badge>;
    return <Badge variant="outline">{code}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">System Logs</h1>
          <p className="text-slate-400">Monitor all platform activity including auth, messages, and system events.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900 p-1">
            <Button
              variant={timeRange === "1d" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setTimeRange("1d")}
              className="h-8 text-xs px-3"
            >
              24 Hours
            </Button>
            <Button
              variant={timeRange === "7d" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setTimeRange("7d")}
              className="h-8 text-xs px-3"
            >
              7 Days
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
              className="w-full sm:w-64 border-slate-800 bg-slate-900 pl-9 text-slate-200"
            />
          </div>
          <Button variant="outline" className="border-slate-800" onClick={fetchLogs} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-800/50">
            <TableRow className="hover:bg-transparent border-slate-800">
              <TableHead className="text-slate-300 w-[160px]">Timestamp</TableHead>
              <TableHead className="text-slate-300">Tenant/User</TableHead>
              <TableHead className="text-slate-300">Event</TableHead>
              <TableHead className="text-slate-300">Activity</TableHead>
              <TableHead className="text-slate-300">Status</TableHead>
              <TableHead className="text-slate-300 text-right">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="h-4 w-4 animate-spin" />
                    Crunching log data...
                  </div>
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                  No activity found in the selected time range.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id} className="border-slate-800 hover:bg-slate-800/30 group">
                  <TableCell className="text-slate-400 text-[10px] font-mono">
                    {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-mono text-slate-500">B: {log.business_id?.slice(0, 6) || "SYS"}</span>
                      {log.user_id && <span className="text-[10px] font-mono text-slate-600">U: {log.user_id.slice(0, 6)}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getServiceIcon(log.service)}
                      <span className="text-xs uppercase font-bold text-slate-400">{log.service}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-200">{log.note?.replace(/_/g, ' ') || log.endpoint}</span>
                      <span className="text-[10px] text-slate-500 font-mono truncate max-w-[150px]">{log.endpoint}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(log.status_code)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 group-hover:bg-slate-800" onClick={() => {
                       console.log("Log Detail:", log.payload);
                       toast.info("Payload logged to console for inspection");
                    }}>
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    </Button>
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

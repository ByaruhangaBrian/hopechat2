"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  FileCode,
  ArrowRight,
  ArrowLeft,
  Search,
  ChevronDown,
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
  const supabase = createClient();

  async function fetchLogs() {
    setLoading(true);
    let query = supabase
      .from("http_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (search) {
      query = query.or(`service.ilike.%${search}%,endpoint.ilike.%${search}%,note.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Failed to fetch logs");
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchLogs();
  }, [supabase]);

  const getStatusBadge = (code: number) => {
    if (!code) return <Badge variant="outline" className="text-slate-500 border-slate-800">N/A</Badge>;
    if (code >= 200 && code < 300) return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">{code}</Badge>;
    if (code >= 400) return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">{code}</Badge>;
    return <Badge variant="outline">{code}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">System Logs</h1>
          <p className="text-slate-400">Monitor incoming and outgoing HTTP events across all tenants.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
              className="w-64 border-slate-800 bg-slate-900 pl-9 text-slate-200"
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
              <TableHead className="text-slate-300 w-[180px]">Timestamp</TableHead>
              <TableHead className="text-slate-300">Tenant</TableHead>
              <TableHead className="text-slate-300">Direction</TableHead>
              <TableHead className="text-slate-300">Service/Endpoint</TableHead>
              <TableHead className="text-slate-300">Status</TableHead>
              <TableHead className="text-slate-300 text-right">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                  Loading logs...
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                  No logs found.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id} className="border-slate-800 hover:bg-slate-800/30 group">
                  <TableCell className="text-slate-400 text-xs font-mono">
                    {format(new Date(log.created_at), "MMM d, HH:mm:ss.SSS")}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-mono text-slate-500">{log.business_id?.slice(0, 8) || "System"}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {log.direction === "incoming" ? (
                        <ArrowRight className="h-3 w-3 text-blue-400" />
                      ) : (
                        <ArrowLeft className="h-3 w-3 text-amber-400" />
                      )}
                      <span className="text-xs uppercase font-semibold text-slate-400">{log.direction}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-200 capitalize">{log.service}</span>
                      <span className="text-xs text-slate-500 truncate max-w-[200px]">{log.endpoint}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(log.status_code)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 group-hover:bg-slate-800">
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

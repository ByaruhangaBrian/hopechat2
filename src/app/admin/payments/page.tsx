"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import {
  Coins,
  Search,
  Clock,
  Landmark,
  CreditCard,
  ShieldCheck,
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

interface Transaction {
  id: string;
  business_id: string;
  amount_ugx: number;
  credits_added: number;
  payment_method: string;
  status: string;
  payment_reference: string | null;
  timestamp: string;
}

export default function AdminPaymentsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [timeRange, setTimeRange] = useState<"7d" | "30d">("7d");
  const supabase = createClient();

  async function fetchTransactions() {
    setLoading(true);
    const days = timeRange === "7d" ? 7 : 30;
    const since = subDays(new Date(), days).toISOString();

    let query = supabase
      .from("payment_transactions")
      .select("*")
      .gte("timestamp", since)
      .order("timestamp", { ascending: false });

    if (search) {
      query = query.or(
        `business_id.ilike.%${search}%,payment_reference.ilike.%${search}%,payment_method.ilike.%${search}%`
      );
    }

    const { data, error } = await query.limit(100);

    if (error) {
      toast.error("Failed to fetch transactions");
    } else {
      setTransactions(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchTransactions();
  }, [timeRange]);

  const getMethodIcon = (method: string) => {
    switch (method) {
      case "mobile_money":
        return <Landmark className="h-4 w-4 text-emerald-400" />;
      case "card":
        return <CreditCard className="h-4 w-4 text-blue-400" />;
      case "manual_admin":
        return <ShieldCheck className="h-4 w-4 text-amber-500" />;
      default:
        return <Coins className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "successful":
      case "success":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
            {status}
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">
            pending
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
            failed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalUgx = transactions
    .filter((t) => t.status === "successful" || t.status === "success")
    .reduce((sum, t) => sum + Number(t.amount_ugx), 0);
  const totalCredits = transactions
    .filter((t) => t.status === "successful" || t.status === "success")
    .reduce((sum, t) => sum + t.credits_added, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Payment Transactions
          </h1>
          <p className="text-muted-foreground">
            All payment activity across every business on the platform.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-border bg-card p-1">
            <Button
              variant={timeRange === "7d" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setTimeRange("7d")}
              className="h-8 text-xs px-3"
            >
              7 Days
            </Button>
            <Button
              variant={timeRange === "30d" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setTimeRange("30d")}
              className="h-8 text-xs px-3"
            >
              30 Days
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search ref or business..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchTransactions()}
              className="w-full sm:w-64 border-border bg-card pl-9 text-foreground"
            />
          </div>
          <Button
            variant="outline"
            className="border-border text-muted-foreground"
            onClick={fetchTransactions}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Total Transactions
          </p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {transactions.length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Successful Revenue
          </p>
          <p className="text-2xl font-bold text-foreground mt-1">
            UGX {totalUgx.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Credits Issued
          </p>
          <p className="text-2xl font-bold text-emerald-500 mt-1">
            {totalCredits.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="text-muted-foreground w-[160px]">
                Timestamp
              </TableHead>
              <TableHead className="text-muted-foreground">Tenant</TableHead>
              <TableHead className="text-muted-foreground">Method</TableHead>
              <TableHead className="text-muted-foreground text-right">
                Amount
              </TableHead>
              <TableHead className="text-muted-foreground text-right">
                Credits
              </TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
              <TableHead className="text-muted-foreground">Reference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="h-4 w-4 animate-spin" />
                    Loading transactions...
                  </div>
                </TableCell>
              </TableRow>
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground"
                >
                  No transactions found in the selected time range.
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((tx) => (
                <TableRow
                  key={tx.id}
                  className="border-border hover:bg-muted/30"
                >
                  <TableCell className="text-muted-foreground/60 text-[10px] font-mono">
                    {format(new Date(tx.timestamp), "MMM d, HH:mm:ss")}
                  </TableCell>
                  <TableCell>
                    <span className="text-[10px] font-mono text-muted-foreground/60">
                      {tx.business_id.slice(0, 8)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getMethodIcon(tx.payment_method)}
                      <span className="text-xs capitalize font-medium text-muted-foreground">
                        {tx.payment_method.replace("_", " ")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold text-foreground">
                    UGX {Number(tx.amount_ugx).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium text-emerald-500">
                    +{tx.credits_added.toLocaleString()}
                  </TableCell>
                  <TableCell>{getStatusBadge(tx.status)}</TableCell>
                  <TableCell className="text-[10px] font-mono text-muted-foreground/40 max-w-[140px] truncate">
                    {tx.payment_reference || "—"}
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

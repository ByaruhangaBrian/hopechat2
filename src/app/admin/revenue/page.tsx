"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Coins,
  CreditCard,
  Landmark,
  ShieldCheck,
  DollarSign,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Calendar,
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
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Transaction {
  id: string;
  business_id: string;
  amount_ugx: number;
  credits_added: number;
  payment_method: string;
  status: string;
  payment_reference: string;
  timestamp: string;
}

interface Expense {
  id: string;
  business_id: string | null;
  category: string;
  description: string;
  amount_ugx: number;
  amount_usd: number;
  reference: string | null;
  expense_date: string;
  notes: string | null;
  created_at: string;
}

interface Business {
  id: string;
  name: string;
}

const EXPENSE_CATEGORIES = [
  { value: "server_hosting", label: "Server Hosting" },
  { value: "whatsapp_api", label: "WhatsApp API" },
  { value: "gemini_api", label: "Gemini API" },
  { value: "pesapal_fees", label: "Pesapal Fees" },
  { value: "staff", label: "Staff" },
  { value: "marketing", label: "Marketing" },
  { value: "infrastructure", label: "Infrastructure" },
  { value: "other", label: "Other" },
];

const PAYMENT_METHODS = [
  { value: "mobile_money", label: "Mobile Money" },
  { value: "card", label: "Credit Card" },
  { value: "manual_admin", label: "Manual Admin" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cash", label: "Cash" },
];

export default function RevenueDashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"30d" | "90d" | "all">("30d");
  const supabase = createClient();

  // Expense modal
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    business_id: "",
    category: "server_hosting",
    description: "",
    amount_ugx: "",
    amount_usd: "",
    reference: "",
    expense_date: format(new Date(), "yyyy-MM-dd"),
    notes: "",
  });
  const [savingExpense, setSavingExpense] = useState(false);

  async function fetchData() {
    setLoading(true);
    try {
      const [bizData] = await Promise.all([
        supabase.from("businesses").select("id, name").order("name"),
      ]);
      setBusinesses(bizData.data || []);

      // Fetch transactions
      let txQuery = supabase.from("payment_transactions").select("*").order("timestamp", { ascending: false }).limit(500);
      if (timeRange !== "all") {
        const days = timeRange === "30d" ? 30 : 90;
        txQuery = txQuery.gte("timestamp", subDays(new Date(), days).toISOString());
      }
      const { data: txData } = await txQuery;
      setTransactions(txData || []);

      // Fetch expenses
      let expQuery = supabase.from("business_expenses").select("*").order("expense_date", { ascending: false }).limit(500);
      if (timeRange !== "all") {
        const days = timeRange === "30d" ? 30 : 90;
        expQuery = expQuery.gte("expense_date", format(subDays(new Date(), days), "yyyy-MM-dd"));
      }
      const { data: expData } = await expQuery;
      setExpenses(expData || []);
    } catch (err) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!expenseForm.description || !expenseForm.amount_ugx) {
      toast.error("Description and amount are required");
      return;
    }
    setSavingExpense(true);
    try {
      const res = await fetch("/api/admin/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expenseForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Expense added successfully");
      setIsExpenseModalOpen(false);
      setExpenseForm({ business_id: "", category: "server_hosting", description: "", amount_ugx: "", amount_usd: "", reference: "", expense_date: format(new Date(), "yyyy-MM-dd"), notes: "" });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to add expense");
    } finally {
      setSavingExpense(false);
    }
  }

  async function deleteExpense(id: string) {
    try {
      const res = await fetch(`/api/admin/expenses?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Expense deleted");
      fetchData();
    } catch (err) {
      toast.error("Failed to delete expense");
    }
  }

  // Calculations
  const totalIncome = transactions.filter(t => t.status === "successful" || t.status === "success").reduce((sum, t) => sum + Number(t.amount_ugx), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount_ugx), 0);
  const netProfit = totalIncome - totalExpenses;
  const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

  // Monthly breakdown
  const currentMonth = format(new Date(), "yyyy-MM");
  const monthlyIncome = transactions
    .filter(t => (t.status === "successful" || t.status === "success") && format(new Date(t.timestamp), "yyyy-MM") === currentMonth)
    .reduce((sum, t) => sum + Number(t.amount_ugx), 0);
  const monthlyExpenses = expenses
    .filter(e => format(new Date(e.expense_date), "yyyy-MM") === currentMonth)
    .reduce((sum, e) => sum + Number(e.amount_ugx), 0);

  // By payment method
  const byMethod = transactions
    .filter(t => t.status === "successful" || t.status === "success")
    .reduce((acc, t) => {
      const method = t.payment_method || "unknown";
      if (!acc[method]) acc[method] = { count: 0, total: 0 };
      acc[method].count++;
      acc[method].total += Number(t.amount_ugx);
      return acc;
    }, {} as Record<string, { count: number; total: number }>);

  // By expense category
  const byCategory = expenses.reduce((acc, e) => {
    if (!acc[e.category]) acc[e.category] = { count: 0, total: 0 };
    acc[e.category].count++;
    acc[e.category].total += Number(e.amount_ugx);
    return acc;
  }, {} as Record<string, { count: number; total: number }>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            Revenue & Ledger
          </h1>
          <p className="text-muted-foreground">Track all income, expenses, and platform financial health.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setIsExpenseModalOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5">
            <Plus className="h-4 w-4" />
            Add Expense
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="border-border text-muted-foreground gap-1.5">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5 text-emerald-500" /> Total Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">UGX {totalIncome.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground/60">This period</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5 text-red-500" /> Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">UGX {totalExpenses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground/60">{expenses.length} entries</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-primary" /> Net Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", netProfit >= 0 ? "text-emerald-500" : "text-red-500")}>
              UGX {netProfit.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground/60">{profitMargin.toFixed(1)}% margin</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-blue-500" /> This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-foreground">
              <span className="text-emerald-500 font-bold">+UGX {monthlyIncome.toLocaleString()}</span>
              {" / "}
              <span className="text-red-500 font-bold">-UGX {monthlyExpenses.toLocaleString()}</span>
            </div>
            <p className="text-xs text-muted-foreground/60">Income / Expenses</p>
          </CardContent>
        </Card>
      </div>

      {/* Time Range */}
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-lg border border-border bg-card p-1">
          {(["30d", "90d", "all"] as const).map(range => (
            <Button key={range} variant={timeRange === range ? "secondary" : "ghost"} size="sm" onClick={() => setTimeRange(range)} className="h-8 text-xs px-3">
              {range === "all" ? "All Time" : range === "30d" ? "30 Days" : "90 Days"}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Income by Payment Method */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Income by Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(byMethod).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No income data.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(byMethod).map(([method, data]) => (
                  <div key={method} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      {method === "mobile_money" ? <Landmark className="h-4 w-4 text-emerald-400" /> :
                       method === "card" ? <CreditCard className="h-4 w-4 text-blue-400" /> :
                       <ShieldCheck className="h-4 w-4 text-amber-500" />}
                      <span className="text-sm font-medium text-foreground capitalize">{method.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-foreground">UGX {data.total.toLocaleString()}</span>
                      <p className="text-[10px] text-muted-foreground">{data.count} transactions</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expenses by Category */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(byCategory).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No expenses recorded. Click "Add Expense" to start tracking.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(byCategory).sort((a, b) => b[1].total - a[1].total).map(([cat, data]) => (
                  <div key={cat} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <span className="text-sm font-medium text-foreground capitalize">{cat.replace(/_/g, ' ')}</span>
                    <div className="text-right">
                      <span className="text-sm font-bold text-red-500">UGX {data.total.toLocaleString()}</span>
                      <p className="text-[10px] text-muted-foreground">{data.count} entries</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Expenses */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Recent Expenses</CardTitle>
          <CardDescription className="text-muted-foreground/60">Manually entered platform expenses.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-muted-foreground">Date</TableHead>
                <TableHead className="text-muted-foreground">Category</TableHead>
                <TableHead className="text-muted-foreground">Description</TableHead>
                <TableHead className="text-muted-foreground">Amount (UGX)</TableHead>
                <TableHead className="text-muted-foreground">Reference</TableHead>
                <TableHead className="text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No expenses recorded yet.</TableCell>
                </TableRow>
              ) : (
                expenses.slice(0, 20).map(exp => (
                  <TableRow key={exp.id} className="border-border hover:bg-muted/30">
                    <TableCell className="text-xs text-muted-foreground font-mono">{format(new Date(exp.expense_date), "MMM d")}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] border-border capitalize">{exp.category.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell className="text-sm text-foreground">{exp.description}</TableCell>
                    <TableCell className="text-sm font-bold text-red-500">UGX {Number(exp.amount_ugx).toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-muted-foreground/60 font-mono">{exp.reference || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => deleteExpense(exp.id)} className="text-red-500 hover:text-red-600 hover:bg-red-500/10 h-7">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Expense Modal */}
      <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Add Platform Expense</DialogTitle>
            <DialogDescription className="text-muted-foreground">Record an expense for financial tracking.</DialogDescription>
          </DialogHeader>
          <form onSubmit={addExpense} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Category</Label>
                <Select value={expenseForm.category} onValueChange={(v) => v && setExpenseForm({ ...expenseForm, category: v })}>
                  <SelectTrigger className="bg-background border-border text-foreground"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-background border-border text-foreground">
                    {EXPENSE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Date</Label>
                <Input type="date" value={expenseForm.expense_date} onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })} className="bg-background border-border text-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Description</Label>
              <Input placeholder="e.g. Hostinger VPS monthly" value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} required className="bg-background border-border text-foreground" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Amount (UGX)</Label>
                <Input type="number" placeholder="0" value={expenseForm.amount_ugx} onChange={(e) => setExpenseForm({ ...expenseForm, amount_ugx: e.target.value })} required className="bg-background border-border text-foreground font-mono" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Amount (USD) - optional</Label>
                <Input type="number" placeholder="0" value={expenseForm.amount_usd} onChange={(e) => setExpenseForm({ ...expenseForm, amount_usd: e.target.value })} className="bg-background border-border text-foreground font-mono" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Reference</Label>
                <Input placeholder="Invoice # or tx ref" value={expenseForm.reference} onChange={(e) => setExpenseForm({ ...expenseForm, reference: e.target.value })} className="bg-background border-border text-foreground" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Notes</Label>
                <Input placeholder="Additional notes" value={expenseForm.notes} onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })} className="bg-background border-border text-foreground" />
              </div>
            </div>
            <DialogFooter className="flex justify-between sm:justify-between pt-2">
              <Button type="button" variant="outline" onClick={() => setIsExpenseModalOpen(false)} className="border-border text-muted-foreground">Cancel</Button>
              <Button type="submit" disabled={savingExpense} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {savingExpense ? <><RefreshCw className="h-4 w-4 animate-spin mr-2" /> Saving...</> : <><Plus className="h-4 w-4 mr-2" /> Add Expense</>}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

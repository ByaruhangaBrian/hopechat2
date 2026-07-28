"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Bell,
  BellOff,
  CheckCheck,
  AlertTriangle,
  AlertCircle,
  Info,
  Coins,
  Wifi,
  WifiOff,
  Building2,
  Zap,
  CreditCard,
  BarChart3,
  RefreshCw,
  Filter,
  Settings,
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface Alert {
  id: string;
  alert_type: string;
  business_id: string | null;
  severity: string;
  title: string;
  message: string;
  metadata: any;
  is_read: boolean;
  created_at: string;
}

interface AlertSettings {
  low_credits_threshold: number;
  high_ai_usage_threshold: number;
  quota_exceeded_threshold: number;
  enabled_alerts: string[];
}

const ALERT_TYPES = [
  { value: "low_credits", label: "Low Credits", icon: Coins, color: "text-amber-500" },
  { value: "whatsapp_disconnected", label: "WA Disconnected", icon: WifiOff, color: "text-red-500" },
  { value: "business_status_changed", label: "Status Changed", icon: Building2, color: "text-blue-500" },
  { value: "tier_changed", label: "Tier Changed", icon: Zap, color: "text-purple-500" },
  { value: "payment_failed", label: "Payment Failed", icon: CreditCard, color: "text-red-500" },
  { value: "high_ai_usage", label: "High AI Usage", icon: BarChart3, color: "text-indigo-500" },
  { value: "quota_exceeded", label: "Quota Exceeded", icon: AlertTriangle, color: "text-orange-500" },
];

const SEVERITY_CONFIG = {
  info: { icon: Info, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  warning: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  critical: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20" },
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [settings, setSettings] = useState<AlertSettings>({
    low_credits_threshold: 100,
    high_ai_usage_threshold: 1000,
    quota_exceeded_threshold: 90,
    enabled_alerts: ["low_credits", "whatsapp_disconnected", "business_status_changed", "tier_changed"],
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const supabase = createClient();

  async function fetchAlerts() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (showUnreadOnly) params.set("unread", "true");
      if (filter !== "all") params.set("type", filter);
      params.set("limit", "100");

      const res = await fetch(`/api/admin/alerts?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAlerts(data.alerts || []);
      setUnreadCount(data.unread_count || 0);
    } catch (err: any) {
      toast.error("Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id: string) {
    try {
      await fetch("/api/admin/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_read: true }),
      });
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      toast.error("Failed to mark as read");
    }
  }

  async function markAllRead() {
    try {
      await fetch("/api/admin/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mark_all_read: true }),
      });
      setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
      setUnreadCount(0);
      toast.success("All alerts marked as read");
    } catch (err) {
      toast.error("Failed to mark all as read");
    }
  }

  // Auto-scan for alerts
  async function scanForAlerts() {
    try {
      const { data: businesses } = await supabase
        .from("businesses")
        .select("id, name, credits_remaining, status, tier_id");

      if (!businesses) return;

      for (const biz of businesses) {
        // Low credits alert
        if ((biz.credits_remaining || 0) < settings.low_credits_threshold) {
          const existing = alerts.find(a => 
            a.business_id === biz.id && 
            a.alert_type === "low_credits" && 
            !a.is_read &&
            Date.now() - new Date(a.created_at).getTime() < 86400000
          );
          if (!existing) {
            await fetch("/api/admin/alerts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                alert_type: "low_credits",
                business_id: biz.id,
                severity: (biz.credits_remaining || 0) < 10 ? "critical" : "warning",
                title: `Low credits: ${biz.name}`,
                message: `${biz.name} has only ${(biz.credits_remaining || 0).toLocaleString()} credits remaining (threshold: ${settings.low_credits_threshold})`,
              }),
            });
          }
        }
      }
      fetchAlerts();
    } catch (err) {
      console.error("Alert scan error:", err);
    }
  }

  useEffect(() => {
    fetchAlerts();
  }, [filter, showUnreadOnly]);

  useEffect(() => {
    scanForAlerts();
    const interval = setInterval(scanForAlerts, 300000); // Scan every 5 minutes
    return () => clearInterval(interval);
  }, []);

  function getAlertIcon(type: string) {
    const config = ALERT_TYPES.find(t => t.value === type);
    if (config) return <config.icon className={cn("h-4 w-4", config.color)} />;
    return <Bell className="h-4 w-4 text-muted-foreground" />;
  }

  function getSeverityBadge(severity: string) {
    const config = SEVERITY_CONFIG[severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.info;
    return (
      <Badge className={cn("text-[10px]", config.bg, config.color, config.border)}>
        {severity}
      </Badge>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Automated Alerts
            {unreadCount > 0 && (
              <Badge className="bg-red-500/10 text-red-500 border-red-500/20 ml-2">{unreadCount}</Badge>
            )}
          </h1>
          <p className="text-muted-foreground">Monitor and configure automated system alerts for all businesses.</p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead} className="border-border text-muted-foreground gap-1.5">
              <CheckCheck className="h-4 w-4" />
              Mark All Read
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={fetchAlerts} disabled={loading} className="border-border text-muted-foreground gap-1.5">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{alerts.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unread</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{unreadCount}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{alerts.filter(a => a.severity === "critical" && !a.is_read).length}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Warnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{alerts.filter(a => a.severity === "warning" && !a.is_read).length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filter} onValueChange={(v) => setFilter(v || "all")}>
          <SelectTrigger className="w-[180px] bg-card border-border text-foreground">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border text-foreground">
            <SelectItem value="all">All Types</SelectItem>
            {ALERT_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch
            checked={showUnreadOnly}
            onCheckedChange={setShowUnreadOnly}
          />
          <Label className="text-sm text-muted-foreground">Unread only</Label>
        </div>
      </div>

      {/* Alerts Table */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-muted-foreground w-8"></TableHead>
                <TableHead className="text-muted-foreground">Type</TableHead>
                <TableHead className="text-muted-foreground">Title</TableHead>
                <TableHead className="text-muted-foreground">Severity</TableHead>
                <TableHead className="text-muted-foreground">Time</TableHead>
                <TableHead className="text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Loading alerts...
                  </TableCell>
                </TableRow>
              ) : alerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    <BellOff className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                    No alerts found.
                  </TableCell>
                </TableRow>
              ) : (
                alerts.map((alert) => (
                  <TableRow 
                    key={alert.id} 
                    className={cn(
                      "border-border hover:bg-muted/30 cursor-pointer",
                      !alert.is_read && "bg-primary/5"
                    )}
                    onClick={() => !alert.is_read && markAsRead(alert.id)}
                  >
                    <TableCell>
                      {!alert.is_read && <div className="h-2 w-2 rounded-full bg-primary" />}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getAlertIcon(alert.alert_type)}
                        <span className="text-xs text-muted-foreground capitalize">{alert.alert_type.replace(/_/g, ' ')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className={cn("text-sm font-medium", !alert.is_read ? "text-foreground" : "text-muted-foreground")}>{alert.title}</span>
                        <p className="text-xs text-muted-foreground/60 truncate max-w-[300px]">{alert.message}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground/60 whitespace-nowrap">
                      {format(new Date(alert.created_at), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell className="text-right">
                      {!alert.is_read && (
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); markAsRead(alert.id); }} className="text-xs text-muted-foreground">
                          Mark Read
                        </Button>
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

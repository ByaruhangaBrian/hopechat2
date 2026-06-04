"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  Building2,
  Users,
  MessageSquare,
  Activity,
  ArrowUpRight,
  Settings,
  Cpu,
  Zap,
  TrendingUp,
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    businesses: 0,
    users: 0,
    messages: 0,
    activeToday: 0,
    aiMessages: 0,
  });
  const [topBusinesses, setTopBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchStats() {
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 24);

      const [
        { count: bizCount },
        { count: userCount },
        { count: msgCount },
        { count: activeCount },
        { count: aiCount },
        { data: businesses }
      ] = await Promise.all([
        supabase.from("businesses").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("messages").select("*", { count: "exact", head: true }),
        supabase.from("messages")
          .select("*", { count: "exact", head: true })
          .gt("created_at", yesterday.toISOString()),
        supabase.from("messages")
          .select("*", { count: "exact", head: true })
          .eq("is_ai_response", true),
        supabase.from("businesses").select("id, name, slug, created_at").limit(5).order('created_at', { ascending: false })
      ]);

      setStats({
        businesses: bizCount || 0,
        users: userCount || 0,
        messages: msgCount || 0,
        activeToday: activeCount || 0,
        aiMessages: aiCount || 0,
      });

      setTopBusinesses(businesses || []);
      setLoading(false);
    }
    fetchStats();
  }, [supabase]);

  const aiRatio = stats.messages > 0 ? (stats.aiMessages / stats.messages) * 100 : 0;
  // Placeholder cost: $0.0005 per AI message
  const estimatedAiCost = stats.aiMessages * 0.0005;

  const cards = [
    {
      title: "Total Businesses",
      value: stats.businesses,
      icon: Building2,
      description: "Registered tenants",
      color: "text-primary",
    },
    {
      title: "Active Today",
      value: stats.activeToday,
      icon: Activity,
      description: "Messages in last 24h",
      color: "text-emerald-500",
    },
    {
      title: "AI Automation",
      value: `${aiRatio.toFixed(1)}%`,
      icon: Cpu,
      description: "AI vs Human ratio",
      color: "text-indigo-500",
    },
    {
      title: "Est. AI Cost",
      value: `$${estimatedAiCost.toFixed(2)}`,
      icon: TrendingUp,
      description: "Platform AI spend",
      color: "text-amber-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Overview</h1>
        <p className="text-muted-foreground">System-wide performance and statistics.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title} className="bg-card border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className={cn("h-4 w-4", card.color)} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {loading ? "..." : card.value}
              </div>
              <p className="text-xs text-muted-foreground/60">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-foreground">Recent Businesses</CardTitle>
                <CardDescription>Latest tenants to join the platform.</CardDescription>
              </div>
              <Link href="/admin/businesses" className="text-xs text-primary hover:underline">
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Business</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Joined</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i} className="animate-pulse">
                      <TableCell colSpan={3} className="h-10 bg-muted/20" />
                    </TableRow>
                  ))
                ) : topBusinesses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">No businesses yet</TableCell>
                  </TableRow>
                ) : (
                  topBusinesses.map((biz) => (
                    <TableRow key={biz.id} className="group hover:bg-muted/30">
                      <TableCell>
                        <div className="font-medium text-foreground">{biz.name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{biz.slug}</div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(biz.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 text-[10px]">
                          Active
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-foreground">Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Link 
                href="/admin/businesses"
                className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm text-foreground/80">Manage Businesses</span>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
              <Link 
                href="/admin/settings"
                className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-colors">
                    <Settings className="h-4 w-4 text-indigo-500" />
                  </div>
                  <span className="text-sm text-foreground/80">Platform Credentials</span>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-indigo-500 transition-colors" />
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-foreground text-sm font-semibold">System Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Database</span>
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  Operational
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Webhook Listener</span>
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  Operational
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">AI Processing</span>
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  Operational
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


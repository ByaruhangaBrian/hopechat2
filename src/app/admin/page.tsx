"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Building2,
  Users,
  MessageSquare,
  Activity,
  ArrowUpRight,
  Settings,
} from "lucide-react";
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
  });
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
      ] = await Promise.all([
        supabase.from("businesses").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("messages").select("*", { count: "exact", head: true }),
        supabase.from("messages")
          .select("*", { count: "exact", head: true })
          .gt("created_at", yesterday.toISOString()),
      ]);

      setStats({
        businesses: bizCount || 0,
        users: userCount || 0,
        messages: msgCount || 0,
        activeToday: activeCount || 0,
      });
      setLoading(false);
    }
    fetchStats();
  }, [supabase]);

  const cards = [
    {
      title: "Total Businesses",
      value: stats.businesses,
      icon: Building2,
      description: "Registered tenants",
    },
    {
      title: "Total Users",
      value: stats.users,
      icon: Users,
      description: "Platform-wide members",
    },
    {
      title: "Total Messages",
      value: stats.messages,
      icon: MessageSquare,
      description: "WhatsApp interactions",
    },
    {
      title: "Active Today",
      value: stats.activeToday,
      icon: Activity,
      description: "Messages in last 24h",
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
          <Card key={card.title} className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {loading ? "..." : card.value.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground/60">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Link 
              href="/admin/businesses"
              className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="text-sm text-foreground/80">Review new signups</span>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link 
              href="/admin/settings"
              className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <Settings className="h-4 w-4 text-primary" />
                <span className="text-sm text-foreground/80">Configure global webhooks</span>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">System Health</CardTitle>
            <CardDescription>Real-time status of critical services.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Database</span>
              <span className="flex items-center gap-1.5 text-xs text-emerald-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Operational
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Webhook Listener</span>
              <span className="flex items-center gap-1.5 text-xs text-emerald-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Operational
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">AI Processing</span>
              <span className="flex items-center gap-1.5 text-xs text-emerald-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Operational
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


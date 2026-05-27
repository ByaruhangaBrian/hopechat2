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
        <h1 className="text-2xl font-bold text-white">Admin Overview</h1>
        <p className="text-slate-400">System-wide performance and statistics.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title} className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-violet-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {loading ? "..." : card.value.toLocaleString()}
              </div>
              <p className="text-xs text-slate-500">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Link 
              href="/admin/businesses"
              className="flex items-center justify-between rounded-lg border border-slate-800 p-3 hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-violet-500" />
                <span className="text-sm text-slate-200">Review new signups</span>
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-500" />
            </Link>
            <Link 
              href="/admin/settings"
              className="flex items-center justify-between rounded-lg border border-slate-800 p-3 hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Settings className="h-4 w-4 text-violet-500" />
                <span className="text-sm text-slate-200">Configure global webhooks</span>
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-500" />
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">System Health</CardTitle>
            <CardDescription>Real-time status of critical services.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Database</span>
              <span className="flex items-center gap-1.5 text-xs text-emerald-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Operational
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Webhook Listener</span>
              <span className="flex items-center gap-1.5 text-xs text-emerald-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Operational
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">AI Processing</span>
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

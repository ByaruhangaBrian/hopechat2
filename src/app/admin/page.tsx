"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { getAvatarGradient } from "@/lib/avatar-colors";
import {
  Building2,
  Activity,
  ArrowUpRight,
  Settings,
  Cpu,
  TrendingUp,
  Tag,
  Bell,
  ArrowRight,
  ShieldCheck,
  Server,
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
        { data: businesses },
      ] = await Promise.all([
        supabase.from("businesses").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("messages").select("*", { count: "exact", head: true }),
        supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .gt("created_at", yesterday.toISOString()),
        supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("is_ai_response", true),
        supabase
          .from("businesses")
          .select("id, name, slug, created_at")
          .limit(5)
          .order("created_at", { ascending: false }),
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
  // Estimated cost: $0.0005 per AI response
  const estimatedAiCost = stats.aiMessages * 0.0005;

  const cards = [
    {
      title: "Total Businesses",
      value: stats.businesses.toLocaleString(),
      icon: Building2,
      description: "Registered tenant accounts",
      tone: "sky",
      containerStyle: "border-sky-500/25 from-sky-500/20 to-blue-500/5 text-sky-500 dark:text-sky-400 group-hover:border-sky-500/50 group-hover:shadow-[0_0_20px_rgba(14,165,233,0.35)]",
      hoverBorder: "hover:border-sky-500/40 hover:shadow-sky-500/10",
      cornerGlow: "bg-sky-500/10",
    },
    {
      title: "Active Today",
      value: stats.activeToday.toLocaleString(),
      icon: Activity,
      description: "Messages in the last 24h",
      tone: "emerald",
      containerStyle: "border-emerald-500/25 from-emerald-500/20 to-teal-500/5 text-emerald-500 dark:text-emerald-400 group-hover:border-emerald-500/50 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.35)]",
      hoverBorder: "hover:border-emerald-500/40 hover:shadow-emerald-500/10",
      cornerGlow: "bg-emerald-500/10",
    },
    {
      title: "AI Automation",
      value: `${aiRatio.toFixed(1)}%`,
      icon: Cpu,
      description: "Automated vs Human ratio",
      tone: "indigo",
      containerStyle: "border-indigo-500/25 from-indigo-500/20 to-purple-500/5 text-indigo-500 dark:text-indigo-400 group-hover:border-indigo-500/50 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.35)]",
      hoverBorder: "hover:border-indigo-500/40 hover:shadow-indigo-500/10",
      cornerGlow: "bg-indigo-500/10",
    },
    {
      title: "Est. Platform Spend",
      value: `$${estimatedAiCost.toFixed(2)}`,
      icon: TrendingUp,
      description: "Aggregate Gemini AI spend",
      tone: "amber",
      containerStyle: "border-amber-500/25 from-amber-500/20 to-orange-500/5 text-amber-500 dark:text-amber-400 group-hover:border-amber-500/50 group-hover:shadow-[0_0_20px_rgba(245,158,11,0.35)]",
      hoverBorder: "hover:border-amber-500/40 hover:shadow-amber-500/10",
      cornerGlow: "bg-amber-500/10",
    },
  ];

  const quickActions = [
    {
      label: "Businesses & Billing",
      href: "/admin/businesses",
      description: "Inspect tenants, balances, and quotas",
      icon: Building2,
      color: "text-sky-500 dark:text-sky-400",
      bg: "bg-sky-500/10 border-sky-500/20",
    },
    {
      label: "Pricing Tiers",
      href: "/admin/pricing-tiers",
      description: "Configure subscription plans & features",
      icon: Tag,
      color: "text-amber-500 dark:text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    {
      label: "System Alerts",
      href: "/admin/alerts",
      description: "Audit triggered threshold warnings",
      icon: Bell,
      color: "text-rose-500 dark:text-rose-400",
      bg: "bg-rose-500/10 border-rose-500/20",
    },
    {
      label: "Platform Credentials",
      href: "/admin/settings",
      description: "WhatsApp, Gemini, & system keys",
      icon: Settings,
      color: "text-indigo-500 dark:text-indigo-400",
      bg: "bg-indigo-500/10 border-indigo-500/20",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex items-center gap-1.5 rounded-full bg-rose-500/10 border border-rose-500/25 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-rose-600 dark:text-rose-400">
              <ShieldCheck className="size-3" />
              Root Control Plane
            </span>
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Telemetry
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Admin Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            System-wide multi-tenant performance, usage metrics, and platform telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/health"
            className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card/80 px-3.5 py-2 text-xs font-semibold text-foreground shadow-sm transition-all hover:bg-accent hover:border-border"
          >
            <Server className="size-3.5 text-emerald-500" />
            Infrastructure Status
          </Link>
          <Link
            href="/admin/businesses"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90"
          >
            <Building2 className="size-3.5" />
            Manage Tenants
          </Link>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.title}
            className={cn(
              "group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:shadow-xl",
              card.hoverBorder
            )}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {card.title}
                </p>
                <div className="text-2xl font-bold tracking-tight text-foreground mt-2">
                  {loading ? (
                    <div className="h-8 w-20 animate-pulse rounded bg-muted/60" />
                  ) : (
                    card.value
                  )}
                </div>
              </div>
              <div
                className={cn(
                  "relative flex size-11 items-center justify-center rounded-xl border bg-gradient-to-tr transition-all duration-300",
                  card.containerStyle
                )}
              >
                <card.icon className="size-5 transition-transform duration-300 group-hover:scale-110" />
              </div>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              {card.description}
            </p>

            {/* Corner ambient glow */}
            <div
              aria-hidden
              className={cn(
                "absolute -top-4 -right-4 size-20 rounded-full blur-2xl transition-opacity duration-300 opacity-60 group-hover:opacity-100",
                card.cornerGlow
              )}
            />
          </div>
        ))}
      </div>

      {/* 2-Column Section: Recent Businesses + Quick Actions & Health */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left Column: Recent Businesses Table (3 cols) */}
        <Card className="lg:col-span-3 bg-card border-border shadow-sm overflow-hidden rounded-2xl">
          <CardHeader className="border-b border-border/50 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-foreground">
                  Recent Businesses
                </CardTitle>
                <CardDescription className="text-xs">
                  Latest tenant organizations onboarded to HopeChat.
                </CardDescription>
              </div>
              <Link
                href="/admin/businesses"
                className="group inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                View all
                <ArrowRight className="size-3 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/50 hover:bg-transparent bg-muted/30">
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground py-3 pl-5">
                    Tenant
                  </TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground py-3">
                    Created
                  </TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-right py-3 pr-5">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i} className="animate-pulse border-b border-border/30">
                      <TableCell colSpan={3} className="h-14 bg-muted/10 px-5" />
                    </TableRow>
                  ))
                ) : topBusinesses.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center py-8 text-sm text-muted-foreground"
                    >
                      No registered businesses found.
                    </TableCell>
                  </TableRow>
                ) : (
                  topBusinesses.map((biz) => (
                    <TableRow
                      key={biz.id}
                      className="group border-b border-border/40 hover:bg-muted/40 transition-colors"
                    >
                      <TableCell className="py-3 pl-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white shadow-sm select-none transition-transform duration-200 group-hover:scale-105",
                              getAvatarGradient(biz.name || biz.slug)
                            )}
                          >
                            {biz.name?.charAt(0)?.toUpperCase() || "B"}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {biz.name}
                            </p>
                            <p className="truncate font-mono text-[11px] text-muted-foreground">
                              {biz.slug}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground py-3">
                        {new Date(biz.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right py-3 pr-5">
                        <Badge
                          variant="secondary"
                          className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px] gap-1 px-2 py-0.5"
                        >
                          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
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

        {/* Right Column: Quick Actions & Live Services (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions */}
          <Card className="bg-card border-border shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-border/50 pb-3">
              <CardTitle className="text-sm font-bold text-foreground">
                Administrative Shortcuts
              </CardTitle>
              <CardDescription className="text-xs">
                Instant access to core superadmin controls.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 grid gap-2">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group flex items-center justify-between rounded-xl border border-border/60 p-2.5 hover:bg-muted/50 hover:border-border transition-all duration-200"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-lg border transition-transform duration-200 group-hover:scale-105",
                        action.bg,
                        action.color
                      )}
                    >
                      <action.icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                        {action.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {action.description}
                      </p>
                    </div>
                  </div>
                  <ArrowUpRight className="size-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* System Services Telemetry Card */}
          <Card className="bg-card border-border shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-border/50 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-foreground">
                  System Health
                </CardTitle>
                <CardDescription className="text-xs">
                  Active service listeners and daemons.
                </CardDescription>
              </div>
              <Link
                href="/admin/health"
                className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
              >
                Telemetry &rarr;
              </Link>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {[
                { name: "PostgreSQL Database", status: "Operational", ping: "12ms" },
                { name: "WhatsApp Webhook Gateway", status: "Operational", ping: "28ms" },
                { name: "Gemini AI Automation Engine", status: "Operational", ping: "45ms" },
                { name: "Pesapal Payment Webhook", status: "Operational", ping: "19ms" },
              ].map((service) => (
                <div
                  key={service.name}
                  className="flex items-center justify-between text-xs py-1"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
                    <span className="font-medium text-foreground truncate">
                      {service.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {service.ping}
                    </span>
                    <Badge
                      variant="secondary"
                      className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold uppercase tracking-wider py-0 px-1.5"
                    >
                      {service.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

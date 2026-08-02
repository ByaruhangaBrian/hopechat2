"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarClock, ShieldAlert, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

type SubscriptionStatus = "active" | "grace" | "expired" | "none";

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function parseDateOnly(value: string): number {
  const [y, m, day] = value.split("-").map(Number);
  return new Date(y, m - 1, day).getTime();
}

function daysUntil(ms: number): number {
  return Math.round((ms - startOfDay(new Date())) / 86400000);
}

/**
 * Dashboard-wide subscription status banner. Also performs the lazy
 * expiry-warning email check once per session (no cron/scheduler exists).
 */
export function SubscriptionBanner() {
  const { profile, user } = useAuth();
  const business = profile?.business;

  const status = useMemo<SubscriptionStatus>(() => {
    const subs = business?.subscriptions ?? [];
    if (subs.length === 0) return "none";
    const latest = subs[0];
    const today = startOfDay(new Date());
    const expires = parseDateOnly(latest.expires_on);
    const graceEnds = parseDateOnly(latest.grace_ends_on);
    if (today <= expires) return "active";
    if (today <= graceEnds) return "grace";
    return "expired";
  }, [business?.subscriptions]);

  const latest = business?.subscriptions?.[0];
  const daysLeft = latest ? daysUntil(parseDateOnly(latest.expires_on)) : 0;

  // Lazy expiry-warning email (once per signed-in session, no scheduler).
  useEffect(() => {
    if (!user || !business?.name) return;
    fetch("/api/subscriptions/check-expiry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }).catch(() => {
      // Best-effort only — never break the dashboard over email.
    });
  }, [user, business?.name]);

  if (status === "none") return null;

  if (status === "active" && daysLeft > 7) return null;

  const isGrace = status === "grace";
  const isExpired = status === "expired";

  const Icon = isExpired ? XCircle : isGrace ? ShieldAlert : CalendarClock;
  const accent = isExpired
    ? "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400"
    : isGrace
    ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
    : "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400";

  let title: string;
  let message: string;

  if (isExpired) {
    title = "Your subscription has expired";
    message = "Your plan has lapsed and service is currently suspended. Renew now to reactivate your account.";
  } else if (isGrace) {
    title = "Your subscription has expired — grace period";
    message = `Service continues until ${latest?.grace_ends_on ?? "the end of the grace period"}. Renew before then to avoid suspension.`;
  } else {
    title = "Your subscription is expiring soon";
    message = `Your plan expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"} (${latest?.expires_on ?? ""}). Renew to keep your service active.`;
  }

  return (
    <div className={`flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 ${accent}`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs opacity-80">{message}</p>
        </div>
      </div>
      <Link
        href="/settings?tab=billing"
        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-semibold text-background transition-opacity hover:opacity-90"
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        Renew Now
      </Link>
    </div>
  );
}

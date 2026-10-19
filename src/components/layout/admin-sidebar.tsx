"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { getAvatarGradient } from "@/lib/avatar-colors";
import {
  ShieldCheck,
  Building2,
  FileCode,
  Settings,
  LogOut,
  User,
  X,
  LayoutDashboard,
  ArrowLeft,
  Coins,
  CreditCard,
  Tag,
  Bell,
  Shield,
  Cpu,
  Activity,
  TrendingUp,
  Radio,
  Wallet,
  UserPlus,
  MonitorSmartphone,
  ShieldAlert,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AdminNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
}

interface AdminNavGroup {
  title?: string;
  items: AdminNavItem[];
}

const adminNavGroups: AdminNavGroup[] = [
  {
    items: [
      {
        href: "/admin",
        label: "Admin Overview",
        icon: LayoutDashboard,
        color: "text-indigo-500 dark:text-indigo-400",
        bg: "bg-indigo-500/10 dark:bg-indigo-500/15",
      },
    ],
  },
  {
    title: "Tenants & Billing",
    items: [
      {
        href: "/admin/businesses",
        label: "Businesses & Billing",
        icon: Building2,
        color: "text-sky-500 dark:text-sky-400",
        bg: "bg-sky-500/10 dark:bg-sky-500/15",
      },
      {
        href: "/admin/tenants",
        label: "Tenant Directory",
        icon: Coins,
        color: "text-teal-500 dark:text-teal-400",
        bg: "bg-teal-500/10 dark:bg-teal-500/15",
      },
      {
        href: "/admin/payments",
        label: "Payments",
        icon: CreditCard,
        color: "text-emerald-500 dark:text-emerald-400",
        bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
      },
      {
        href: "/admin/pricing-tiers",
        label: "Pricing Tiers",
        icon: Tag,
        color: "text-amber-500 dark:text-amber-400",
        bg: "bg-amber-500/10 dark:bg-amber-500/15",
      },
      {
        href: "/admin/revenue",
        label: "Revenue & Ledger",
        icon: TrendingUp,
        color: "text-green-500 dark:text-green-400",
        bg: "bg-green-500/10 dark:bg-green-500/15",
      },
    ],
  },
  {
    title: "Operations & Monitoring",
    items: [
      {
        href: "/admin/alerts",
        label: "Alerts",
        icon: Bell,
        color: "text-rose-500 dark:text-rose-400",
        bg: "bg-rose-500/10 dark:bg-rose-500/15",
      },
      {
        href: "/admin/leads",
        label: "Lead Recovery",
        icon: UserPlus,
        color: "text-orange-500 dark:text-orange-400",
        bg: "bg-orange-500/10 dark:bg-orange-500/15",
      },
      {
        href: "/admin/health",
        label: "System Health",
        icon: Activity,
        color: "text-emerald-500 dark:text-emerald-400",
        bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
      },
      {
        href: "/admin/ai-usage",
        label: "AI Usage",
        icon: Cpu,
        color: "text-fuchsia-500 dark:text-fuchsia-400",
        bg: "bg-fuchsia-500/10 dark:bg-fuchsia-500/15",
      },
      {
        href: "/admin/credits",
        label: "Credit Usage",
        icon: Wallet,
        color: "text-violet-500 dark:text-violet-400",
        bg: "bg-violet-500/10 dark:bg-violet-500/15",
      },
      {
        href: "/admin/broadcast-monitor",
        label: "Broadcast Monitor",
        icon: Radio,
        color: "text-blue-500 dark:text-blue-400",
        bg: "bg-blue-500/10 dark:bg-blue-500/15",
      },
    ],
  },
  {
    title: "Security & Audit",
    items: [
      {
        href: "/admin/activity",
        label: "User Sessions",
        icon: MonitorSmartphone,
        color: "text-cyan-500 dark:text-cyan-400",
        bg: "bg-cyan-500/10 dark:bg-cyan-500/15",
      },
      {
        href: "/admin/impersonation-logs",
        label: "Impersonation Logs",
        icon: Shield,
        color: "text-purple-500 dark:text-purple-400",
        bg: "bg-purple-500/10 dark:bg-purple-500/15",
      },
      {
        href: "/admin/logs",
        label: "System Logs",
        icon: FileCode,
        color: "text-slate-500 dark:text-slate-400",
        bg: "bg-slate-500/10 dark:bg-slate-500/15",
      },
      {
        href: "/admin/settings",
        label: "System Settings",
        icon: Settings,
        color: "text-pink-500 dark:text-pink-400",
        bg: "bg-pink-500/10 dark:bg-pink-500/15",
      },
    ],
  },
];

interface AdminSidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function AdminSidebar({ open = false, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();

  const [impersonatedName, setImpersonatedName] = useState<string | null>(null);

  useEffect(() => {
    const cookies = document.cookie.split(";");
    const nameCookie = cookies.find((c) =>
      c.trim().startsWith("impersonated_business_name=")
    );
    if (nameCookie) {
      setImpersonatedName(decodeURIComponent(nameCookie.split("=")[1]));
    }
  }, []);

  const stopImpersonating = async () => {
    const cookies = document.cookie.split(";");
    const idCookie = cookies.find((c) =>
      c.trim().startsWith("impersonated_business_id=")
    );
    const nameCookie = cookies.find((c) =>
      c.trim().startsWith("impersonated_business_name=")
    );
    const logIdCookie = cookies.find((c) =>
      c.trim().startsWith("impersonation_log_id=")
    );
    const businessId = idCookie?.trim().split("=")[1];
    const businessName = nameCookie
      ? decodeURIComponent(nameCookie.split("=")[1])
      : "";
    const logId = logIdCookie?.trim().split("=")[1] || undefined;

    if (businessId && businessName) {
      try {
        await fetch("/api/admin/impersonation-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessId,
            businessName,
            action: "end",
            logId,
          }),
        });
      } catch (err) {
        console.error("Failed to log impersonation end:", err);
      }
    }

    document.cookie =
      "impersonated_business_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie =
      "impersonated_business_name=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie =
      "impersonation_log_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    window.location.href = "/admin/businesses";
  };

  useEffect(() => {
    onClose?.();
  }, [pathname, onClose]);

  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-30 bg-background/80 backdrop-blur-sm transition-opacity lg:hidden",
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        )}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-200 ease-out will-change-transform",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:static lg:z-0 lg:w-64 lg:translate-x-0 lg:transition-none"
        )}
        aria-label="Admin Sidebar"
      >
        {/* Header Branding */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-4">
          <Link href="/admin" className="flex items-center gap-2.5 group">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/25 transition-transform duration-200 group-hover:scale-105">
              <ShieldCheck className="size-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-sidebar-foreground">
                  HopeChat
                </span>
                <span className="rounded bg-rose-500/10 border border-rose-500/25 px-1.5 py-0.2 text-[9px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  Admin
                </span>
              </div>
              <span className="text-[10px] font-medium text-sidebar-foreground/50">
                System Control Plane
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex size-7 items-center justify-center rounded-lg text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground lg:hidden"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Active Impersonation Alert Banner */}
        {impersonatedName && (
          <div className="mx-3 mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs">
            <div className="flex items-start gap-2">
              <ShieldAlert className="size-4 shrink-0 text-amber-500 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 leading-tight">
                  Impersonating:{" "}
                  <span className="font-bold text-foreground">
                    {impersonatedName}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={stopImpersonating}
                  className="mt-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 hover:underline"
                >
                  End Session &rarr;
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Groups */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4 scrollbar-hide">
          {adminNavGroups.map((group, gIdx) => (
            <div key={group.title || `group-${gIdx}`} className="space-y-1">
              {group.title && (
                <div className="px-2 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/45 select-none">
                  {group.title}
                </div>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive =
                    item.href === "/admin"
                      ? pathname === "/admin"
                      : pathname === item.href ||
                        pathname.startsWith(`${item.href}/`);

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "group relative flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 transition-all duration-200",
                          isActive
                            ? "bg-primary/10 text-foreground font-semibold shadow-sm"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        )}
                      >
                        <div
                          className={cn(
                            "flex size-7 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
                            item.bg,
                            item.color,
                            "group-hover:scale-110",
                            isActive &&
                              "ring-1 ring-primary/20 shadow-[0_0_12px_rgba(0,0,0,0.06)]"
                          )}
                        >
                          <item.icon className="size-4 shrink-0 transition-transform duration-200 group-hover:scale-105" />
                        </div>
                        <span className="flex-1 truncate text-xs font-medium tracking-tight">
                          {item.label}
                        </span>
                        {isActive && (
                          <div className="absolute right-2 size-1.5 rounded-full bg-primary" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {/* Quick return to tenant app */}
          <div className="pt-2 border-t border-sidebar-border/60">
            <Link
              href="/dashboard"
              className="group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-200 border border-sidebar-border/40"
            >
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-foreground/70 transition-transform duration-200 group-hover:-translate-x-0.5">
                <ArrowLeft className="size-3.5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-sidebar-foreground leading-tight">
                  Back to App
                </span>
                <span className="text-[10px] text-sidebar-foreground/45">
                  Tenant Workspace
                </span>
              </div>
            </Link>
          </div>
        </nav>

        {/* User profile section */}
        <div className="shrink-0 border-t border-sidebar-border p-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-xl p-2 text-left transition-all duration-200 hover:bg-sidebar-accent/50 focus:outline-none">
              <Avatar className="size-8 shrink-0 ring-1 ring-sidebar-border">
                {profile?.avatar_url ? (
                  <AvatarImage
                    src={profile.avatar_url}
                    alt={profile.full_name ?? "Admin Avatar"}
                  />
                ) : null}
                <AvatarFallback
                  className={cn(
                    "text-xs font-bold text-white select-none",
                    getAvatarGradient(profile?.full_name ?? profile?.email)
                  )}
                >
                  {profile?.full_name?.charAt(0)?.toUpperCase() ??
                    profile?.email?.charAt(0)?.toUpperCase() ??
                    "A"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-sidebar-foreground">
                  {profile?.full_name ?? "Super Admin"}
                </p>
                <div className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-rose-500 animate-pulse" />
                  <p className="truncate text-[9px] uppercase tracking-wider text-rose-500 font-extrabold">
                    Superadmin
                  </p>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="top"
              sideOffset={8}
              className="min-w-56 glass border-sidebar-border shadow-2xl p-1"
            >
              <div className="px-2 py-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                  Control Plane Account
                </p>
                <p className="text-xs font-medium text-foreground truncate mt-0.5">
                  {profile?.email}
                </p>
              </div>
              <DropdownMenuSeparator className="bg-sidebar-border/50" />
              <DropdownMenuItem
                className="flex items-center gap-2 rounded-lg cursor-pointer text-xs"
                onClick={() => (window.location.href = "/settings?tab=profile")}
              >
                <User className="size-3.5" />
                Profile & Security
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-sidebar-border/50" />
              <DropdownMenuItem
                onClick={signOut}
                className="flex items-center gap-2 rounded-lg cursor-pointer text-xs text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                <LogOut className="size-3.5" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
}

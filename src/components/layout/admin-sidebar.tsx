"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
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

const adminNavItems = [
  { href: "/admin", label: "Admin Overview", icon: LayoutDashboard },
  { href: "/admin/businesses", label: "Businesses & Billing", icon: Building2 },
  { href: "/admin/tenants", label: "Tenant Directory", icon: Coins },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/pricing-tiers", label: "Pricing Tiers", icon: Tag },
  { divider: true },
  { href: "/admin/alerts", label: "Alerts", icon: Bell },
  { href: "/admin/health", label: "System Health", icon: Activity },
  { href: "/admin/ai-usage", label: "AI Usage", icon: Cpu },
  { href: "/admin/credits", label: "Credit Usage", icon: Wallet },
  { href: "/admin/broadcast-monitor", label: "Broadcast Monitor", icon: Radio },
  { href: "/admin/revenue", label: "Revenue & Ledger", icon: TrendingUp },
  { href: "/admin/impersonation-logs", label: "Impersonation Logs", icon: Shield },
  { divider: true },
  { href: "/admin/logs", label: "System Logs", icon: FileCode },
  { href: "/admin/settings", label: "System Settings", icon: Settings },
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
    const cookies = document.cookie.split(';');
    const nameCookie = cookies.find(c => c.trim().startsWith('impersonated_business_name='));
    if (nameCookie) {
      setImpersonatedName(decodeURIComponent(nameCookie.split('=')[1]));
    }
  }, []);

  const stopImpersonating = async () => {
    const cookies = document.cookie.split(';');
    const idCookie = cookies.find(c => c.trim().startsWith('impersonated_business_id='));
    const nameCookie = cookies.find(c => c.trim().startsWith('impersonated_business_name='));
    const logIdCookie = cookies.find(c => c.trim().startsWith('impersonation_log_id='));
    const businessId = idCookie?.trim().split('=')[1];
    const businessName = nameCookie ? decodeURIComponent(nameCookie.split('=')[1]) : "";
    const logId = logIdCookie?.trim().split('=')[1] || undefined;

    if (businessId && businessName) {
      try {
        await fetch("/api/admin/impersonation-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ businessId, businessName, action: "end", logId }),
        });
      } catch (err) {
        console.error("Failed to log impersonation end:", err);
      }
    }

    document.cookie = "impersonated_business_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "impersonated_business_name=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "impersonation_log_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
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
          "fixed inset-0 z-30 bg-background/70 backdrop-blur-sm transition-opacity lg:hidden",
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-full w-64 flex-col border-r border-border bg-card",
          "transition-transform duration-200 ease-out will-change-transform",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:static lg:z-0 lg:w-60 lg:translate-x-0 lg:transition-none",
        )}
        aria-label="Admin Sidebar"
      >
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-4 bg-primary/10">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <ShieldCheck className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold text-foreground">
              System Admin
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="flex flex-col gap-1">
            {adminNavItems.map((item, index) => {
              if ('divider' in item && item.divider) {
                return <li key={`divider-${index}`} className="my-2 border-t border-border" />;
              }
              const navItem = item as { href: string; label: string; icon: any };
              const isActive = pathname === navItem.href;

              return (
                <li key={navItem.href}>
                  <Link
                    href={navItem.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors lg:py-2",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <navItem.icon className="h-4 w-4" />
                    <span className="flex-1">{navItem.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="my-4 border-t border-border" />

          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to App
          </Link>
        </nav>

        <div className="shrink-0 border-t border-border p-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted/60 focus:bg-muted/60 focus:outline-none">
              <Avatar className="size-8 shrink-0">
                {profile?.avatar_url ? (
                  <AvatarImage
                    src={profile.avatar_url}
                    alt={profile.full_name ?? "Avatar"}
                  />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
                  {profile?.full_name?.charAt(0)?.toUpperCase() ?? "A"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {profile?.full_name ?? "Admin"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  Superadmin
                </p>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="top"
              sideOffset={6}
              className="min-w-56 bg-card text-foreground border-border"
            >
              <DropdownMenuItem
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => window.location.href = "/settings?tab=profile"}
              >
                <User className="size-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-muted" />
              <DropdownMenuItem
                onClick={signOut}
                className="flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
}



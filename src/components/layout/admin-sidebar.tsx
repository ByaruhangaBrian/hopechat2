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
  { href: "/admin/businesses", label: "Businesses", icon: Building2 },
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

  const stopImpersonating = () => {
    document.cookie = "impersonated_business_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "impersonated_business_name=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    window.location.reload();
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
          "fixed inset-0 z-30 bg-slate-950/70 backdrop-blur-sm transition-opacity lg:hidden",
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-full w-64 flex-col border-r border-slate-800 bg-slate-900",
          "transition-transform duration-200 ease-out will-change-transform",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:static lg:z-0 lg:w-60 lg:translate-x-0 lg:transition-none",
        )}
        aria-label="Admin Sidebar"
      >
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-slate-800 px-4 bg-violet-900/10">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-white">
              System Admin
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="flex flex-col gap-1">
            {adminNavItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors lg:py-2",
                      isActive
                        ? "bg-violet-500/10 text-violet-400"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="flex-1">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="my-4 border-t border-slate-800" />

          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to App
          </Link>
        </nav>

        <div className="shrink-0 border-t border-slate-800 p-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-slate-800/60 focus:bg-slate-800/60 focus:outline-none">
              <Avatar className="size-8 shrink-0">
                {profile?.avatar_url ? (
                  <AvatarImage
                    src={profile.avatar_url}
                    alt={profile.full_name ?? "Avatar"}
                  />
                ) : null}
                <AvatarFallback className="bg-violet-500/10 text-sm font-medium text-violet-500">
                  {profile?.full_name?.charAt(0)?.toUpperCase() ?? "A"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {profile?.full_name ?? "Admin"}
                </p>
                <p className="truncate text-xs text-slate-400">
                  Superadmin
                </p>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="top"
              sideOffset={6}
              className="min-w-56 bg-slate-900 text-slate-100 ring-slate-700"
            >
              <DropdownMenuItem
                className="flex items-center gap-2 cursor-pointer"
                onSelect={() => window.location.href = "/settings?tab=profile"}
              >
                <User className="size-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-800" />
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


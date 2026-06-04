"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useTotalUnread } from "@/hooks/use-total-unread";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  GitBranch,
  Radio,
  Zap,
  Cpu,
  Settings,
  LogOut,
  User,
  X,
  ShieldCheck,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import { ShieldAlert } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", icon: MessageSquare },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/pipelines", label: "Pipelines", icon: GitBranch },
  { href: "/broadcasts", label: "Broadcasts", icon: Radio },
  { href: "/automations", label: "Automations", icon: Zap },
  { href: "/ai", label: "AI Hub", icon: Cpu },
];

interface SidebarProps {
  /** Controlled on mobile by the Header's hamburger button. Ignored on lg+. */
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const totalUnread = useTotalUnread();
  const { theme, setTheme } = useTheme();

  const bottomNavItems = [
    ...(profile?.is_superadmin ? [{ href: "/admin", label: "System Admin", icon: ShieldCheck }] : []),
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [impersonatedName, setImpersonatedName] = useState<string | null>(null);

  // Load and save collapse state
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved !== null) setIsCollapsed(saved === "true");
  }, []);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
  };

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
    window.location.href = "/admin/businesses";
  };

  useEffect(() => {
    onClose?.();
  }, [pathname, onClose]);

  const features = profile?.business?.features || {};

  const filteredNavItems = navItems.filter((item) => {
    if (item.href === "/broadcasts") return features.broadcasts_enabled !== false;
    if (item.href === "/automations") return features.automations_enabled !== false;
    if (item.href === "/pipelines") return features.pipelines_enabled !== false;
    return true;
  });

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <TooltipProvider delay={0}>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-30 bg-background/80 backdrop-blur-sm transition-opacity lg:hidden",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out",
          isCollapsed ? "w-20" : "w-64",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:static lg:z-0 lg:translate-x-0 lg:transition-all",
        )}
        aria-label="Primary"
      >
        {/* Logo row */}
        <div className={cn(
          "flex h-20 shrink-0 flex-col justify-center border-b border-sidebar-border px-4 transition-all duration-300",
          isCollapsed && "items-center px-0"
        )}>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex shrink-0 items-center justify-center rounded-xl bg-primary p-2 text-primary-foreground shadow-lg shadow-primary/20">
              <MessageSquare className="size-5" />
            </Link>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <span className="block truncate text-base font-bold tracking-tight text-sidebar-foreground">
                  HopeChat
                </span>
                <span className="block truncate text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/50">
                  {profile?.business?.name || "Business"}
                </span>
              </div>
            )}
            {!isCollapsed && (
              <button
                type="button"
                onClick={onClose}
                className="flex size-8 items-center justify-center rounded-lg text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground lg:hidden"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        {impersonatedName && !isCollapsed && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium text-amber-500 leading-tight">
                  Impersonating: <span className="text-foreground font-bold">{impersonatedName}</span>
                </p>
                <button 
                  onClick={stopImpersonating}
                  className="text-[10px] text-amber-500/70 hover:text-amber-500 underline underline-offset-2 transition-colors"
                >
                  Stop Impersonating
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {filteredNavItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const showUnreadDot = item.href === "/inbox" && totalUnread > 0 && !isActive;

              const content = (
                <Link
                  href={item.href}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    isCollapsed && "justify-center px-0"
                  )}
                >
                  <item.icon className={cn("size-5 shrink-0 transition-transform duration-200 group-hover:scale-110", isActive && "text-primary")} />
                  {!isCollapsed && <span className="flex-1 font-medium">{item.label}</span>}
                  {showUnreadDot && (
                    <span className={cn(
                      "absolute flex h-2 w-2",
                      isCollapsed ? "right-2 top-2" : "right-3"
                    )}>
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                    </span>
                  )}
                  {isActive && !isCollapsed && (
                    <div className="absolute left-0 h-5 w-1 rounded-full bg-primary shadow-[0_0_8px_oklch(var(--primary))]" />
                  )}
                </Link>
              );

              return (
                <li key={item.href}>
                  {isCollapsed ? (
                    <Tooltip>
                      <TooltipTrigger>{content}</TooltipTrigger>
                      <TooltipContent side="right" className="bg-sidebar-accent text-sidebar-foreground border-sidebar-border">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  ) : content}
                </li>
              );
            })}
          </ul>

          {!isCollapsed && <div className="mx-2 my-4 h-px bg-sidebar-border/50" />}

          <ul className="space-y-1">
            {bottomNavItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const content = (
                <Link
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    isCollapsed && "justify-center px-0"
                  )}
                >
                  <item.icon className="size-5 shrink-0 transition-transform duration-200 group-hover:scale-110" />
                  {!isCollapsed && <span className="flex-1 font-medium">{item.label}</span>}
                </Link>
              );

              return (
                <li key={item.href}>
                  {isCollapsed ? (
                    <Tooltip>
                      <TooltipTrigger>{content}</TooltipTrigger>
                      <TooltipContent side="right" className="bg-sidebar-accent text-sidebar-foreground border-sidebar-border">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  ) : content}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom controls */}
        <div className="shrink-0 p-3 flex justify-end">
          {/* Collapse toggle (Desktop only) */}
          <button
            onClick={toggleCollapse}
            className="hidden size-8 items-center justify-center rounded-lg border border-sidebar-border bg-sidebar-accent/50 text-sidebar-foreground/40 transition-all hover:bg-sidebar-accent hover:text-sidebar-foreground lg:flex"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </button>
        </div>

        {/* User section */}
        <div className="shrink-0 p-3">
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(
              "flex w-full items-center gap-3 rounded-xl p-2 text-left transition-all duration-200 hover:bg-sidebar-accent/50 focus:outline-none",
              isCollapsed && "justify-center p-0 h-12"
            )}>
              <Avatar className="size-8 shrink-0 ring-2 ring-sidebar-border">
                {profile?.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt={profile.full_name ?? "Avatar"} />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                  {profile?.full_name?.charAt(0)?.toUpperCase() ?? profile?.email?.charAt(0)?.toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-sidebar-foreground">
                    {profile?.full_name ?? "User"}
                  </p>
                  <p className="truncate text-[10px] uppercase tracking-tighter text-sidebar-foreground/40 font-bold">
                    {profile?.role || "Team Member"}
                  </p>
                </div>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="right" sideOffset={12} className="w-56 glass border-sidebar-border shadow-2xl">
              <div className="px-2 py-2">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50 mb-2 px-2">Account</p>
                <DropdownMenuItem
                  render={
                    <Link href="/settings?tab=profile" className="rounded-lg flex items-center gap-2" />
                  }
                >
                  <User className="size-4" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  render={
                    <Link href="/settings?tab=whatsapp" className="rounded-lg flex items-center gap-2" />
                  }
                >
                  <Settings className="size-4" /> Settings
                </DropdownMenuItem>
              </div>
              
              <DropdownMenuSeparator className="bg-sidebar-border/50" />
              
              <div className="px-2 py-2">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50 mb-2 px-2">Appearance</p>
                <DropdownMenuItem 
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="rounded-lg flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
                    <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                  </div>
                  <div className="size-2 rounded-full bg-primary animate-pulse" />
                </DropdownMenuItem>
              </div>

              <DropdownMenuSeparator className="bg-sidebar-border/50" />
              
              <div className="p-2">
                <DropdownMenuItem onClick={signOut} className="rounded-lg flex items-center gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive">
                  <LogOut className="size-4" /> Sign out
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </TooltipProvider>
  );
}

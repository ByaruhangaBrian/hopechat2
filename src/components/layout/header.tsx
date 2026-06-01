"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "next-themes";
import { LogOut, Menu, Settings as SettingsIcon, User, Sun, Moon } from "lucide-react";
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

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/inbox": "Inbox",
  "/contacts": "Contacts",
  "/pipelines": "Pipelines",
  "/broadcasts": "Broadcasts",
  "/automations": "Automations",
  "/settings": "Settings",
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  const match = Object.entries(pageTitles).find(([path]) =>
    pathname.startsWith(path),
  );
  return match ? match[1] : "Dashboard";
}

interface HeaderProps {
  /** Wired to the shell's drawer state. Used only on mobile — the
   *  hamburger button is hidden on lg+. */
  onOpenSidebar?: () => void;
}

export function Header({ onOpenSidebar }: HeaderProps) {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const title = getPageTitle(pathname);

  const initial =
    profile?.full_name?.charAt(0)?.toUpperCase() ??
    profile?.email?.charAt(0)?.toUpperCase() ??
    "U";

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/60 backdrop-blur-md px-4 lg:px-6 sticky top-0 z-30">
      <div className="flex min-w-0 items-center gap-4">
        {/* Hamburger — mobile only */}
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open menu"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
        >
          <Menu className="size-5" />
        </button>
        <div className="space-y-0.5">
          <h1 className="truncate text-lg font-bold tracking-tight text-foreground">
            {title}
          </h1>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex items-center gap-3 rounded-xl p-1.5 transition-all duration-200 hover:bg-accent focus:outline-none data-popup-open:bg-accent"
          aria-label="Open account menu"
        >
          <Avatar className="size-9 ring-2 ring-border">
            {profile?.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={profile.full_name ?? "Avatar"} />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="hidden flex-col items-start text-left sm:flex">
            <span className="text-sm font-bold text-foreground leading-none">
              {profile?.full_name ?? "User"}
            </span>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-tighter">
              {profile?.role || "Admin"}
            </span>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="w-56 glass border-border shadow-2xl"
        >
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
              <SettingsIcon className="size-4" /> Settings
            </DropdownMenuItem>
          </div>
          
          <DropdownMenuSeparator className="bg-border/50" />
          
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

          <DropdownMenuSeparator className="bg-border/50" />
          
          <div className="p-2">
            <DropdownMenuItem onClick={signOut} className="rounded-lg flex items-center gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive">
              <LogOut className="size-4" /> Sign out
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

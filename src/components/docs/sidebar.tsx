"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, MessageSquare, ArrowLeft, ChevronRight } from "lucide-react";
import { docsGroups } from "@/components/docs/nav";
import { cn } from "@/lib/utils";

export function DocsSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <div className="sticky top-0 z-40 lg:hidden">
        <div className="flex items-center justify-between border-b border-border bg-white/90 px-4 py-3 backdrop-blur-md">
          <Link href="/docs" className="flex items-center gap-2" onClick={() => setOpen(false)}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <MessageSquare className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-extrabold tracking-tight text-foreground">HopeChat Docs</span>
          </Link>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground"
            onClick={() => setOpen(!open)}
            aria-label="Toggle navigation"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {open && (
          <div className="border-b border-border bg-white px-4 py-4">
            <NavList pathname={pathname} onNavigate={() => setOpen(false)} />
          </div>
        )}
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:sticky lg:top-0 lg:block lg:h-screen lg:w-72 lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-border lg:bg-white lg:px-5 lg:py-8">
        <Link href="/docs" className="flex items-center gap-2.5 px-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/20">
            <MessageSquare className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          <span className="text-base font-extrabold tracking-tight text-foreground">HopeChat Docs</span>
        </Link>
        <nav className="mt-8 space-y-6">
          <NavList pathname={pathname} />
        </nav>
        <div className="mt-8 border-t border-border pt-6">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to HopeChat
          </Link>
        </div>
      </aside>
    </>
  );
}

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="space-y-6">
      {docsGroups.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70">
            {group.label}
          </p>
          <ul className="space-y-1">
            {group.items.map((item) => {
              const active = pathname === item.href || (item.href !== "/docs" && pathname.startsWith(item.href + "/"));
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "group flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-background hover:text-foreground"
                    )}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                      <span className="truncate">{item.title}</span>
                    </span>
                    {active && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-primary" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
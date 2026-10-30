"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  Bell,
  BellOff,
  CheckCheck,
  MessageSquare,
  AlertTriangle,
  WifiOff,
  CalendarClock,
  CreditCard,
  Building2,
  ShieldAlert,
  UserCheck,
  ZapOff,
  ExternalLink,
  X,
  Sparkles,
  Loader2,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { AppNotification, NotificationFilter } from "@/lib/notifications/types";

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "Recent";
  }
}

function getNotificationIcon(type: string, severity: string) {
  if (type === "human_takeover" || type === "escalation") {
    return <UserCheck className="size-4" />;
  }
  if (type === "whatsapp_disconnect" || type === "system_whatsapp_outage") {
    return <WifiOff className="size-4" />;
  }
  if (type === "new_message") {
    return <MessageSquare className="size-4" />;
  }
  if (type === "zero_credits" || type === "low_credits") {
    return <ZapOff className="size-4" />;
  }
  if (
    type === "subscription_expiring" ||
    type === "subscription_expired" ||
    type === "subscription_grace_period" ||
    type === "tenants_expiring"
  ) {
    return <CalendarClock className="size-4" />;
  }
  if (type === "payment_failed") {
    return <CreditCard className="size-4" />;
  }
  if (type === "new_tenant_joined") {
    return <Building2 className="size-4" />;
  }
  if (severity === "critical") {
    return <AlertTriangle className="size-4" />;
  }
  return <ShieldAlert className="size-4" />;
}

function getSeverityStyles(severity: string) {
  switch (severity) {
    case "critical":
      return {
        iconBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25",
        itemBorder: "border-l-4 border-l-rose-500",
      };
    case "warning":
      return {
        iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25",
        itemBorder: "border-l-4 border-l-amber-500",
      };
    case "success":
      return {
        iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25",
        itemBorder: "border-l-4 border-l-emerald-500",
      };
    case "info":
    default:
      return {
        iconBg: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/25",
        itemBorder: "border-l-4 border-l-sky-500",
      };
  }
}

export function NotificationsPopover() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>("all");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Check if we are in superadmin portal mode
  const isSuperAdmin =
    user?.app_metadata?.is_superadmin === true ||
    profile?.is_superadmin === true ||
    profile?.role === "superadmin";

  const isAdminView = isSuperAdmin && pathname.startsWith("/admin");
  const scope = isAdminView ? "admin" : "business";

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/notifications?scope=${scope}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch (err) {
      console.warn("[notifications] failed to fetch:", err);
    } finally {
      setLoading(false);
    }
  }, [user, scope]);

  // Initial fetch and auto-polling every 30 seconds
  useEffect(() => {
    void fetchNotifications();
    const interval = setInterval(() => {
      void fetchNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Refetch when popover opens
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      void fetchNotifications();
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mark_all_read: true, scope }),
      });
    } catch (err) {
      console.error("[notifications] mark all read failed:", err);
    }
  };

  // Mark single item read & navigate
  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));

      try {
        void fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: notif.id, is_read: true, scope }),
        });
      } catch (err) {
        console.error("[notifications] mark read failed:", err);
      }
    }

    if (notif.link) {
      setIsOpen(false);
      router.push(notif.link);
    }
  };

  // Dismiss notification
  const handleDismiss = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const item = notifications.find((n) => n.id === id);
    if (item && !item.is_read) {
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    try {
      await fetch(`/api/notifications?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("[notifications] dismiss failed:", err);
    }
  };

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    if (activeFilter === "unread") {
      return notifications.filter((n) => !n.is_read);
    }
    if (activeFilter === "actions") {
      return notifications.filter(
        (n) =>
          n.category === "action_needed" ||
          n.severity === "critical" ||
          n.type === "human_takeover",
      );
    }
    return notifications;
  }, [notifications, activeFilter]);

  // Check if any unread notification is critical
  const hasCriticalUnread = useMemo(() => {
    return notifications.some((n) => !n.is_read && n.severity === "critical");
  }, [notifications]);

  const actionsCount = useMemo(() => {
    return notifications.filter(
      (n) =>
        n.category === "action_needed" ||
        n.severity === "critical" ||
        n.type === "human_takeover",
    ).length;
  }, [notifications]);

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        className={cn(
          "relative flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          isOpen && "bg-accent text-foreground",
        )}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
      >
        <Bell className="size-5" />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center">
            {hasCriticalUnread && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
            )}
            <span
              className={cn(
                "relative flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-extrabold text-white shadow-md",
                hasCriticalUnread ? "bg-rose-500" : "bg-emerald-600",
              )}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[340px] sm:w-[420px] p-0 rounded-2xl glass border border-border shadow-2xl overflow-hidden text-foreground"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold tracking-tight text-foreground">
              {isAdminView ? "System Alerts" : "Notifications"}
            </h2>
            {loading && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
            {unreadCount > 0 ? (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-extrabold text-primary">
                {unreadCount} new
              </span>
            ) : (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                All caught up
              </span>
            )}
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Mark all as read"
            >
              <CheckCheck className="size-3.5" />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 border-b border-border/40 bg-background/50 px-3 py-1.5 text-xs">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={cn(
              "rounded-lg px-2.5 py-1 font-semibold transition-all cursor-pointer",
              activeFilter === "all"
                ? "bg-accent text-accent-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            All ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("unread")}
            className={cn(
              "rounded-lg px-2.5 py-1 font-semibold transition-all cursor-pointer",
              activeFilter === "unread"
                ? "bg-accent text-accent-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Unread ({unreadCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("actions")}
            className={cn(
              "rounded-lg px-2.5 py-1 font-semibold transition-all cursor-pointer flex items-center gap-1",
              activeFilter === "actions"
                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Sparkles className="size-3" />
            Actions ({actionsCount})
          </button>
        </div>

        {/* Notifications List */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-border/40 overscroll-contain">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground mb-3 shadow-inner">
                <BellOff className="size-5" />
              </div>
              <p className="text-sm font-bold text-foreground">No notifications</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
                {activeFilter === "unread"
                  ? "You have marked all notifications as read."
                  : activeFilter === "actions"
                  ? "No urgent action items or escalations at the moment."
                  : "You're all up to date. Important activity will show up here."}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const styles = getSeverityStyles(notif.severity);
              const isUnread = !notif.is_read;

              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={cn(
                    "group relative flex items-start gap-3 p-3.5 transition-colors cursor-pointer text-left hover:bg-accent/60",
                    isUnread
                      ? cn("bg-accent/30 font-medium", styles.itemBorder)
                      : "opacity-85 hover:opacity-100",
                  )}
                >
                  {/* Category / Severity Icon */}
                  <div
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-xl shadow-xs transition-transform group-hover:scale-105",
                      styles.iconBg,
                    )}
                  >
                    {getNotificationIcon(notif.type, notif.severity)}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span
                        className={cn(
                          "text-xs truncate tracking-tight text-foreground",
                          isUnread ? "font-bold" : "font-semibold",
                        )}
                      >
                        {notif.title}
                      </span>
                      {isUnread && (
                        <span className="size-1.5 rounded-full bg-primary shrink-0" />
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>

                    <div className="flex items-center justify-between gap-2 mt-2">
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {formatRelativeTime(notif.created_at)}
                      </span>

                      {notif.action_label && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary group-hover:underline">
                          {notif.action_label}
                          <ExternalLink className="size-2.5" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dismiss Button */}
                  <button
                    type="button"
                    onClick={(e) => handleDismiss(e, notif.id)}
                    className="absolute top-2.5 right-2 flex size-6 items-center justify-center rounded-lg text-muted-foreground/60 opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
                    title="Dismiss"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-4 py-2.5 text-xs">
          <span className="text-[11px] text-muted-foreground">
            {isAdminView ? "System Monitoring" : "Live Workspace Alerts"}
          </span>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              router.push(isAdminView ? "/admin/activity" : "/inbox");
            }}
            className="text-[11px] font-bold text-primary hover:underline"
          >
            {isAdminView ? "View System Activity →" : "Go to Inbox →"}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Activity as ActivityIcon,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

const CATEGORIES = [
  { value: "all", label: "All activity" },
  { value: "auth", label: "Sign-ins & sign-outs" },
  { value: "contact", label: "Contacts" },
  { value: "pipeline", label: "Pipelines" },
  { value: "broadcast", label: "Broadcasts" },
  { value: "automation", label: "Automations" },
  { value: "settings", label: "Settings" },
];

interface ActivityEvent {
  id: string;
  actor_label: string | null;
  category: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  summary: string;
  created_at: string;
}

interface ActivityResponse {
  events: ActivityEvent[];
  total: number;
  page: number;
  pageSize: number;
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function categoryLabel(category: string): string {
  return CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

const categoryStyles: Record<string, string> = {
  auth: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  contact: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  pipeline: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  broadcast: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  automation: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  settings: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
};

export function ActivityLog() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [category, setCategory] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (category !== "all") params.set("category", category);
    if (fromDate) params.set("from", new Date(`${fromDate}T00:00:00`).toISOString());
    if (toDate) params.set("to", new Date(`${toDate}T23:59:59.999`).toISOString());

    try {
      const res = await fetch(`/api/activity?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load activity");
      const data: ActivityResponse = await res.json();
      setEvents(data.events);
      setTotal(data.total);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load activity";
      toast.error(message);
      setEvents([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, category, fromDate, toDate]);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="grid gap-1.5">
          <Label htmlFor="activity-category" className="text-xs font-medium text-muted-foreground">
            Category
          </Label>
          <Select value={category} onValueChange={(v) => { setCategory(v ?? 'all'); setPage(1); }}>
            <SelectTrigger id="activity-category" className="border-border bg-card text-foreground">
              <SelectValue placeholder="All activity" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground">
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="activity-from" className="text-xs font-medium text-muted-foreground">
            From
          </Label>
          <Input
            id="activity-from"
            type="date"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
            className="bg-card border-border text-foreground"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="activity-to" className="text-xs font-medium text-muted-foreground">
            To
          </Label>
          <Input
            id="activity-to"
            type="date"
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setPage(1); }}
            className="bg-card border-border text-foreground"
          />
        </div>
        <div className="flex items-end">
          <Button
            variant="outline"
            onClick={() => {
              setCategory("all");
              setFromDate("");
              setToDate("");
              setPage(1);
            }}
            className="border-border text-muted-foreground hover:bg-muted w-full"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Feed */}
      <div className="rounded-lg border border-border overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center gap-2 py-12">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading activity...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12">
            <Inbox className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {events.map((event) => (
              <li key={event.id} className="flex items-start gap-3 px-4 py-3">
                <span
                  className={cn(
                    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                    categoryStyles[event.category] ?? "bg-muted text-muted-foreground"
                  )}
                >
                  <ActivityIcon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{event.summary}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {event.actor_label ?? "A user"}
                    {" · "}
                    {categoryLabel(event.category)}
                    {" · "}
                    {formatWhen(event.created_at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}-
            {Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={!hasPrev}
              onClick={() => setPage((p) => p - 1)}
              className="border-border text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={!hasNext}
              onClick={() => setPage((p) => p + 1)}
              className="border-border text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

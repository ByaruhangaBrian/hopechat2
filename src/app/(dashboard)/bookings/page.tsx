"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CalendarCheck, Copy, Info, Loader2, Settings2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface CalEventType {
  id: number;
  title: string;
  slug: string;
  lengthInMinutes: number;
  hidden: boolean;
  description: string | null;
  bookingUrl: string | null;
}

interface BookingsStatus {
  configured: boolean;
  username: string;
  event_types: CalEventType[];
}

interface BookingRow {
  id: string;
  cal_uid: string;
  event_title: string | null;
  start_time: string | null;
  end_time: string | null;
  attendee_name: string | null;
  attendee_email: string | null;
  status: "booked" | "rescheduled" | "cancelled";
}

function bookingLink(et: CalEventType, username: string): string {
  if (et.bookingUrl) return et.bookingUrl;
  return `https://cal.com/${username}/${et.slug}`;
}

export default function BookingsPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<BookingsStatus | null>(null);
  const [eventTypes, setEventTypes] = useState<CalEventType[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/integrations/calcom", { cache: "no-store" });
        const data = await res.json();
        const list: CalEventType[] = Array.isArray(data.event_types) ? data.event_types : [];
        setStatus({ configured: data.configured === true, username: data.username ?? "", event_types: list });
        setEventTypes(list);
        const bookingsRes = await fetch("/api/calcom/bookings", { cache: "no-store" });
        const bookingsData = await bookingsRes.json().catch(() => ({}));
        setBookings(Array.isArray(bookingsData.bookings) ? bookingsData.bookings : []);
      } catch (err) {
        console.error("[bookings] load failed:", err);
        setStatus({ configured: false, username: "", event_types: [] });
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const externalHost = status?.username ? `https://cal.com/${status.username}` : "";

  const handleToggle = async (et: CalEventType) => {
    const nextHidden = !et.hidden;
    const prev = eventTypes;
    setEventTypes((list) => list.map((e) => (e.id === et.id ? { ...e, hidden: nextHidden } : e)));
    try {
      const res = await fetch(`/api/integrations/calcom/event-types/${et.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disabled: nextHidden }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Update failed");
      setEventTypes((list) => list.map((e) => (e.id === et.id ? { ...e, hidden: data.event_type?.hidden ?? nextHidden } : e)));
      toast.success(nextHidden ? `${et.title} disabled` : `${et.title} is now live`);
    } catch (err: any) {
      console.error("[bookings] toggle failed:", err);
      setEventTypes(prev);
      toast.error(err.message || "Failed to update event type");
    }
  };

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Booking link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  const panel = (children: React.ReactNode) => (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>
        <p className="text-sm text-muted-foreground">Appointments booked via your Cal.com links.</p>
      </div>
      {children}
    </div>
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-24">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!status || !status.configured) {
    return panel(
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarCheck className="size-5 text-blue-500" />
            <CardTitle>Not connected yet</CardTitle>
          </div>
          <CardDescription>
            Connect your Cal.com account in Settings → Integrations to start sharing booking links and tracking appointments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/settings?tab=integrations">
            <Button className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground">
              <Settings2 className="size-4" />
              Go to Integrations
            </Button>
          </Link>
        </CardContent>
      </Card>,
    );
  }

  return panel(
    <>
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4 flex gap-3">
        <Info className="size-5 text-blue-400 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-600 dark:text-blue-100 leading-relaxed">
          Toggle an event type to make it bookable (or hide it), then copy its link and paste it into the{" "}
          <span className="font-medium">AI assistant prompt</span> or a chat message to share it with customers.
        </p>
      </div>

      <div className="space-y-3">
        {eventTypes.map((et) => {
          const url = bookingLink(et, status.username);
          return (
            <Card key={et.id} className="border-border bg-card">
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">{et.title}</p>
                    {et.description ? (
                      <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{et.description}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">{et.lengthInMinutes} min</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5",
                        et.hidden
                          ? "bg-muted text-muted-foreground"
                          : "bg-emerald-500/10 text-emerald-500",
                      )}
                    >
                      {et.hidden ? "Disabled" : "Live"}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Bookable</span>
                      <Switch checked={!et.hidden} onCheckedChange={() => handleToggle(et)} />
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/50 p-2">
                  <code className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">{url}</code>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border"
                    onClick={() => handleCopy(url)}
                  >
                    <Copy className="size-3.5" />
                    Copy
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Paste this link into your AI assistant prompt or a chat to share it.
                  {externalHost ? (
                    <>
                      {" "}Share links open on {externalHost}.
                    </>
                  ) : null}
                </p>
              </CardContent>
            </Card>
          );
        })}
        {eventTypes.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="p-6 text-sm text-muted-foreground">
              No event types were returned by your Cal.com account. Create one at{" "}
              <span className="font-mono text-xs">cal.com</span> and refresh.
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">Recent bookings</h2>
          <p className="text-sm text-muted-foreground">
            Synced automatically from Cal.com. Reschedules and cancellations update in place.
          </p>
        </div>
        {bookings.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="p-6 text-sm text-muted-foreground">
              No bookings yet. Share one of your links to see appointments appear here.
            </CardContent>
          </Card>
        ) : (
          bookings.map((b) => (
            <Card key={b.id} className="border-border bg-card">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">{b.event_title || "Appointment"}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {b.attendee_name ?? "Attendee"}
                    {b.attendee_email ? ` · ${b.attendee_email}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatWhen(b.start_time)}</p>
                </div>
                <StatusPill status={b.status} />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </>,
  );
}

function formatWhen(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatusPill({ status }: { status: BookingRow["status"] }) {
  const styles: Record<BookingRow["status"], string> = {
    booked: "bg-emerald-500/10 text-emerald-500",
    rescheduled: "bg-amber-500/10 text-amber-500",
    cancelled: "bg-destructive/10 text-destructive",
  };
  return (
    <span className={cn("text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5", styles[status])}>
      {status}
    </span>
  );
}
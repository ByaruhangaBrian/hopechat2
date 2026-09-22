"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  format,
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { toast } from "sonner";
import {
  CalendarCheck,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Info,
  Loader2,
  RefreshCw,
  Settings2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<BookingsStatus | null>(null);
  const [eventTypes, setEventTypes] = useState<CalEventType[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadBookings = useCallback(async (withSync: boolean) => {
    setSyncing(withSync);
    try {
      const bookingsRes = await fetch(`/api/calcom/bookings${withSync ? "?sync=1" : ""}`, { cache: "no-store" });
      const bookingsData = await bookingsRes.json().catch(() => ({}));
      if (!bookingsRes.ok) toast.error(bookingsData.error || "Could not load bookings");
      setBookings(Array.isArray(bookingsData.bookings) ? bookingsData.bookings : []);
    } catch (err) {
      console.error("[bookings] load failed:", err);
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/integrations/calcom", { cache: "no-store" });
        const data = await res.json();
        const list: CalEventType[] = Array.isArray(data.event_types) ? data.event_types : [];
        setStatus({ configured: data.configured === true, username: data.username ?? "", event_types: list });
        setEventTypes(list);
        if (data.configured === true) {
          await loadBookings(true);
        }
      } catch (err) {
        console.error("[bookings] load failed:", err);
        setStatus({ configured: false, username: "", event_types: [] });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [loadBookings]);

  const externalHost = status?.username ? `https://cal.com/${status.username}` : "";

  const handleSync = () => loadBookings(true);

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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>
          <p className="text-sm text-muted-foreground">Appointments booked via your Cal.com links.</p>
        </div>
        {status?.configured ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-1.5" onClick={handleSync} disabled={syncing}>
              {syncing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Sync
            </Button>
            <Button className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setDialogOpen(true)}>
              <CalendarPlus className="size-4" />
              New booking
            </Button>
          </div>
        ) : null}
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
            Connect your Cal.com account in Settings → Integrations to start sharing booking links, syncing appointments, and booking on a customer&apos;s behalf.
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
          <span className="font-medium">AI assistant prompt</span> or a chat message to share it with customers. Use{" "}
          <span className="font-medium">New booking</span> to book an appointment on a customer&apos;s behalf — it syncs back automatically.
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
                    render={
                      <a href={url} target="_blank" rel="noopener noreferrer" title="Open booking page in a new tab" />
                    }
                  >
                    <ExternalLink className="size-3.5" />
                    Open
                  </Button>
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
                  Paste this link into your AI assistant prompt or a chat to share it. Share links open on{" "}
                  <span className="font-mono text-xs">{externalHost || "cal.com"}</span> in a new tab.
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

      <CalendarSection bookings={bookings} />

      <NewBookingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        eventTypes={eventTypes.filter((e) => !e.hidden)}
        onCreated={() => loadBookings(false)}
      />
    </>,
  );
}

function CalendarSection({ bookings }: { bookings: BookingRow[] }) {
  const [viewDate, setViewDate] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const bookingsByDay = useMemo(() => {
    const map: Record<string, BookingRow[]> = {};
    for (const b of bookings) {
      if (!b.start_time) continue;
      const key = format(new Date(b.start_time), "yyyy-MM-dd");
      (map[key] ??= []).push(b);
    }
    return map;
  }, [bookings]);

  const gridDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(viewDate)),
    end: endOfWeek(endOfMonth(viewDate)),
  });

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const selectedKey = format(selectedDate, "yyyy-MM-dd");
  const selectedBookings = bookingsByDay[selectedKey] ?? [];
  const counts = Object.values(bookingsByDay).reduce((n, list) => n + list.filter((b) => b.status !== "cancelled").length, 0);

  const chip = (b: BookingRow) => (
    <span
      key={b.id}
      className={cn(
        "block truncate rounded px-1 text-[10px] leading-4 font-medium",
        b.status === "cancelled"
          ? "bg-muted text-muted-foreground line-through"
          : b.status === "rescheduled"
            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
            : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
      )}
    >
      {b.event_title || "Appointment"}
    </span>
  );

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-foreground">Calendar</h2>
        <p className="text-sm text-muted-foreground">
          {bookings.length === 0
            ? "No bookings yet. Share one of your links or use New booking to schedule an appointment."
            : `Synced automatically from Cal.com. Reschedules and cancellations update in place (${counts} upcoming).`}
        </p>
      </div>

      {bookings.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="p-6 text-sm text-muted-foreground">
            No bookings to show yet. Bookings appear here once arranged.
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border bg-card">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon-sm" onClick={() => setViewDate((d) => subMonths(d, 1))} aria-label="Previous month">
                  <ChevronLeft />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => setViewDate((d) => addMonths(d, 1))} aria-label="Next month">
                  <ChevronRight />
                </Button>
              </div>
              <p className="text-sm font-bold text-foreground">{format(viewDate, "MMMM yyyy")}</p>
              <Button variant="outline" size="sm" onClick={() => { setViewDate(startOfMonth(new Date())); setSelectedDate(new Date()); }}>
                Today
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {weekdays.map((wd) => (
                <p key={wd} className="text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {wd}
                </p>
              ))}
              {gridDays.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const dayBookings = bookingsByDay[key] ?? [];
                const inMonth = isSameMonth(day, viewDate);
                const selected = isSameDay(day, selectedDate);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "flex min-h-16 flex-col items-stretch gap-1 rounded-lg border p-1 text-left transition-colors",
                      selected
                        ? "border-ring bg-accent ring-1 ring-ring"
                        : "border-border hover:bg-accent/50",
                      !inMonth && "opacity-40",
                    )}
                  >
                    <span
                      className={cn(
                        "h-5 w-5 rounded-full text-xs font-medium leading-5 text-center",
                        isToday(day) && "bg-primary text-primary-foreground",
                        !isToday(day) && "text-foreground",
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      {dayBookings.slice(0, 2).map(chip)}
                      {dayBookings.length > 2 ? (
                        <span className="px-1 text-[10px] text-muted-foreground">+{dayBookings.length - 2} more</span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border bg-card">
        <CardContent className="p-4 space-y-3">
          <p className="font-semibold text-foreground">
            {format(selectedDate, "EEEE, MMMM d")}
            {isToday(selectedDate) ? " · Today" : ""}
          </p>
          {selectedBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings on this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedBookings.map((b) => (
                <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/50 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">{b.event_title || "Appointment"}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {formatWhen(b.start_time)}
                      {b.attendee_name ? ` · ${b.attendee_name}` : ""}
                      {b.attendee_email ? ` (${b.attendee_email})` : ""}
                    </p>
                  </div>
                  <StatusPill status={b.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NewBookingDialog({
  open,
  onOpenChange,
  eventTypes,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventTypes: CalEventType[];
  onCreated: () => void;
}) {
  const [eventTypeId, setEventTypeId] = useState<string>("");
  const [date, setDate] = useState<string>(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [timeZone, setTimeZone] = useState<string>(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [attendeeName, setAttendeeName] = useState("");
  const [attendeeEmail, setAttendeeEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const minDate = format(new Date(), "yyyy-MM-dd");

  const loadSlots = useCallback(async () => {
    const id = Number(eventTypeId);
    if (!Number.isInteger(id) || !date) return;
    setSlotsLoading(true);
    setSelectedSlot("");
    try {
      const rangeStart = `${date}T00:00:00.000Z`;
      const rangeEnd = `${date}T23:59:59.000Z`;
      const params = new URLSearchParams({ eventTypeId: String(id), start: rangeStart, end: rangeEnd, timeZone });
      const res = await fetch(`/api/calcom/slots?${params.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Could not load available times");
        setSlots([]);
      } else {
        setSlots(Array.isArray(data.slots) ? data.slots : []);
      }
    } catch (err) {
      console.error("[bookings] slots fetch failed:", err);
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [eventTypeId, date, timeZone]);

  useEffect(() => {
    if (open && eventTypeId) {
      loadSlots();
    }
  }, [open, eventTypeId, date, timeZone, loadSlots]);

  const handleSubmit = async () => {
    if (!selectedSlot) {
      toast.error("Pick an available time first.");
      return;
    }
    if (!attendeeName.trim()) {
      toast.error("Enter the attendee's name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attendeeEmail.trim())) {
      toast.error("Enter a valid attendee email.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/calcom/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventTypeId: Number(eventTypeId),
          start: selectedSlot,
          attendee: { name: attendeeName.trim(), email: attendeeEmail.trim(), timeZone },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not create the booking");
      toast.success("Booking created");
      onOpenChange(false);
      onCreated();
    } catch (err: any) {
      console.error("[bookings] create failed:", err);
      toast.error(err.message || "Could not create the booking");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setSlots([]); setSelectedSlot(""); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New booking</DialogTitle>
          <DialogDescription>
            Book an appointment on a customer&apos;s behalf. It appears in your Cal.com calendar and here automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="booking-event-type">Event type</Label>
            <Select value={eventTypeId} onValueChange={(v) => { setEventTypeId(v ?? ""); setSelectedSlot(""); }}>
              <SelectTrigger id="booking-event-type" className="w-full">
                <SelectValue placeholder="Select an event type" />
              </SelectTrigger>
              <SelectContent>
                {eventTypes.map((et) => (
                  <SelectItem key={et.id} value={String(et.id)}>
                    {et.title} ({et.lengthInMinutes} min)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="booking-date">Date</Label>
              <Input
                id="booking-date"
                type="date"
                min={minDate}
                value={date}
                onChange={(e) => { setDate(e.target.value); setSelectedSlot(""); }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="booking-tz">Attendee time zone</Label>
              <Input
                id="booking-tz"
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                placeholder="e.g. Africa/Nairobi"
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Available times</p>
            {slotsLoading ? (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Checking availability…
              </div>
            ) : slots.length === 0 ? (
              <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
                {eventTypeId ? "No openings on this day." : "Pick an event type and date to see available times."}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {slots.map((iso) => (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => setSelectedSlot(iso)}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                      selectedSlot === iso
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground hover:bg-muted",
                    )}
                  >
                    {new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="booking-name">Attendee name</Label>
              <Input
                id="booking-name"
                value={attendeeName}
                onChange={(e) => setAttendeeName(e.target.value)}
                placeholder="Customer name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="booking-email">Attendee email</Label>
              <Input
                id="booking-email"
                type="email"
                value={attendeeEmail}
                onChange={(e) => setAttendeeEmail(e.target.value)}
                placeholder="customer@example.com"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <CalendarPlus className="size-4" />}
            Book appointment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
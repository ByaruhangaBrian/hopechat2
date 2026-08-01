'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Broadcast } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Radio, Plus, Loader2, Coins, Copy, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { getBroadcastStatus } from '@/lib/broadcast-status';

/**
 * Poll cadence while any broadcast is sending. Kept modest so we don't
 * beat on Supabase — the aggregate trigger in migration 003 keeps
 * counts consistent; we just need to surface the freshest snapshot.
 */
const POLL_INTERVAL_MS = 5_000;

interface SmsBroadcast {
  id: string;
  name: string;
  message: string;
  status: 'sending' | 'sent' | 'failed';
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
}

interface BroadcastRow {
  id: string;
  channel: 'whatsapp' | 'sms';
  name: string;
  template_name?: string;
  status: string;
  total_recipients: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  created_at: string;
}

function percent(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 100);
}

function RateCell({
  value,
  total,
  color,
}: {
  value: number;
  total: number;
  /** Tailwind bg class for the fill, e.g. "bg-primary" */
  color: string;
}) {
  const pct = percent(value, total);
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
        {pct}%
      </span>
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-1.5 rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function BroadcastsPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [smsBroadcasts, setSmsBroadcasts] = useState<SmsBroadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Used to kick off polling only while something is actively sending.
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [retryTarget, setRetryTarget] = useState<BroadcastRow | null>(null);
  const [retrying, setRetrying] = useState(false);

  async function fetchBroadcasts() {
    try {
      const supabase = createClient();
      const [waRes, smsRes] = await Promise.all([
        supabase.from('broadcasts').select('*').order('created_at', { ascending: false }),
        supabase.from('sms_broadcasts').select('*').order('created_at', { ascending: false }),
      ]);
      if (waRes.error) throw waRes.error;
      if (smsRes.error) throw smsRes.error;
      setBroadcasts(waRes.data ?? []);
      setSmsBroadcasts(smsRes.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load broadcasts');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBroadcasts();
  }, []);

  /**
   * Re-send a failed SMS broadcast to its failed recipients as a new
   * broadcast. The original row stays untouched so the failure is kept
   * for tracking; the retry appears as a separate row.
   */
  async function handleRetry() {
    if (!retryTarget) return;
    setRetrying(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        throw new Error('You are not signed in.');
      }

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('user_id', user.id)
        .single();

      if (!userProfile?.business_id) {
        throw new Error('Unable to determine your business.');
      }

      const res = await fetch('/api/sms/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: userProfile.business_id,
          sourceBroadcastId: retryTarget.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to retry SMS broadcast');
      }

      toast.success(`Retry sent to ${data.total} recipients`);
      setRetryTarget(null);
      fetchBroadcasts();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Retry failed';
      console.error('SMS retry failed:', err);
      toast.error(message);
    } finally {
      setRetrying(false);
    }
  }

  const anySending = useMemo(
    () =>
      broadcasts.some((b) => b.status === 'sending') ||
      smsBroadcasts.some((b) => b.status === 'sending'),
    [broadcasts, smsBroadcasts],
  );

  useEffect(() => {
    function startPolling() {
      if (pollTimer.current) return;
      pollTimer.current = setInterval(fetchBroadcasts, POLL_INTERVAL_MS);
    }
    function stopPolling() {
      if (!pollTimer.current) return;
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }

    // Pause polling while the tab is hidden — keeps Supabase cold when
    // the user is away, and ensures a fresh fetch the moment they
    // refocus so they don't see stale data on return.
    function handleVisibilityChange() {
      if (!anySending) return;
      if (document.visibilityState === 'hidden') {
        stopPolling();
      } else {
        fetchBroadcasts();
        startPolling();
      }
    }

    if (anySending && document.visibilityState === 'visible') {
      startPolling();
    } else {
      stopPolling();
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [anySending]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <p className="text-sm text-red-400">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  const rows: BroadcastRow[] = [
    ...broadcasts.map((b) => ({
      id: b.id,
      channel: 'whatsapp' as const,
      name: b.name,
      template_name: b.template_name,
      status: b.status,
      total_recipients: b.total_recipients,
      delivered_count: b.delivered_count,
      read_count: b.read_count,
      failed_count: b.failed_count ?? 0,
      created_at: b.created_at,
    })),
    ...smsBroadcasts.map((b) => ({
      id: b.id,
      channel: 'sms' as const,
      name: b.name,
      template_name: 'SMS Message',
      status: b.status,
      total_recipients: b.total_recipients,
      delivered_count: 0,
      read_count: 0,
      failed_count: b.failed_count,
      created_at: b.created_at,
    })),
  ].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <div className="space-y-6">
      {/* Top indeterminate progress bar: only visible while a broadcast
          is mid-send. Pure CSS animation so no extra deps. */}
      {anySending && (
        <div
          role="progressbar"
          aria-label="Broadcast in progress"
          className="broadcast-indeterminate fixed inset-x-0 top-0 z-40 h-0.5 overflow-hidden bg-muted"
        >
          <div className="broadcast-indeterminate-bar h-0.5 bg-primary" />
          <style jsx>{`
            .broadcast-indeterminate-bar {
              width: 33%;
              transform: translateX(-100%);
              animation: broadcast-slide 1.6s cubic-bezier(0.4, 0, 0.2, 1)
                infinite;
            }
            @keyframes broadcast-slide {
              0% {
                transform: translateX(-100%);
              }
              100% {
                transform: translateX(400%);
              }
            }
          `}</style>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Broadcasts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Send bulk messages to your contacts using approved templates.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {profile?.business?.credits_remaining !== undefined && (
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-500 self-start sm:self-center">
              <Coins className="h-4 w-4" />
              <span>{profile.business.credits_remaining.toLocaleString()} Credits Remaining</span>
            </div>
          )}
          <Button
            onClick={() => router.push('/broadcasts/new')}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Broadcast
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-border bg-card">
          <Radio className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No broadcasts yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create your first broadcast to reach your contacts at scale.
          </p>
          <Button
            onClick={() => router.push('/broadcasts/new')}
            className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Broadcast
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Name</TableHead>
                <TableHead className="hidden text-muted-foreground md:table-cell">Template</TableHead>
                <TableHead className="hidden text-right text-muted-foreground sm:table-cell">
                  Recipients
                </TableHead>
                <TableHead className="hidden text-muted-foreground lg:table-cell">Delivery</TableHead>
                <TableHead className="hidden text-muted-foreground lg:table-cell">Read</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="hidden text-muted-foreground sm:table-cell">Date</TableHead>
                <TableHead className="text-right text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((broadcast) => {
                const status = getBroadcastStatus(broadcast.status);
                const isSms = broadcast.channel === 'sms';
                return (
                  <TableRow
                    key={`${broadcast.channel}-${broadcast.id}`}
                    className={
                      isSms
                        ? 'border-border hover:bg-muted/50'
                        : 'cursor-pointer border-border hover:bg-muted/50'
                    }
                    onClick={
                      isSms
                        ? undefined
                        : () => router.push(`/broadcasts/${broadcast.id}`)
                    }
                  >
                    <TableCell className="font-medium text-foreground">
                      {broadcast.name}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {isSms ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-500">
                          SMS
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{broadcast.template_name}</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-right text-muted-foreground tabular-nums sm:table-cell">
                      {broadcast.total_recipients}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {isSms ? (
                        <span className="text-xs text-muted-foreground/60">—</span>
                      ) : (
                        <RateCell
                          value={broadcast.delivered_count}
                          total={broadcast.total_recipients}
                          color="bg-primary"
                        />
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {isSms ? (
                        <span className="text-xs text-muted-foreground/60">—</span>
                      ) : (
                        <RateCell
                          value={broadcast.read_count}
                          total={broadcast.total_recipients}
                          color="bg-blue-500"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${status.classes}`}
                      >
                        {status.pulse && (
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-yellow-400" />
                          </span>
                        )}
                        {status.label}
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {new Date(broadcast.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isSms && broadcast.status === 'failed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRetryTarget(broadcast);
                            }}
                            title="Resend this broadcast to the recipients that failed"
                            className="h-7 border-destructive/30 text-destructive hover:bg-destructive/10"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Retry
                          </Button>
                        )}
                        {isSms && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/broadcasts/new?copy=${broadcast.id}`);
                            }}
                            title="Duplicate this broadcast so you can send it again (the original is kept for tracking)"
                            className="h-7 border-border text-muted-foreground hover:bg-muted"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Copy
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Retry confirmation for failed SMS broadcasts */}
      <Dialog
        open={!!retryTarget}
        onOpenChange={(open) => {
          if (!open) setRetryTarget(null);
        }}
      >
        <DialogContent className="border-border bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Retry SMS Broadcast</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Resend{' '}
              <span className="font-medium text-foreground">
                {retryTarget?.failed_count ?? 0}
              </span>{' '}
              failed recipient{retryTarget?.failed_count === 1 ? '' : 's'} of{' '}
              <span className="font-medium text-foreground">{retryTarget?.name}</span>?
              A new broadcast will be created and the original is kept for tracking.
              Credits are only charged if the gateway accepts the send.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRetryTarget(null)}
              disabled={retrying}
              className="border-border text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRetry}
              disabled={retrying}
              className="bg-destructive text-white hover:bg-destructive/90 disabled:opacity-50"
            >
              {retrying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              {retrying ? 'Retrying…' : 'Retry Now'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


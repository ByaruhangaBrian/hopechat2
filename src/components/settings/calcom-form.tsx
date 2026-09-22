'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarCheck, Info, KeyRound, Link2, Loader2, Unplug, UserRound } from 'lucide-react';

interface CalComStatus {
  configured: boolean;
  api_key_masked: string | null;
  username: string;
}

export function CalComForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [status, setStatus] = useState<CalComStatus>({ configured: false, api_key_masked: null, username: '' });
  const [apiKey, setApiKey] = useState('');
  const [username, setUsername] = useState('');

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/calcom', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setStatus({
          configured: data.configured,
          api_key_masked: data.api_key_masked ?? null,
          username: data.username ?? '',
        });
      }
    } catch (err) {
      console.error('[calcom] fetch failed:', err);
      toast.error('Failed to load Cal.com settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSave = async () => {
    if (!apiKey.trim() && !username.trim()) {
      toast.error('Enter an API key or a username to continue');
      return;
    }
    try {
      setSaving(true);
      const res = await fetch('/api/integrations/calcom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey.trim(), username: username.trim() }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data.error || 'Connection failed');

      setApiKey('');
      setStatus({
        configured: true,
        api_key_masked: data.api_key_masked ?? null,
        username: data.username ?? username.trim(),
      });
      toast.success('Cal.com connected — you can manage links on the Bookings page');
    } catch (err: any) {
      console.error('[calcom] save failed:', err);
      toast.error(err.message || 'Failed to connect Cal.com');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    const confirmed = window.confirm(
      'Disconnect Cal.com? Booking links will stop working and your Cal.com API key will be removed. Past bookings stay in the dashboard.',
    );
    if (!confirmed) return;

    try {
      setDisconnecting(true);
      const res = await fetch('/api/integrations/calcom', { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Disconnect failed');

      setStatus({ configured: false, api_key_masked: null, username: '' });
      setApiKey('');
      setUsername('');
      toast.success('Cal.com disconnected');
    } catch (err: any) {
      console.error('[calcom] disconnect failed:', err);
      toast.error(err.message || 'Failed to disconnect Cal.com');
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) return <div className="text-muted-foreground">Loading Cal.com configuration...</div>;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheck className="size-5 text-blue-500" />
            <CardTitle className="text-foreground">Cal.com Integration</CardTitle>
          </div>
          {status.configured && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
              Connected
            </span>
          )}
        </div>
        <CardDescription>
          Let customers book appointments via your Cal.com links and see who booked on the Bookings page.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex gap-3">
          <Info className="size-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-600 dark:text-blue-100 leading-relaxed w-full">
            <p className="font-semibold text-blue-600 dark:text-blue-100 mb-1">Connect</p>
            <ol className="list-decimal ml-4 space-y-1">
              <li>Create an API key at Cal.com → Settings → Security.</li>
              <li>Paste the key (starts with <span className="font-mono">cal_</span> or <span className="font-mono">cal_live_</span>) and your Cal.com username below.</li>
              <li>Toggle which event types are bookable and copy their links on the Bookings page.</li>
            </ol>
          </div>
        </div>

        {status.configured && (
          <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <UserRound className="size-4" /> {status.username}
              </span>
              <span className="flex items-center gap-2 text-muted-foreground font-mono text-xs">
                <KeyRound className="size-4" /> {status.api_key_masked}
              </span>
            </div>
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <Link2 className="size-4 shrink-0 mt-0.5" />
              Management lives on the <span className="font-medium text-foreground">Bookings</span> page — toggle event types and copy share links there.
            </p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-muted-foreground/60 text-xs uppercase tracking-wider">API Key</Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={status.configured ? status.api_key_masked || '••••••••' : 'cal_live_...'}
              className="bg-muted border-border text-foreground font-mono"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground/60 text-xs uppercase tracking-wider">Username</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={status.username || 'your-cal-com-handle'}
              className="bg-muted border-border text-foreground"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          {status.configured ? (
            <Button
              variant="outline"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="border-border text-muted-foreground hover:text-destructive"
            >
              {disconnecting ? <Loader2 className="size-4 animate-spin" /> : <Unplug className="size-4" />}
              Disconnect
            </Button>
          ) : null}
          <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
            {saving ? 'Testing…' : status.configured ? 'Reconnect / Update' : 'Save & Test'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
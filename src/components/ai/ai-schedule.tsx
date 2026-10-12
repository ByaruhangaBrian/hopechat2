'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CalendarClock, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  DEFAULT_AI_SCHEDULE,
  WEEKDAYS,
  WEEKDAY_LABELS,
  type AiSchedule,
  type Weekday,
} from '@/lib/ai/schedule';
import { getErrorMessage, getResponseErrorMessage } from '@/lib/utils';

const TIMEZONES = [
  'Africa/Kampala',
  'Africa/Nairobi',
  'Africa/Lagos',
  'Africa/Johannesburg',
  'UTC',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Los_Angeles',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
];

export function AiScheduleCard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schedule, setSchedule] = useState<AiSchedule>(DEFAULT_AI_SCHEDULE);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai-schedule');
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to load availability');
      }
      setSchedule(payload.schedule ?? DEFAULT_AI_SCHEDULE);
    } catch (err) {
      console.error('[AI Schedule] load failed:', err);
      toast.error(getErrorMessage(err, 'Unable to load AI availability'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateDay = (day: Weekday, patch: Partial<AiSchedule['days'][Weekday]>) => {
    setSchedule((prev) => ({
      ...prev,
      days: { ...prev.days, [day]: { ...prev.days[day], ...patch } },
    }));
  };

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/ai-schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedule),
      });
      if (!res.ok) {
        const message = await getResponseErrorMessage(res, 'Failed to save AI availability');
        toast.error(message);
        return;
      }
      const payload = await res.json();
      if (payload.schedule) setSchedule(payload.schedule);
      toast.success('AI availability saved');
    } catch (err) {
      console.error('[AI Schedule] save failed:', err);
      toast.error(getErrorMessage(err, 'Failed to save AI availability'));
    } finally {
      setSaving(false);
    }
  }, [schedule]);

  const controlsDisabled = loading || !schedule.enabled;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <CalendarClock className="h-5 w-5 text-primary" />
          AI availability
        </CardTitle>
        <CardDescription>
          Limit when the AI assistant replies on WhatsApp. Outside these hours the
          AI stays silent and leaves the conversation to your team.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label className="text-foreground">Only reply during set hours</Label>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Off means the AI can reply at any time.
            </p>
          </div>
          <Switch
            checked={schedule.enabled}
            onCheckedChange={(value) =>
              setSchedule((prev) => ({ ...prev, enabled: value }))
            }
            disabled={loading}
            aria-label="Only reply during set hours"
          />
        </div>

        <div className="space-y-2 max-w-xs">
          <Label className="text-muted-foreground text-xs">Timezone</Label>
          <select
            className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground"
            value={schedule.timezone}
            disabled={controlsDisabled}
            onChange={(e) =>
              setSchedule((prev) => ({ ...prev, timezone: e.target.value }))
            }
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
            {schedule.timezone && !TIMEZONES.includes(schedule.timezone) ? (
              <option value={schedule.timezone}>{schedule.timezone}</option>
            ) : null}
          </select>
        </div>

        <div className="space-y-3">
          {WEEKDAYS.map((day) => {
            const window = schedule.days[day];
            return (
              <div key={day} className="flex flex-wrap items-center gap-3">
                <Switch
                  checked={window.enabled}
                  onCheckedChange={(value) => updateDay(day, { enabled: value })}
                  disabled={controlsDisabled}
                  aria-label={`${WEEKDAY_LABELS[day]} enabled`}
                />
                <span className="w-24 text-sm text-foreground">
                  {WEEKDAY_LABELS[day]}
                </span>
                <Input
                  type="time"
                  value={window.from}
                  disabled={controlsDisabled || !window.enabled}
                  onChange={(e) => updateDay(day, { from: e.target.value })}
                  className="w-32 bg-muted border-border text-foreground"
                  aria-label={`${WEEKDAY_LABELS[day]} start time`}
                />
                <span className="text-sm text-muted-foreground">to</span>
                <Input
                  type="time"
                  value={window.to}
                  disabled={controlsDisabled || !window.enabled}
                  onChange={(e) => updateDay(day, { to: e.target.value })}
                  className="w-32 bg-muted border-border text-foreground"
                  aria-label={`${WEEKDAY_LABELS[day]} end time`}
                />
                {!window.enabled && (
                  <span className="text-xs text-muted-foreground/60">Closed</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground/60">
            {loading
              ? 'Loading availability…'
              : schedule.enabled
                ? 'Replying only within the hours above.'
                : 'Replying at all hours.'}
          </div>
          <Button
            onClick={handleSave}
            disabled={loading || saving}
            className="bg-primary hover:bg-primary/90"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {saving ? 'Saving…' : 'Save availability'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

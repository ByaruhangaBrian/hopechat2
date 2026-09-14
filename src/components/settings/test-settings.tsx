'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Save, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const DEFAULT_TIMEOUT_HOURS = 2;

export function TestSettings() {
  const supabase = createClient();
  const { profile } = useAuth();
  const businessId = profile?.business_id ?? null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [timeoutHours, setTimeoutHours] = useState<number>(DEFAULT_TIMEOUT_HOURS);

  useEffect(() => {
    async function load() {
      if (!businessId) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('business_settings')
        .select('value')
        .eq('business_id', businessId)
        .maybeSingle();

      const hours = Number(data?.value?.session_timeout_hours);
      if (Number.isFinite(hours) && hours > 0) setTimeoutHours(hours);
      setLoading(false);
    }
    load();
  }, [supabase, businessId]);

  async function handleSave() {
    if (!businessId) return;
    const hours = Math.max(0, Math.round(timeoutHours || 0));
    setSaving(true);
    const { error } = await supabase
      .from('business_settings')
      .upsert({
        business_id: businessId,
        value: { session_timeout_hours: hours },
        updated_at: new Date().toISOString(),
      });

    if (error) {
      toast.error('Failed to save test settings');
    } else {
      toast.success(
        hours > 0
          ? `Test sessions now close after ${hours} hour(s) of inactivity`
          : 'Test sessions never close from inactivity',
      );
    }
    setSaving(false);
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Clock className="h-5 w-5 text-primary" />
          Tests &amp; Practice Session Settings
        </CardTitle>
        <CardDescription>
          Control how long an idle WhatsApp session stays open for your students.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-muted/50 border border-border rounded-lg p-4 text-xs leading-relaxed text-muted-foreground">
          <p className="mb-2">
            When a student goes quiet mid-test, their session stays open and can block the
            next attempt from starting. Set an inactivity timeout here and the session is
            automatically closed — the student just sends a message to begin a fresh one.
          </p>
          <p>
            <strong>Timed tests are exempt</strong>: they keep their own countdown and are
            closed by their duration instead.
          </p>
        </div>

        <div className="space-y-2 max-w-xs">
          <Label className="text-muted-foreground text-xs">
            Close idle sessions after (hours)
          </Label>
          <Input
            type="number"
            min={0}
            step={0.5}
            value={timeoutHours}
            disabled={loading}
            onChange={(e) => setTimeoutHours(Number(e.target.value))}
          />
          <p className="text-[11px] text-muted-foreground/60">
            {timeoutHours > 0
              ? `Sessions close after ${timeoutHours} hour(s) without a student reply.`
              : '0 disables the inactivity close.'}
          </p>
        </div>

        <div className="flex justify-end border-t border-border pt-6">
          <Button onClick={handleSave} disabled={saving || loading || !businessId} className="bg-primary hover:bg-primary/90">
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {saving ? 'Saving...' : 'Save Test Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
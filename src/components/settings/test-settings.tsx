'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Save, Clock, Bot } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const DEFAULT_TIMEOUT_HOURS = 2;

export function TestSettings() {
  const supabase = createClient();
  const { profile } = useAuth();
  const businessId = profile?.business_id ?? null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [timeoutHours, setTimeoutHours] = useState<number>(DEFAULT_TIMEOUT_HOURS);
  const [enableAiOffers, setEnableAiOffers] = useState(true);

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
      setEnableAiOffers(data?.value?.enable_ai_test_offers !== false);
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
        value: {
          session_timeout_hours: hours,
          enable_ai_test_offers: enableAiOffers,
        },
        updated_at: new Date().toISOString(),
      });

    if (error) {
      toast.error('Failed to save test settings');
    } else {
      toast.success(
        `Saved. AI ${enableAiOffers ? 'can' : 'cannot'} offer tests; idle sessions close after ${hours} hour(s).`,
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
          Control how your WhatsApp tests behave for your students.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Bot className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <Label className="text-foreground">AI can offer your tests</Label>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  When on, the AI assistant recognizes when a student wants to take
                  a test and asks to confirm with <strong>Start</strong> /{' '}
                  <strong>Not Now</strong> buttons before it runs. Off keeps tests
                  AI-independent (keyword automations and entry-test screening
                  still work exactly as before).
                </p>
              </div>
            </div>
            <Switch
              checked={enableAiOffers}
              onCheckedChange={setEnableAiOffers}
              disabled={loading}
              aria-label="Allow the AI assistant to offer your tests"
            />
          </div>
        </div>

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
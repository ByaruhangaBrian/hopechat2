'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Save, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  DEFAULT_ESCALATION_POLICY,
  type EscalationPolicy,
} from '@/lib/ai/escalation';
import { getErrorMessage, getResponseErrorMessage } from '@/lib/utils';

export function AiEscalationCard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState<EscalationPolicy>(DEFAULT_ESCALATION_POLICY);
  const [keywordsText, setKeywordsText] = useState(
    DEFAULT_ESCALATION_POLICY.keywords.join(', '),
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai-escalation');
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to load escalation settings');
      }
      const loaded: EscalationPolicy = payload.policy ?? DEFAULT_ESCALATION_POLICY;
      setPolicy(loaded);
      setKeywordsText(loaded.keywords.join(', '));
    } catch (err) {
      console.error('[AI Escalation] load failed:', err);
      toast.error(getErrorMessage(err, 'Unable to load escalation settings'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = useCallback(async () => {
    const keywords = keywordsText
      .split(',')
      .map((keyword) => keyword.trim())
      .filter(Boolean);

    try {
      setSaving(true);
      const res = await fetch('/api/ai-escalation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...policy, keywords }),
      });
      if (!res.ok) {
        const message = await getResponseErrorMessage(res, 'Failed to save escalation settings');
        toast.error(message);
        return;
      }
      const payload = await res.json();
      if (payload.policy) {
        setPolicy(payload.policy);
        setKeywordsText(payload.policy.keywords.join(', '));
      }
      toast.success('Escalation settings saved');
    } catch (err) {
      console.error('[AI Escalation] save failed:', err);
      toast.error(getErrorMessage(err, 'Failed to save escalation settings'));
    } finally {
      setSaving(false);
    }
  }, [policy, keywordsText]);

  const controlsDisabled = loading || !policy.enabled;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <ShieldAlert className="h-5 w-5 text-primary" />
          Escalation to a human
        </CardTitle>
        <CardDescription>
          When the AI can&apos;t help — or a customer asks for a person — flag the
          conversation so your team can take over.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label className="text-foreground">Escalate when a human is needed</Label>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Off means the AI never hands conversations off automatically.
            </p>
          </div>
          <Switch
            checked={policy.enabled}
            onCheckedChange={(value) =>
              setPolicy((prev) => ({ ...prev, enabled: value }))
            }
            disabled={loading}
            aria-label="Escalate when a human is needed"
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <Label className="text-foreground">Pause the AI while escalated</Label>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Stop automated replies until an agent takes over or returns the
              conversation to the AI.
            </p>
          </div>
          <Switch
            checked={policy.autoPauseAi}
            onCheckedChange={(value) =>
              setPolicy((prev) => ({ ...prev, autoPauseAi: value }))
            }
            disabled={controlsDisabled}
            aria-label="Pause the AI while escalated"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-muted-foreground text-xs">Trigger keywords</Label>
          <Input
            value={keywordsText}
            disabled={controlsDisabled}
            onChange={(e) => setKeywordsText(e.target.value)}
            placeholder="human, agent, refund, complaint"
            className="bg-muted border-border text-foreground"
            aria-label="Trigger keywords"
          />
          <p className="text-xs text-muted-foreground/60">
            Comma-separated. Matched on word boundaries, ignoring case.
          </p>
        </div>

        <div className="space-y-2 max-w-xs">
          <Label className="text-muted-foreground text-xs">Contact tag</Label>
          <Input
            value={policy.tagName}
            disabled={controlsDisabled}
            onChange={(e) =>
              setPolicy((prev) => ({ ...prev, tagName: e.target.value }))
            }
            placeholder="Needs human"
            maxLength={40}
            className="bg-muted border-border text-foreground"
            aria-label="Contact tag applied on escalation"
          />
          <p className="text-xs text-muted-foreground/60">
            Applied to the contact when a conversation is escalated.
          </p>
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground/60">
            {loading
              ? 'Loading escalation settings…'
              : policy.enabled
                ? 'The AI will hand off and flag the inbox when needed.'
                : 'Escalation is off.'}
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
            {saving ? 'Saving…' : 'Save escalation'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

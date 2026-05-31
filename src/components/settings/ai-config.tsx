'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getErrorMessage, getResponseErrorMessage } from '@/lib/utils';

interface AiSettingsPayload {
    gemini_api_key?: string;
    system_prompt: string;
    training_documents: string[];
    is_enabled: boolean;
}

const DEFAULT_PROMPT = 'You are a helpful customer service AI assistant.';

export function AiConfig() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEnabled, setIsEnabled] = useState(false);
    const [hasApiKey, setHasApiKey] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [apiKeyEdited, setApiKeyEdited] = useState(false);
    const [systemPrompt, setSystemPrompt] = useState(DEFAULT_PROMPT);
    const [trainingDocuments, setTrainingDocuments] = useState('');

    const fetchSettings = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/ai-settings');
            const payload = await res.json();
            if (!res.ok) {
                throw new Error(payload.error || 'Failed to load AI settings');
            }

            const settings = payload.settings ?? {};
            setIsEnabled(Boolean(settings.is_enabled));
            setHasApiKey(Boolean(settings.has_api_key));
            setApiKey('');
            setApiKeyEdited(false);
            setSystemPrompt(settings.system_prompt || DEFAULT_PROMPT);
            setTrainingDocuments((settings.training_documents ?? []).join('\n\n---\n\n'));
        } catch (err) {
            console.error('[AI Settings] fetch failed:', err);
            toast.error('Unable to load AI settings');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const handleSave = useCallback(async () => {
        if (isEnabled && !apiKeyEdited && !hasApiKey) {
            toast.error('Please provide a Gemini API key before enabling AI.');
            return;
        }

        const docs = trainingDocuments
            .split(/^\s*---\s*$/m)
            .map((doc) => doc.trim())
            .filter(Boolean);

        const payload: AiSettingsPayload = {
            system_prompt: systemPrompt.trim() || DEFAULT_PROMPT,
            training_documents: docs,
            is_enabled: isEnabled,
        };

        if (apiKeyEdited) {
            payload.gemini_api_key = apiKey.trim();
        }

        try {
            setSaving(true);
            const res = await fetch('/api/ai-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const message = await getResponseErrorMessage(res, 'Failed to save AI settings');
                toast.error(message);
                return;
            }
            toast.success('AI settings saved');
            await fetchSettings();
        } catch (err) {
            console.error('[AI Settings] save failed:', err);
            toast.error(getErrorMessage(err, 'Failed to save AI settings'));
        } finally {
            setSaving(false);
        }
    }, [apiKey, apiKeyEdited, fetchSettings, hasApiKey, isEnabled, systemPrompt, trainingDocuments]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>AI Assistant</CardTitle>
                <CardDescription>
                    Configure Gemini AI for automated WhatsApp replies, training documents, and system prompts.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
                    <Label htmlFor="ai-enabled">Enable AI automation</Label>
                    <div className="flex items-center gap-3">
                        <Switch
                            id="ai-enabled"
                            checked={isEnabled}
                            onCheckedChange={setIsEnabled}
                        />
                        <span className="text-sm text-muted-foreground">
                            When enabled, automations can send AI-generated responses.
                        </span>
                    </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-start">
                    <Label htmlFor="gemini-api-key">Gemini API Key</Label>
                    <div className="space-y-2">
                        <Input
                            id="gemini-api-key"
                            type="password"
                            value={apiKey}
                            onChange={(e) => {
                                setApiKey(e.target.value);
                                setApiKeyEdited(true);
                            }}
                            placeholder={hasApiKey ? 'Leave blank to keep existing key' : 'Enter your Gemini API key'}
                            className="bg-muted border-border text-foreground"
                        />
                        <p className="text-xs text-muted-foreground/60">
                            Your API key is encrypted and stored securely. {hasApiKey ? 'Existing key is already configured.' : 'A valid key is required to enable AI.'}
                        </p>
                    </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-start">
                    <Label htmlFor="system-prompt">System prompt</Label>
                    <div className="space-y-2">
                        <Textarea
                            id="system-prompt"
                            value={systemPrompt}
                            onChange={(e) => setSystemPrompt(e.target.value)}
                            placeholder={DEFAULT_PROMPT}
                            className="min-h-[140px] bg-muted border-border text-foreground"
                        />
                    </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-start">
                    <Label htmlFor="training-documents">Training documents</Label>
                    <div className="space-y-2">
                        <Textarea
                            id="training-documents"
                            value={trainingDocuments}
                            onChange={(e) => setTrainingDocuments(e.target.value)}
                            placeholder="Enter optional training documents separated by ---"
                            className="min-h-[140px] bg-muted border-border text-foreground"
                        />
                        <p className="text-xs text-muted-foreground/60">
                            Provide long-form context or documents separated by <strong>---</strong>.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-muted-foreground/60">
                        {loading ? 'Loading AI settings…' : hasApiKey ? 'Gemini key is configured.' : 'AI is not configured.'}
                    </div>
                    <Button
                        onClick={handleSave}
                        disabled={loading || saving}
                    >
                        {saving ? 'Saving…' : 'Save AI settings'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}


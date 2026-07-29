'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Info, Save, TableProperties, Database } from 'lucide-react';
import { SpreadsheetManager } from './spreadsheet-manager';

export function GoogleSheetsForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [config, setConfig] = useState({
    client_email: '',
    private_key: '',
  });
  const [hasLocalKeys, setHasLocalKeys] = useState(false);
  const [globalBotEmail, setGlobalBotEmail] = useState('');
  const [view, setView] = useState<'auth' | 'spreadsheets'>('auth');

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations?type=google_sheets');
      const data = await res.json();
      
      if (data.integration) {
        setIsEnabled(data.integration.is_enabled);
        setConfig({
          client_email: data.integration.config.client_email || '',
          private_key: '', // Never fetch back the private key
        });
        setHasLocalKeys(!!data.integration.config.private_key);
      }
      
      if (data.global_bot_email) {
        setGlobalBotEmail(data.global_bot_email);
      }
    } catch (err) {
      console.error('[google-sheets] fetch failed:', err);
      toast.error('Failed to load Google Sheets settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'google_sheets',
          is_enabled: isEnabled,
          config: {
            client_email: config.client_email,
            private_key: config.private_key,
          }
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Save failed');
      }
      
      toast.success('Settings saved successfully');
      fetchSettings();
    } catch (err: any) {
      console.error('[google-sheets] save failed:', err);
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-muted-foreground">Loading Google Sheets configuration...</div>;

  if (view === 'spreadsheets') {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => setView('auth')} className="text-muted-foreground hover:text-foreground">
          ← Back to Auth Configuration
        </Button>
        <SpreadsheetManager globalBotEmail={globalBotEmail} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TableProperties className="size-5 text-emerald-500" />
              <CardTitle className="text-foreground">Google Sheets Integration</CardTitle>
            </div>
            <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
          </div>
          <CardDescription>
            Enable your AI and Automations to read data from your spreadsheets.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex gap-3">
            <Info className="size-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-600 dark:text-blue-100 leading-relaxed w-full">
              <p className="font-semibold text-blue-600 dark:text-blue-100 mb-1">How it works</p>
              <ol className="list-decimal ml-4 space-y-1">
                <li>Configure the service account below (or use the system default).</li>
                <li>Add one or more spreadsheets that HopeChat AI can search.</li>
                <li>Customers ask questions on WhatsApp — the AI finds answers in your sheets.</li>
              </ol>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Default Bot Email (System)</Label>
            <div className="flex gap-2">
              <Input 
                value={globalBotEmail || 'Not configured by admin'} 
                readOnly 
                className="bg-muted border-border text-muted-foreground font-mono text-xs" 
              />
              <Button 
                variant="outline" 
                size="sm" 
                className="border-border h-10"
                onClick={() => {
                  navigator.clipboard.writeText(globalBotEmail);
                  toast.success('Email copied');
                }}
              >
                Copy
              </Button>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <Label className="text-muted-foreground">Service Account (Advanced)</Label>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground/60 text-xs uppercase tracking-wider">Client Email</Label>
                <Input
                  value={config.client_email}
                  onChange={(e) => setConfig({ ...config, client_email: e.target.value })}
                  placeholder="my-bot@project.iam.gserviceaccount.com"
                  className="bg-muted border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground/60 text-xs uppercase tracking-wider">Private Key</Label>
                <Textarea
                  value={config.private_key}
                  onChange={(e) => setConfig({ ...config, private_key: e.target.value })}
                  placeholder={hasLocalKeys ? '••••••••••••••••' : 'Paste private key here (PEM format)'}
                  className="bg-muted border-border text-foreground font-mono text-xs min-h-[80px]"
                  rows={4}
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground/60">
              Leave these blank to use the system default bot. If provided, they override the default.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setView('spreadsheets')}
              className="gap-1.5"
            >
              <Database className="size-4" />
              Manage Spreadsheets
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Save className="mr-2 size-4" />
              {saving ? 'Saving...' : 'Save Auth Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


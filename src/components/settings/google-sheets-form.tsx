'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Info, Save, TableProperties } from 'lucide-react';

export function GoogleSheetsForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [config, setConfig] = useState({
    spreadsheet_id: '',
    client_email: '',
    private_key: '',
  });
  const [hasLocalKeys, setHasLocalKeys] = useState(false);
  const [globalBotEmail, setGlobalBotEmail] = useState('');

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations?type=google_sheets');
      const data = await res.json();
      
      if (data.integration) {
        setIsEnabled(data.integration.is_enabled);
        setConfig({
          spreadsheet_id: data.integration.config.spreadsheet_id || '',
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
    if (!config.spreadsheet_id) {
      toast.error('Spreadsheet ID is required');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'google_sheets',
          is_enabled: isEnabled,
          config: {
            spreadsheet_id: config.spreadsheet_id,
            client_email: config.client_email,
            private_key: config.private_key, // Only sends if provided
          }
        }),
      });

      if (!res.ok) throw new Error('Save failed');
      
      toast.success('Settings saved successfully');
      fetchSettings();
    } catch (err) {
      console.error('[google-sheets] save failed:', err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-slate-400">Loading Google Sheets configuration...</div>;

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TableProperties className="size-5 text-emerald-500" />
              <CardTitle className="text-white">Google Sheets Configuration</CardTitle>
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
            <div className="text-sm text-blue-100 leading-relaxed">
              <p className="font-semibold mb-1">Quick Setup:</p>
              <ol className="list-decimal ml-4 space-y-1">
                <li>Share your Google Sheet with the bot email below as a <strong>Viewer</strong>.</li>
                <li>Copy your Spreadsheet ID from the URL and paste it here.</li>
                <li>(Optional) Provide your own Service Account if you prefer private credentials.</li>
              </ol>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Default Bot Email (System)</Label>
            <div className="flex gap-2">
              <Input 
                value={globalBotEmail || 'Not configured by admin'} 
                readOnly 
                className="bg-muted border-slate-700 text-slate-400 font-mono text-xs" 
              />
              <Button 
                variant="outline" 
                size="sm" 
                className="border-slate-700 h-10"
                onClick={() => {
                  navigator.clipboard.writeText(globalBotEmail);
                  toast.success('Email copied');
                }}
              >
                Copy
              </Button>
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-border">
            <Label className="text-slate-300">Spreadsheet ID</Label>
            <Input
              value={config.spreadsheet_id}
              onChange={(e) => setConfig({ ...config, spreadsheet_id: e.target.value })}
              placeholder="e.g. 1aBCDeFGhIJKlMnOpqRStUvWxYz1234567890"
              className="bg-muted border-slate-700 text-white"
            />
            <p className="text-[10px] text-slate-500 italic">
              Found in the URL: docs.google.com/spreadsheets/d/<strong>[SPREADSHEET_ID]</strong>/edit
            </p>
          </div>

          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <Label className="text-slate-300">Custom Service Account (Advanced)</Label>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-slate-400 text-xs uppercase tracking-wider">Client Email</Label>
                <Input
                  value={config.client_email}
                  onChange={(e) => setConfig({ ...config, client_email: e.target.value })}
                  placeholder="my-bot@project.iam.gserviceaccount.com"
                  className="bg-muted border-slate-700 text-slate-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400 text-xs uppercase tracking-wider">Private Key</Label>
                <Input
                  type="password"
                  value={config.private_key}
                  onChange={(e) => setConfig({ ...config, private_key: e.target.value })}
                  placeholder={hasLocalKeys ? '••••••••••••••••' : 'Paste private key here'}
                  className="bg-muted border-slate-700 text-slate-200"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-500">
              Leave these blank to use the system default bot. If provided, they will override the default.
            </p>
          </div>

          <div className="flex justify-end pt-4">
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-primary hover:bg-primary"
            >
              <Save className="mr-2 size-4" />
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


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
  const [showGuide, setShowGuide] = useState(false);
  const [config, setConfig] = useState({
    spreadsheet_id: '',
    client_email: '',
    private_key: '',
    reference_column: '',
    return_columns: '',
  });
  const [hasLocalKeys, setHasLocalKeys] = useState(false);
  const [globalBotEmail, setGlobalBotEmail] = useState('');

  const extractSpreadsheetId = (val: string): string => {
    const match = val.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : val.trim();
  };

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
          reference_column: data.integration.config.reference_column || '',
          return_columns: data.integration.config.return_columns || '',
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
    const sheetId = extractSpreadsheetId(config.spreadsheet_id);
    if (!sheetId) {
      toast.error('Spreadsheet ID or Google Sheets URL is required');
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
            spreadsheet_id: sheetId,
            client_email: config.client_email,
            private_key: config.private_key, // Only sends if provided
            reference_column: config.reference_column,
            return_columns: config.return_columns,
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

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TableProperties className="size-5 text-emerald-500" />
              <CardTitle className="text-foreground">Google Sheets Configuration</CardTitle>
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
              <div className="flex justify-between items-center mb-1">
                <p className="font-semibold text-blue-600 dark:text-blue-100">Setup Instructions & Examples</p>
                <Button 
                  variant="link" 
                  size="sm" 
                  className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 h-auto p-0 font-medium text-xs"
                  onClick={() => setShowGuide(!showGuide)}
                >
                  {showGuide ? 'Hide Guide' : 'Show Guide'}
                </Button>
              </div>
              <ol className="list-decimal ml-4 space-y-1">
                <li>Share your Google Sheet with the bot email below as a <strong>Viewer</strong>.</li>
                <li>Paste your full Google Sheet Link (from the browser address bar) into the field below.</li>
                <li>Set the Reference Column and Return Columns to define what keys the AI searches.</li>
              </ol>
              
              {showGuide && (
                <div className="mt-4 pt-4 border-t border-blue-500/20 text-xs space-y-3 text-foreground/80">
                  <div>
                    <p className="font-semibold text-blue-700 dark:text-blue-200">How the AI lookup works:</p>
                    <p className="text-muted-foreground mt-0.5 leading-relaxed">
                      When customers message you on WhatsApp (e.g. "What is my order status?"), the AI checks if a Reference Column is configured. It will prompt the customer to provide their identifier (e.g. "Please provide your Order ID"). Once provided, it searches for a matching row and replies with ONLY the permitted Return Columns.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="p-3 bg-muted/50 rounded border border-border">
                      <p className="font-semibold text-foreground mb-1">Example A: E-Commerce Store</p>
                      <ul className="space-y-1 text-muted-foreground list-disc ml-3">
                        <li><strong>Reference Column:</strong> <code className="bg-muted px-1 py-0.5 rounded font-mono">Order ID</code></li>
                        <li><strong>Return Columns:</strong> <code className="bg-muted px-1 py-0.5 rounded font-mono">Status, Delivery Date, Tracking ID</code></li>
                        <li><strong>AI flow:</strong> Customer asks for order details. AI requests Order ID, queries sheet, and reports the status and tracking details (while hiding profit margin, address, or cost columns).</li>
                      </ul>
                    </div>
                    <div className="p-3 bg-muted/50 rounded border border-border">
                      <p className="font-semibold text-foreground mb-1">Example B: School Results Portal</p>
                      <ul className="space-y-1 text-muted-foreground list-disc ml-3">
                        <li><strong>Reference Column:</strong> <code className="bg-muted px-1 py-0.5 rounded font-mono">Student ID</code></li>
                        <li><strong>Return Columns:</strong> <code className="bg-muted px-1 py-0.5 rounded font-mono">Math Grade, Science Grade, GPA</code></li>
                        <li><strong>AI flow:</strong> Student asks for grades. AI requests Student ID, queries sheet, and reports grades.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
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

          <div className="space-y-2 pt-4 border-t border-border">
            <Label className="text-muted-foreground">Google Sheet Link or Spreadsheet ID</Label>
            <Input
              value={config.spreadsheet_id}
              onChange={(e) => setConfig({ ...config, spreadsheet_id: e.target.value })}
              placeholder="Paste Google Sheet URL or Spreadsheet ID here"
              className="bg-muted border-border text-foreground"
            />
            <p className="text-[10px] text-muted-foreground/60 italic">
              You can paste the entire browser URL (e.g. https://docs.google.com/spreadsheets/d/.../edit) or just the ID.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t border-border">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Reference Column (Search Key)</Label>
              <Input
                value={config.reference_column}
                onChange={(e) => setConfig({ ...config, reference_column: e.target.value })}
                placeholder="e.g. Order ID, Student ID"
                className="bg-muted border-border text-foreground"
              />
              <p className="text-[10px] text-muted-foreground/60 italic">
                The column name containing the unique ID (e.g. order number) to search for.
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Return Columns (Allowed Fields)</Label>
              <Input
                value={config.return_columns}
                onChange={(e) => setConfig({ ...config, return_columns: e.target.value })}
                placeholder="e.g. Status, Delivery Date, Score"
                className="bg-muted border-border text-foreground"
              />
              <p className="text-[10px] text-muted-foreground/60 italic">
                Comma-separated list of column headers the AI is allowed to read and return to the client. Leave blank to return all.
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <Label className="text-muted-foreground">Custom Service Account (Advanced)</Label>
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
                <Input
                  type="password"
                  value={config.private_key}
                  onChange={(e) => setConfig({ ...config, private_key: e.target.value })}
                  placeholder={hasLocalKeys ? '••••••••••••••••' : 'Paste private key here'}
                  className="bg-muted border-border text-foreground"
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground/60">
              Leave these blank to use the system default bot. If provided, they will override the default.
            </p>
          </div>

          <div className="flex justify-end pt-4">
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
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


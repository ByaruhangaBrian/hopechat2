'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { TableProperties, Plus, Pencil, Trash2, ExternalLink, Info, Copy, AlertCircle } from 'lucide-react';
import { BusinessSpreadsheet } from '@/types';

export function SpreadsheetManager({ globalBotEmail }: { globalBotEmail?: string }) {
  const [spreadsheets, setSpreadsheets] = useState<BusinessSpreadsheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    spreadsheet_url: '',
    sheet_name: 'Sheet1',
    reference_column: '',
    return_columns: '',
    is_enabled: true,
  });

  const extractSpreadsheetId = (val: string): string => {
    const match = val.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : val.trim();
  };

  const fetchSpreadsheets = async () => {
    try {
      const res = await fetch('/api/integrations/google-sheets/spreadsheets');
      const data = await res.json();
      setSpreadsheets(data.spreadsheets || []);
    } catch (err) {
      toast.error('Failed to load spreadsheets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpreadsheets();
  }, []);

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      spreadsheet_url: '',
      sheet_name: 'Sheet1',
      reference_column: '',
      return_columns: '',
      is_enabled: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const openEdit = (sheet: BusinessSpreadsheet) => {
    setForm({
      name: sheet.name,
      description: sheet.description || '',
      spreadsheet_url: sheet.spreadsheet_id,
      sheet_name: sheet.sheet_name || 'Sheet1',
      reference_column: sheet.reference_column,
      return_columns: sheet.return_columns || '',
      is_enabled: sheet.is_enabled,
    });
    setEditingId(sheet.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    const sheetId = extractSpreadsheetId(form.spreadsheet_url);
    if (!form.name.trim()) { toast.error('Spreadsheet name is required'); return; }
    if (!sheetId) { toast.error('Spreadsheet ID or URL is required'); return; }
    if (!form.reference_column.trim()) { toast.error('Reference column is required'); return; }

    setSaving(true);
    try {
      const payload: any = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        spreadsheet_id: sheetId,
        sheet_name: form.sheet_name.trim() || 'Sheet1',
        reference_column: form.reference_column.trim(),
        return_columns: form.return_columns.trim() || null,
      };

      let res;
      if (editingId) {
        res = await fetch('/api/integrations/google-sheets/spreadsheets', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...payload, is_enabled: form.is_enabled }),
        });
      } else {
        res = await fetch('/api/integrations/google-sheets/spreadsheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Save failed');
      }

      toast.success(editingId ? 'Spreadsheet updated' : 'Spreadsheet added');
      resetForm();
      fetchSpreadsheets();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/integrations/google-sheets/spreadsheets?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      toast.success('Spreadsheet removed');
      fetchSpreadsheets();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleToggle = async (sheet: BusinessSpreadsheet) => {
    try {
      const res = await fetch('/api/integrations/google-sheets/spreadsheets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sheet.id, is_enabled: !sheet.is_enabled }),
      });
      if (!res.ok) throw new Error('Toggle failed');
      fetchSpreadsheets();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) return <div className="text-muted-foreground">Loading spreadsheets...</div>;

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TableProperties className="size-5 text-emerald-500" />
              <CardTitle className="text-foreground">Connected Spreadsheets</CardTitle>
              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                {spreadsheets.length}
              </span>
            </div>
            {!showForm && (
              <Button variant="outline" size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
                <Plus className="size-4" /> Add Spreadsheet
              </Button>
            )}
          </div>
          <CardDescription>
            Add Google Sheets that HopeChat AI can search and return results to your customers on WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {globalBotEmail && (
            <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground">
              <Info className="size-4 text-blue-400 shrink-0" />
              <span>Share each sheet as <strong>Viewer</strong> with: </span>
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{globalBotEmail}</code>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-xs"
                onClick={() => { navigator.clipboard.writeText(globalBotEmail); toast.success('Copied'); }}
              >
                <Copy className="size-3" />
              </Button>
            </div>
          )}

          {spreadsheets.length === 0 && !showForm && (
            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border rounded-xl bg-muted/20">
              <TableProperties className="size-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground mb-1">No spreadsheets connected yet</p>
              <p className="text-xs text-muted-foreground/60 max-w-sm">
                Add a spreadsheet so HopeChat AI can look up orders, inventory, pricing, or any business data for your customers.
              </p>
            </div>
          )}

          {spreadsheets.map((sheet) => (
            <div
              key={sheet.id}
              className="border border-border rounded-xl p-4 space-y-3 hover:border-[oklch(0.5_0.15_170)]/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-foreground truncate">{sheet.name}</h4>
                    <Switch
                      checked={sheet.is_enabled}
                      onCheckedChange={() => handleToggle(sheet)}
                      className="scale-75"
                    />
                  </div>
                  {sheet.description && (
                    <p className="text-xs text-muted-foreground">{sheet.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(sheet)} title="Edit">
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-8 text-red-400 hover:text-red-500" onClick={() => handleDelete(sheet.id, sheet.name)} title="Delete">
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="bg-muted/40 rounded-lg p-2.5">
                  <span className="text-muted-foreground block mb-0.5">Reference Column</span>
                  <span className="font-semibold text-foreground">{sheet.reference_column}</span>
                </div>
                <div className="bg-muted/40 rounded-lg p-2.5">
                  <span className="text-muted-foreground block mb-0.5">Return Columns</span>
                  <span className="font-semibold text-foreground">{sheet.return_columns || 'All'}</span>
                </div>
                <div className="bg-muted/40 rounded-lg p-2.5">
                  <span className="text-muted-foreground block mb-0.5">Sheet Tab</span>
                  <span className="font-semibold text-foreground">{sheet.sheet_name}</span>
                </div>
                <div className="bg-muted/40 rounded-lg p-2.5">
                  <span className="text-muted-foreground block mb-0.5">Spreadsheet</span>
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${sheet.spreadsheet_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[oklch(0.5_0.15_170)] hover:underline inline-flex items-center gap-1"
                  >
                    Open <ExternalLink className="size-3" />
                  </a>
                </div>
              </div>
            </div>
          ))}

          {showForm && (
            <div className="border border-border rounded-xl p-5 space-y-5 bg-muted/20">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-foreground">{editingId ? 'Edit Spreadsheet' : 'Add New Spreadsheet'}</h4>
                <Button variant="ghost" size="sm" onClick={resetForm} className="text-muted-foreground">Cancel</Button>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Name <span className="text-red-400">*</span></Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Products, Orders, Inventory"
                  className="bg-muted border-border text-foreground"
                />
                <p className="text-[10px] text-muted-foreground/60">
                  A friendly label so the AI knows what this spreadsheet contains. Customers will not see this.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Description <span className="text-muted-foreground/40">(recommended)</span></Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Search by Order ID — returns Status, Total, Delivery Date"
                  className="bg-muted border-border text-foreground"
                />
                <p className="text-[10px] text-muted-foreground/60">
                  Tells the AI what to search by and what data is available. Makes responses more accurate.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Google Sheet Link or Spreadsheet ID <span className="text-red-400">*</span></Label>
                <Input
                  value={form.spreadsheet_url}
                  onChange={(e) => setForm({ ...form, spreadsheet_url: e.target.value })}
                  placeholder="Paste Google Sheet URL or Spreadsheet ID"
                  className="bg-muted border-border text-foreground"
                />
                <p className="text-[10px] text-muted-foreground/60">
                  Paste the full browser URL (e.g. https://docs.google.com/spreadsheets/d/.../edit) or just the ID.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Sheet Tab Name</Label>
                  <Input
                    value={form.sheet_name}
                    onChange={(e) => setForm({ ...form, sheet_name: e.target.value })}
                    placeholder="Sheet1"
                    className="bg-muted border-border text-foreground"
                  />
                  <p className="text-[10px] text-muted-foreground/60">
                    The tab name inside the spreadsheet. Defaults to &quot;Sheet1&quot;.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Reference Column <span className="text-red-400">*</span></Label>
                  <Input
                    value={form.reference_column}
                    onChange={(e) => setForm({ ...form, reference_column: e.target.value })}
                    placeholder="e.g. Order ID, Phone Number, Student ID"
                    className="bg-muted border-border text-foreground"
                  />
                  <p className="text-[10px] text-muted-foreground/60">
                    The column the AI searches by (e.g. &quot;Order ID&quot;). Customers will be asked for this value.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Return Columns <span className="text-muted-foreground/40">(optional)</span></Label>
                <Input
                  value={form.return_columns}
                  onChange={(e) => setForm({ ...form, return_columns: e.target.value })}
                  placeholder="e.g. Status, Delivery Date, Total"
                  className="bg-muted border-border text-foreground"
                />
                <p className="text-[10px] text-muted-foreground/60">
                  Comma-separated list of columns the AI is allowed to share with customers. Leave blank to return all columns.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={resetForm}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : editingId ? 'Update Spreadsheet' : 'Add Spreadsheet'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-base">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex gap-3">
            <div className="size-6 rounded-full bg-[oklch(0.5_0.15_170)]/10 text-[oklch(0.5_0.15_170)] flex items-center justify-center shrink-0 font-bold text-xs">1</div>
            <div>
              <span className="font-semibold text-foreground">Add your spreadsheets</span>
              <p className="text-xs mt-0.5">Connect one or more Google Sheets. Give each a name and description so the AI knows what data is in each one.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="size-6 rounded-full bg-[oklch(0.5_0.15_170)]/10 text-[oklch(0.5_0.15_170)] flex items-center justify-center shrink-0 font-bold text-xs">2</div>
            <div>
              <span className="font-semibold text-foreground">Share with the bot</span>
              <p className="text-xs mt-0.5">Share each Google Sheet as a <strong>Viewer</strong> with the bot email shown above. The AI reads data but never writes or modifies anything.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="size-6 rounded-full bg-[oklch(0.5_0.15_170)]/10 text-[oklch(0.5_0.15_170)] flex items-center justify-center shrink-0 font-bold text-xs">3</div>
            <div>
              <span className="font-semibold text-foreground">Customers ask, AI answers</span>
              <p className="text-xs mt-0.5">When a customer asks &quot;Where&apos;s my order?&quot; or &quot;How much is item X?&quot;, the AI finds the right spreadsheet, looks up the data, and replies — all inside WhatsApp.</p>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 flex gap-2.5">
            <AlertCircle className="size-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              <strong>Tip:</strong> Use clear, unique reference columns (e.g. &quot;Order ID&quot; not &quot;Name&quot;). The AI works best when it can uniquely identify each row.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

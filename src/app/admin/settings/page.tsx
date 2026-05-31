"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Settings,
  Webhook,
  ShieldCheck,
  Save,
  Copy,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export default function AdminSettingsPage() {
  const [whatsappSettings, setWhatsappSettings] = useState({
    verify_token: "",
    webhook_url: "",
  });
  const [systemConfig, setSystemConfig] = useState({
    maintenance_mode: false,
    announcement: "",
  });
  const [integrationsGlobal, setIntegrationsGlobal] = useState({
    google_sheets: {
      enabled: true,
      default_service_account: {
        client_email: "",
        private_key: "",
      }
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function fetchSettings() {
      const [
        { data: wa },
        { data: sys },
        { data: int }
      ] = await Promise.all([
        supabase.from("system_settings").select("*").eq("id", "whatsapp_global").maybeSingle(),
        supabase.from("system_settings").select("*").eq("id", "system_config").maybeSingle(),
        supabase.from("system_settings").select("*").eq("id", "integrations_global").maybeSingle(),
      ]);

      if (wa) setWhatsappSettings(wa.value);
      if (sys) setSystemConfig(sys.value);
      if (int) setIntegrationsGlobal(int.value);
      
      setLoading(false);
    }
    fetchSettings();
  }, [supabase]);

  async function handleSaveWhatsapp() {
    setSaving(true);
    const { error } = await supabase
      .from("system_settings")
      .upsert({
        id: "whatsapp_global",
        value: whatsappSettings,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      toast.error("Failed to save WhatsApp settings");
    } else {
      toast.success("WhatsApp settings updated");
    }
    setSaving(false);
  }

  async function handleSaveSystem() {
    setSaving(true);
    const { error } = await supabase
      .from("system_settings")
      .upsert({
        id: "system_config",
        value: systemConfig,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      toast.error("Failed to save system config");
    } else {
      toast.success("Platform configuration updated");
    }
    setSaving(false);
  }

  async function handleSaveIntegrations() {
    setSaving(true);
    const { error } = await supabase
      .from("system_settings")
      .upsert({
        id: "integrations_global",
        value: integrationsGlobal,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      toast.error("Failed to save integrations settings");
    } else {
      toast.success("Global integrations updated");
    }
    setSaving(false);
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const currentWebhookUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/whatsapp/webhook` 
    : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">System Settings</h1>
        <p className="text-slate-400">Configure global platform defaults and integrations.</p>
      </div>

      <div className="grid gap-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Webhook className="h-5 w-5 text-primary" />
              Global WhatsApp Webhook
            </CardTitle>
            <CardDescription>
              This is the centralized endpoint that receives all incoming messages from Meta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-slate-300">Webhook Callback URL</Label>
              <div className="flex gap-2">
                <Input
                  value={currentWebhookUrl}
                  readOnly
                  className="bg-muted border-slate-700 text-slate-400 font-mono text-xs"
                />
                <Button variant="outline" className="border-slate-700" onClick={() => copyToClipboard(currentWebhookUrl)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[11px] text-slate-500">
                Use this URL in your Meta App Dashboard under the Webhooks section.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Global Verify Token</Label>
              <div className="flex gap-2">
                <Input
                  value={whatsappSettings.verify_token}
                  onChange={(e) => setWhatsappSettings(prev => ({ ...prev, verify_token: e.target.value }))}
                  placeholder="Enter verify token"
                  className="bg-muted border-slate-700 text-slate-200"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Must match the "Verify Token" you set in the Meta App Dashboard.
              </p>
            </div>

            <div className="flex justify-end border-t border-border pt-6">
              <Button onClick={handleSaveWhatsapp} disabled={saving || loading} className="bg-primary hover:bg-primary">
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <ShieldCheck className="h-5 w-5 text-amber-500" />
              Platform Control
            </CardTitle>
            <CardDescription>
              Manage application availability and global communications.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
              <div className="space-y-0.5">
                <Label className="text-base text-white">Maintenance Mode</Label>
                <p className="text-xs text-slate-400">
                  Block all non-admin access to the application.
                </p>
              </div>
              <Switch 
                checked={systemConfig.maintenance_mode}
                onCheckedChange={(val) => setSystemConfig(prev => ({ ...prev, maintenance_mode: val }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">System Announcement</Label>
              <Textarea 
                value={systemConfig.announcement}
                onChange={(e) => setSystemConfig(prev => ({ ...prev, announcement: e.target.value }))}
                placeholder="Message for all tenant dashboards..."
                className="bg-muted border-slate-700 text-slate-200 min-h-[100px]"
              />
              <p className="text-[11px] text-slate-500">
                This will be displayed as a banner on every business dashboard.
              </p>
            </div>

            <div className="flex justify-end border-t border-border pt-6">
              <Button onClick={handleSaveSystem} disabled={saving || loading} className="bg-primary hover:bg-primary">
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Platform Config"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Settings className="h-5 w-5 text-emerald-500" />
              Global Integrations
            </CardTitle>
            <CardDescription>
              Configure platform-wide integration settings and fallbacks.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
              <div className="space-y-0.5">
                <Label className="text-base text-white">Google Sheets Integration</Label>
                <p className="text-xs text-slate-400">
                  Allow businesses to use Google Sheets as a data source.
                </p>
              </div>
              <Switch 
                checked={integrationsGlobal.google_sheets.enabled}
                onCheckedChange={(val) => setIntegrationsGlobal(prev => ({ 
                  ...prev, 
                  google_sheets: { ...prev.google_sheets, enabled: val } 
                }))}
              />
            </div>

            <div className="space-y-4 border-t border-border pt-6">
              <h3 className="text-sm font-medium text-slate-200">Default Service Account (Fallback)</h3>
              <p className="text-xs text-slate-400">
                Optional: If provided, businesses only need to share their sheet with this email.
              </p>
              
              <div className="space-y-2">
                <Label className="text-slate-300 text-xs">Client Email</Label>
                <Input
                  value={integrationsGlobal.google_sheets.default_service_account.client_email}
                  onChange={(e) => setIntegrationsGlobal(prev => ({ 
                    ...prev, 
                    google_sheets: { 
                      ...prev.google_sheets, 
                      default_service_account: { ...prev.google_sheets.default_service_account, client_email: e.target.value } 
                    } 
                  }))}
                  placeholder="e.g. hopechat-bot@project.iam.gserviceaccount.com"
                  className="bg-muted border-slate-700 text-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300 text-xs">Private Key</Label>
                <Textarea
                  value={integrationsGlobal.google_sheets.default_service_account.private_key}
                  onChange={(e) => setIntegrationsGlobal(prev => ({ 
                    ...prev, 
                    google_sheets: { 
                      ...prev.google_sheets, 
                      default_service_account: { ...prev.google_sheets.default_service_account, private_key: e.target.value } 
                    } 
                  }))}
                  placeholder="-----BEGIN PRIVATE KEY-----\n..."
                  className="bg-muted border-slate-700 text-slate-200 font-mono text-xs min-h-[120px]"
                />
              </div>
            </div>

            <div className="flex justify-end border-t border-border pt-6">
              <Button onClick={handleSaveIntegrations} disabled={saving || loading} className="bg-primary hover:bg-primary">
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Integrations"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


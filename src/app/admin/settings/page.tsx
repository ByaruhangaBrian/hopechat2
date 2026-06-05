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
  Key,
  Database,
  Cpu,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminSettingsPage() {
  const [whatsappSettings, setWhatsappSettings] = useState({
    verify_token: "",
    webhook_url: "",
    default_interaction_timeout_hours: 24,
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
  const [platformCredentials, setPlatformCredentials] = useState({
    supabase_url: "",
    supabase_anon_key: "",
    meta_app_id: "",
    meta_app_secret: "",
    gemini_global_key: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function fetchSettings() {
      const [
        { data: wa },
        { data: sys },
        { data: int },
        { data: creds }
      ] = await Promise.all([
        supabase.from("system_settings").select("*").eq("id", "whatsapp_global").maybeSingle(),
        supabase.from("system_settings").select("*").eq("id", "system_config").maybeSingle(),
        supabase.from("system_settings").select("*").eq("id", "integrations_global").maybeSingle(),
        supabase.from("system_settings").select("*").eq("id", "platform_credentials").maybeSingle(),
      ]);

      if (wa) setWhatsappSettings(wa.value);
      if (sys) setSystemConfig(sys.value);
      if (int) setIntegrationsGlobal(int.value);
      if (creds) setPlatformCredentials(creds.value);
      
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

  async function handleSavePlatformCredentials() {
    setSaving(true);
    const { error } = await supabase
      .from("system_settings")
      .upsert({
        id: "platform_credentials",
        value: platformCredentials,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      toast.error("Failed to save platform credentials");
    } else {
      toast.success("Platform credentials updated");
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
        <h1 className="text-2xl font-bold text-foreground">System Settings</h1>
        <p className="text-muted-foreground">Configure global platform defaults and integrations.</p>
      </div>

      <Tabs defaultValue="whatsapp" className="w-full space-y-6">
        <TabsList className="bg-muted p-1 border border-border inline-flex h-10 items-center justify-center rounded-lg">
          <TabsTrigger value="whatsapp" className="px-4 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="platform" className="px-4 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            Platform
          </TabsTrigger>
          <TabsTrigger value="credentials" className="px-4 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            Credentials
          </TabsTrigger>
          <TabsTrigger value="integrations" className="px-4 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            Integrations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp" className="space-y-6 outline-none">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Webhook className="h-5 w-5 text-primary" />
                Global WhatsApp Webhook
              </CardTitle>
              <CardDescription>
                This is the centralized endpoint that receives all incoming messages from Meta.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Webhook Callback URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={currentWebhookUrl}
                    readOnly
                    className="bg-muted border-border text-muted-foreground font-mono text-xs"
                  />
                  <Button variant="outline" className="border-border" onClick={() => copyToClipboard(currentWebhookUrl)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground/60">
                  Use this URL in your Meta App Dashboard under the Webhooks section.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Global Verify Token</Label>
                <div className="flex gap-2">
                  <Input
                    value={whatsappSettings.verify_token}
                    onChange={(e) => setWhatsappSettings(prev => ({ ...prev, verify_token: e.target.value }))}
                    placeholder="Enter verify token"
                    className="bg-muted border-border text-foreground"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground/60">
                  Must match the "Verify Token" you set in the Meta App Dashboard.
                </p>
              </div>

              <div className="space-y-4 border-t border-border pt-6">
                <h3 className="text-sm font-medium text-foreground">Interactive & Flows</h3>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Default Interaction Timeout (hours)</Label>
                  <Input
                    type="number"
                    value={whatsappSettings.default_interaction_timeout_hours || 24}
                    onChange={(e) => setWhatsappSettings(prev => ({ ...prev, default_interaction_timeout_hours: Number(e.target.value) }))}
                    placeholder="24"
                    className="bg-muted border-border text-foreground w-32"
                  />
                  <p className="text-[11px] text-muted-foreground/60">
                    How long an automation should wait for a user to click a button before expiring.
                  </p>
                </div>
              </div>

              <div className="flex justify-end border-t border-border pt-6">
                <Button onClick={handleSaveWhatsapp} disabled={saving || loading} className="bg-primary hover:bg-primary/90">
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platform" className="space-y-6 outline-none">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
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
                  <Label className="text-base text-foreground">Maintenance Mode</Label>
                  <p className="text-xs text-muted-foreground">
                    Block all non-admin access to the application.
                  </p>
                </div>
                <Switch 
                  checked={systemConfig.maintenance_mode}
                  onCheckedChange={(val) => setSystemConfig(prev => ({ ...prev, maintenance_mode: val }))}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">System Announcement</Label>
                <Textarea 
                  value={systemConfig.announcement}
                  onChange={(e) => setSystemConfig(prev => ({ ...prev, announcement: e.target.value }))}
                  placeholder="Message for all tenant dashboards..."
                  className="bg-muted border-border text-foreground min-h-[100px]"
                />
                <p className="text-[11px] text-muted-foreground/60">
                  This will be displayed as a banner on every business dashboard.
                </p>
              </div>

              <div className="flex justify-end border-t border-border pt-6">
                <Button onClick={handleSaveSystem} disabled={saving || loading} className="bg-primary hover:bg-primary/90">
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save Platform Config"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credentials" className="space-y-6 outline-none">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Key className="h-5 w-5 text-indigo-500" />
                Platform Credentials
              </CardTitle>
              <CardDescription>
                Manage global secrets and infrastructure keys.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  Supabase Configuration
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">Supabase URL</Label>
                    <Input
                      value={platformCredentials.supabase_url}
                      onChange={(e) => setPlatformCredentials(prev => ({ ...prev, supabase_url: e.target.value }))}
                      placeholder="https://your-project.supabase.co"
                      className="bg-muted border-border text-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">Anon Key</Label>
                    <Input
                      type="password"
                      value={platformCredentials.supabase_anon_key}
                      onChange={(e) => setPlatformCredentials(prev => ({ ...prev, supabase_anon_key: e.target.value }))}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="bg-muted border-border text-foreground"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t border-border pt-6">
                <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Webhook className="h-4 w-4 text-muted-foreground" />
                  Meta App Credentials
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">App ID</Label>
                    <Input
                      value={platformCredentials.meta_app_id}
                      onChange={(e) => setPlatformCredentials(prev => ({ ...prev, meta_app_id: e.target.value }))}
                      placeholder="123456789012345"
                      className="bg-muted border-border text-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">App Secret</Label>
                    <Input
                      type="password"
                      value={platformCredentials.meta_app_secret}
                      onChange={(e) => setPlatformCredentials(prev => ({ ...prev, meta_app_secret: e.target.value }))}
                      placeholder="••••••••••••••••••••••••••••••••"
                      className="bg-muted border-border text-foreground"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t border-border pt-6">
                <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                  Global AI Configuration
                </h3>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Global Gemini API Key</Label>
                  <Input
                    type="password"
                    value={platformCredentials.gemini_global_key}
                    onChange={(e) => setPlatformCredentials(prev => ({ ...prev, gemini_global_key: e.target.value }))}
                    placeholder="AIzaSy..."
                    className="bg-muted border-border text-foreground"
                  />
                  <p className="text-[10px] text-muted-foreground/60">
                    Fallback key used if a business hasn't provided their own API key.
                  </p>
                </div>
              </div>

              <div className="flex justify-end border-t border-border pt-6">
                <Button onClick={handleSavePlatformCredentials} disabled={saving || loading} className="bg-primary hover:bg-primary/90">
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save Credentials"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6 outline-none">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
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
                  <Label className="text-base text-foreground">Google Sheets Integration</Label>
                  <p className="text-xs text-muted-foreground">
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
                <h3 className="text-sm font-medium text-foreground">Default Service Account (Fallback)</h3>
                <p className="text-xs text-muted-foreground">
                  Optional: If provided, businesses only need to share their sheet with this email.
                </p>
                
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Client Email</Label>
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
                    className="bg-muted border-border text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Private Key</Label>
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
                    className="bg-muted border-border text-foreground font-mono text-xs min-h-[120px]"
                  />
                </div>
              </div>

              <div className="flex justify-end border-t border-border pt-6">
                <Button onClick={handleSaveIntegrations} disabled={saving || loading} className="bg-primary hover:bg-primary/90">
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save Integrations"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


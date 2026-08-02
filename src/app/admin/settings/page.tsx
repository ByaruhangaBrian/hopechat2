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
  CreditCard,
  Info,
  Coins,
  Zap,
  MessageSquareText,
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
  const [geminiContextCaching, setGeminiContextCaching] = useState(false);
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
  const [pesapalGlobal, setPesapalGlobal] = useState({
    consumer_key: "",
    consumer_secret: "",
    site_url: "live.pesapal.com",
    is_enabled: false,
  });
  const [creditCosts, setCreditCosts] = useState({
    ai_chat: { credits: 1, label: "Inbound AI Chat Session" },
    interactive_form: { credits: 1, label: "Interactive Form / Flow" },
    bulk_broadcast: { credits: 15, label: "Bulk Broadcast" },
    sms_per_message: { credits: 1, label: "SMS Message" },
    credit_ugx_rate: 40,
  });
  const [smsSettings, setSmsSettings] = useState({
    url: "",
    username: "",
    password: "",
    sender: "",
    enabled: false,
  });
  const [emailSettings, setEmailSettings] = useState({
    host: "",
    port: 587,
    secure: false,
    user: "",
    password: "",
    from_name: "HopeChat",
    from_email: "",
  });
  const [subscriptionSettings, setSubscriptionSettings] = useState<{
    grace_days: number;
    discounts: Record<string, number>;
  }>({
    grace_days: 7,
    discounts: { "3": 0, "6": 5, "12": 10 },
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
        { data: creds },
        { data: pp },
        { data: cc },
        { data: gcc },
        { data: sms },
        { data: email },
        { data: subs },
      ] = await Promise.all([
        supabase.from("system_settings").select("*").eq("id", "whatsapp_global").maybeSingle(),
        supabase.from("system_settings").select("*").eq("id", "system_config").maybeSingle(),
        supabase.from("system_settings").select("*").eq("id", "integrations_global").maybeSingle(),
        supabase.from("system_settings").select("*").eq("id", "platform_credentials").maybeSingle(),
        supabase.from("system_settings").select("*").eq("id", "pesapal_global").maybeSingle(),
        supabase.from("system_settings").select("*").eq("id", "credit_costs").maybeSingle(),
        supabase.from("system_settings").select("*").eq("id", "gemini_context_caching").maybeSingle(),
        supabase.from("system_settings").select("*").eq("id", "sms_settings").maybeSingle(),
        supabase.from("system_settings").select("*").eq("id", "email_settings").maybeSingle(),
        supabase.from("system_settings").select("*").eq("id", "subscription_settings").maybeSingle(),
      ]);

      if (wa) setWhatsappSettings(wa.value);
      if (sys) setSystemConfig(sys.value);
      if (int) setIntegrationsGlobal(int.value);
      if (creds) setPlatformCredentials(creds.value);
      if (pp?.value) {
        setPesapalGlobal({
          consumer_key: pp.value.consumer_key || "",
          consumer_secret: pp.value.consumer_secret || "",
          site_url: pp.value.site_url || "live.pesapal.com",
          is_enabled: !!pp.value.is_enabled,
        });
      }
      if (cc?.value) {
        setCreditCosts({
          ai_chat: cc.value.ai_chat ?? { credits: 1, label: "Inbound AI Chat Session" },
          interactive_form: cc.value.interactive_form ?? { credits: 1, label: "Interactive Form / Flow" },
          bulk_broadcast: cc.value.bulk_broadcast ?? { credits: 15, label: "Bulk Broadcast" },
          sms_per_message: cc.value.sms_per_message ?? { credits: 1, label: "SMS Message" },
          credit_ugx_rate: cc.value.credit_ugx_rate ?? 40,
        });
      }

      if (sms?.value) {
        setSmsSettings({
          url: sms.value.url || "",
          username: sms.value.username || "",
          password: sms.value.password || "",
          sender: sms.value.sender || "",
          enabled: !!sms.value.enabled,
        });
      }

      if (gcc?.value !== undefined) {
        const v = gcc.value;
        setGeminiContextCaching(v === true || v?.enabled === true);
      }

      if (email?.value) {
        setEmailSettings({
          host: email.value.host || "",
          port: email.value.port ?? 587,
          secure: !!email.value.secure,
          user: email.value.user || "",
          password: email.value.password || "",
          from_name: email.value.from_name || "HopeChat",
          from_email: email.value.from_email || "",
        });
      }

      if (subs?.value) {
        setSubscriptionSettings({
          grace_days: subs.value.grace_days ?? 7,
          discounts: { "3": 0, "6": 5, "12": 10, ...(subs.value.discounts ?? {}) },
        });
      }
      
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
    const normalized = { ...integrationsGlobal };
    if (normalized.google_sheets?.default_service_account?.private_key) {
      normalized.google_sheets = {
        ...normalized.google_sheets,
        default_service_account: {
          ...normalized.google_sheets.default_service_account,
          private_key: normalized.google_sheets.default_service_account.private_key
            .replace(/\\r\\n/g, '\n')
            .replace(/\\r/g, '\n')
            .replace(/\\n/g, '\n')
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n'),
        },
      };
    }
    const { error } = await supabase
      .from("system_settings")
      .upsert({
        id: "integrations_global",
        value: normalized,
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

  async function handleSaveGateway() {
    setSaving(true);
    const { error } = await supabase
      .from("system_settings")
      .upsert({
        id: "pesapal_global",
        value: pesapalGlobal,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      toast.error("Failed to save Pesapal settings");
    } else {
      toast.success("Pesapal gateway configuration saved successfully");
    }
    setSaving(false);
  }

  async function handleSaveCreditCosts() {
    setSaving(true);
    const { error } = await supabase
      .from("system_settings")
      .upsert({
        id: "credit_costs",
        value: creditCosts,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      toast.error("Failed to save credit configuration");
    } else {
      toast.success("Credit system configuration updated");
    }
    setSaving(false);
  }

  async function handleSaveSmsSettings() {
    setSaving(true);
    const { error } = await supabase
      .from("system_settings")
      .upsert({
        id: "sms_settings",
        value: smsSettings,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      toast.error("Failed to save SMS settings");
    } else {
      toast.success("SMS provider settings updated");
    }
    setSaving(false);
  }

  async function handleSaveGeminiCaching() {
    setSaving(true);
    const { error } = await supabase
      .from("system_settings")
      .upsert({
        id: "gemini_context_caching",
        value: geminiContextCaching,
        updated_at: new Date().toISOString(),
      });
    if (error) {
      toast.error("Failed to save Gemini caching setting");
    } else {
      toast.success(geminiContextCaching ? "Context caching enabled — requires paid Gemini API tier" : "Context caching disabled");
    }
    setSaving(false);
  }

  async function handleSaveEmailSettings() {
    setSaving(true);
    const { error } = await supabase
      .from("system_settings")
      .upsert({
        id: "email_settings",
        value: emailSettings,
        updated_at: new Date().toISOString(),
      });
    if (error) {
      toast.error("Failed to save email settings");
    } else {
      toast.success("Email (SMTP) settings updated");
    }
    setSaving(false);
  }

  async function handleSaveSubscriptionSettings() {
    setSaving(true);
    const { error } = await supabase
      .from("system_settings")
      .upsert({
        id: "subscription_settings",
        value: subscriptionSettings,
        updated_at: new Date().toISOString(),
      });
    if (error) {
      toast.error("Failed to save subscription settings");
    } else {
      toast.success("Subscription settings updated");
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
          <TabsTrigger value="gateway" className="px-4 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            Gateway
          </TabsTrigger>
          <TabsTrigger value="credentials" className="px-4 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            Credentials
          </TabsTrigger>
          <TabsTrigger value="sms" className="px-4 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            SMS
          </TabsTrigger>
          <TabsTrigger value="integrations" className="px-4 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            Integrations
          </TabsTrigger>
          <TabsTrigger value="credits" className="px-4 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            Credits
          </TabsTrigger>
          <TabsTrigger value="email" className="px-4 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            Email
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="px-4 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            Subscriptions
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

              <div className="space-y-4 border-t border-border pt-6">
                <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                  Gemini AI Context Caching
                </h3>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <Label className="text-base text-foreground">Enable Context Caching</Label>
                    <p className="text-xs text-muted-foreground">
                      Cache repeated system prompts (training docs, knowledge base, rules) across AI responses.
                      This reduces input token costs by ~90% for cached content when billing is enabled.
                    </p>
                  </div>
                  <Switch
                    checked={geminiContextCaching}
                    onCheckedChange={(val) => setGeminiContextCaching(val)}
                    className="ml-4 shrink-0"
                  />
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3 text-xs text-muted-foreground leading-relaxed">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      <Info className="h-3 w-3" />
                      Requires paid Gemini API tier
                    </span>
                  </div>

                  <p><strong className="text-foreground">How it works:</strong> When enabled, the first AI response for each business creates a cache containing their system prompt, training documents, knowledge base, and rules. All subsequent responses reference this cache instead of resending the full text — Gemini automatically prepends the cached content to each request.</p>

                  <p><strong className="text-foreground">Cache lifecycle:</strong> Each cache lives for 1 hour and is auto-extended if still in use. Caches are stored in our database so they survive server restarts. Old caches expire naturally — there is nothing to clean up manually.</p>

                  <p><strong className="text-foreground">When a business updates their AI config</strong> (system prompt, training docs, or knowledge base), the old cache is automatically deleted and a fresh one is created on the next AI response. No action needed from you.</p>

                  <p><strong className="text-foreground">Model:</strong> gemini-2.5-flash (minimum 2048 tokens required for caching). Prompts smaller than this skip caching automatically — implicit caching still applies.</p>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveGeminiCaching} disabled={saving || loading} size="sm" variant="outline" className="border-border">
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Saving..." : "Save"}
                  </Button>
                </div>
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

        <TabsContent value="sms" className="space-y-6 outline-none">
          <Card className="max-w-3xl border-border bg-card">
            <CardHeader>
              <CardTitle className="text-xl font-semibold flex items-center gap-2 text-foreground">
                <MessageSquareText className="h-5 w-5 text-primary" />
                SMS Provider Configuration
              </CardTitle>
              <CardDescription>
                Configure the bulk SMS gateway used for SMS broadcasts. Swappable — any
                gateway with the KintuSMS-style API shape works.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground leading-relaxed">
                  <p className="font-semibold text-foreground mb-1">KintuSMS</p>
                  <p>
                    Default endpoint:{' '}
                    <code className="font-mono text-primary">http://www.kintusms.com/api.php</code>.
                    Sends use the query params <code className="font-mono">user, password, sender,
                    recipient, message</code>; the gateway replies with success code{' '}
                    <code className="font-mono">1701</code>. Recipients are comma-separated and
                    normalized to the <code className="font-mono">256</code> international format.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="sms_url" className="text-sm font-semibold text-foreground">
                      API URL
                    </Label>
                    <Input
                      id="sms_url"
                      value={smsSettings.url}
                      onChange={(e) => setSmsSettings(prev => ({ ...prev, url: e.target.value }))}
                      placeholder="http://www.kintusms.com/api.php"
                      className="bg-background border-border text-foreground font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sms_username" className="text-sm font-semibold text-foreground">
                      Username
                    </Label>
                    <Input
                      id="sms_username"
                      value={smsSettings.username}
                      onChange={(e) => setSmsSettings(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="API username"
                      className="bg-background border-border text-foreground font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sms_password" className="text-sm font-semibold text-foreground">
                      Password
                    </Label>
                    <Input
                      id="sms_password"
                      type="password"
                      value={smsSettings.password}
                      onChange={(e) => setSmsSettings(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="API password"
                      className="bg-background border-border text-foreground font-mono"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="sms_sender" className="text-sm font-semibold text-foreground">
                      Sender ID
                    </Label>
                    <Input
                      id="sms_sender"
                      value={smsSettings.sender}
                      onChange={(e) => setSmsSettings(prev => ({ ...prev, sender: e.target.value }))}
                      placeholder="HeloWOrld"
                      className="bg-background border-border text-foreground font-mono"
                    />
                    <p className="text-[11px] text-muted-foreground/60">
                      Shown as the sender name on recipients' phones. Must be registered with
                      your SMS provider.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/30 border border-border rounded-lg">
                  <div className="space-y-1">
                    <Label htmlFor="sms_enabled" className="text-sm font-semibold text-foreground">
                      SMS Sending Enabled
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      When disabled, businesses cannot create or send SMS broadcasts.
                    </p>
                  </div>
                  <Switch
                    id="sms_enabled"
                    checked={smsSettings.enabled}
                    onCheckedChange={(val) => setSmsSettings(prev => ({ ...prev, enabled: val }))}
                  />
                </div>

                <div className="flex justify-end border-t border-border pt-6">
                  <Button onClick={handleSaveSmsSettings} disabled={saving || loading} className="bg-primary hover:bg-primary/90">
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Saving..." : "Save SMS Settings"}
                  </Button>
                </div>
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
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex gap-3 text-xs leading-relaxed text-blue-600 dark:text-blue-100">
                <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">Super Admin Instructions:</p>
                  <ul className="list-disc ml-4 space-y-1">
                    <li><strong>Service Account (Fallback):</strong> Configure a fallback Google Service Account so businesses do not need their own Google Cloud Projects. They will share their sheets with this email.</li>
                    <li><strong>Dynamic Lookup:</strong> Business admins configure their Sheet URL, a "Reference Column" (e.g. `Order ID`), and "Return Columns" (e.g. `Status, Delivery Date`) in their portal.</li>
                    <li><strong>How it works:</strong> The WhatsApp AI worker will detect these settings, ask the client for the reference key, look up the row, and return only the specified fields.</li>
                  </ul>
                </div>
              </div>

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

        <TabsContent value="gateway" className="space-y-6 outline-none">
          <Card className="max-w-3xl border-border bg-card">
            <CardHeader>
              <CardTitle className="text-xl font-semibold flex items-center gap-2 text-foreground">
                <CreditCard className="h-5 w-5 text-primary" />
                Pesapal Gateway Integration
              </CardTitle>
              <CardDescription>
                Configure Pesapal API 3.0 credentials to accept card and mobile money collections for credit top-ups.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="pp_consumer_key" className="text-sm font-semibold text-foreground">
                    Consumer Key
                  </Label>
                  <Input
                    id="pp_consumer_key"
                    placeholder="Enter your Pesapal consumer key"
                    value={pesapalGlobal.consumer_key}
                    onChange={(e) => setPesapalGlobal(prev => ({ ...prev, consumer_key: e.target.value }))}
                    className="bg-background border-border text-foreground font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pp_consumer_secret" className="text-sm font-semibold text-foreground">
                    Consumer Secret
                  </Label>
                  <Input
                    id="pp_consumer_secret"
                    type="password"
                    placeholder="Enter your Pesapal consumer secret"
                    value={pesapalGlobal.consumer_secret}
                    onChange={(e) => setPesapalGlobal(prev => ({ ...prev, consumer_secret: e.target.value }))}
                    className="bg-background border-border text-foreground font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pp_site_url" className="text-sm font-semibold text-foreground">
                    Environment
                  </Label>
                  <select
                    id="pp_site_url"
                    value={pesapalGlobal.site_url}
                    onChange={(e) => setPesapalGlobal(prev => ({ ...prev, site_url: e.target.value }))}
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground font-mono"
                  >
                    <option value="live.pesapal.com">Live (pay.pesapal.com)</option>
                    <option value="demo.pesapal.com">Sandbox (demo.pesapal.com)</option>
                  </select>
                  <p className="text-[11px] text-muted-foreground/60">
                    Use Sandbox for testing. Switch to Live before going to production.
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/30 border border-border rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-sm font-semibold text-foreground cursor-pointer" htmlFor="gateway_active">
                      Gateway Active Status
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Enables or disables Pesapal checkout collection links.
                    </p>
                  </div>
                  <Switch 
                    id="gateway_active"
                    checked={pesapalGlobal.is_enabled}
                    onCheckedChange={(val) => setPesapalGlobal(prev => ({ ...prev, is_enabled: val }))}
                  />
                </div>

                <div className="flex justify-end border-t border-border pt-6">
                  <Button onClick={handleSaveGateway} disabled={saving || loading} className="bg-primary hover:bg-primary/90">
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Saving..." : "Save Configuration"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credits" className="space-y-6 outline-none">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Coins className="h-5 w-5 text-amber-500" />
                Credit System Configuration
              </CardTitle>
              <CardDescription>
                Configure how many credits each action costs and the UGX rate per credit.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex gap-3 text-xs leading-relaxed text-amber-600 dark:text-amber-100">
                <Info className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">How Credits Work:</p>
                  <ul className="list-disc ml-4 space-y-1">
                    <li>Each <strong>Inbound AI Chat</strong> response costs the configured number of credits.</li>
                    <li>Each <strong>Interactive Form / Flow</strong> sent via automation costs credits.</li>
                    <li>Each <strong>Bulk Broadcast</strong> action costs credits (per broadcast, not per recipient).</li>
                    <li>Each <strong>SMS Message</strong> sent in an SMS broadcast costs credits (per recipient).</li>
                    <li>The UGX rate determines how much each credit costs when displayed to businesses.</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-foreground">Action Credit Costs</h3>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">
                      {creditCosts.ai_chat.label}
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        value={creditCosts.ai_chat.credits}
                        onChange={(e) =>
                          setCreditCosts((prev) => ({
                            ...prev,
                            ai_chat: { ...prev.ai_chat, credits: Number(e.target.value) },
                          }))
                        }
                        className="bg-muted border-border text-foreground font-semibold text-lg pr-12"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        credits
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">
                      {creditCosts.interactive_form.label}
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        value={creditCosts.interactive_form.credits}
                        onChange={(e) =>
                          setCreditCosts((prev) => ({
                            ...prev,
                            interactive_form: { ...prev.interactive_form, credits: Number(e.target.value) },
                          }))
                        }
                        className="bg-muted border-border text-foreground font-semibold text-lg pr-12"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        credits
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">
                      {creditCosts.bulk_broadcast.label}
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        value={creditCosts.bulk_broadcast.credits}
                        onChange={(e) =>
                          setCreditCosts((prev) => ({
                            ...prev,
                            bulk_broadcast: { ...prev.bulk_broadcast, credits: Number(e.target.value) },
                          }))
                        }
                        className="bg-muted border-border text-foreground font-semibold text-lg pr-12"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        credits
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">
                      {creditCosts.sms_per_message.label}
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        value={creditCosts.sms_per_message.credits}
                        onChange={(e) =>
                          setCreditCosts((prev) => ({
                            ...prev,
                            sms_per_message: { ...prev.sms_per_message, credits: Number(e.target.value) },
                          }))
                        }
                        className="bg-muted border-border text-foreground font-semibold text-lg pr-12"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        credits
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground/60">
                      per SMS message
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t border-border pt-6">
                <h3 className="text-sm font-medium text-foreground">Pricing</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">Credit Cost (UGX per credit)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                        UGX
                      </span>
                      <Input
                        type="number"
                        min={0}
                        value={creditCosts.credit_ugx_rate}
                        onChange={(e) =>
                          setCreditCosts((prev) => ({
                            ...prev,
                            credit_ugx_rate: Number(e.target.value),
                          }))
                        }
                        className="bg-muted border-border text-foreground font-semibold text-lg pl-12"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground/60">
                      Current rate: {creditCosts.credit_ugx_rate > 0
                        ? `${creditCosts.credit_ugx_rate.toLocaleString()} UGX = 1 credit`
                        : "Rate not set"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end border-t border-border pt-6">
                <Button onClick={handleSaveCreditCosts} disabled={saving || loading} className="bg-primary hover:bg-primary/90">
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save Credit Config"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-6 outline-none">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <MessageSquareText className="h-5 w-5 text-primary" />
                Email (SMTP) Configuration
              </CardTitle>
              <CardDescription>
                SMTP server used to send purchase receipts and expiry warnings to businesses.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex gap-3 text-xs leading-relaxed text-amber-600 dark:text-amber-100">
                <Info className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">Recipients</p>
                  <p>Emails go to the email address of the business owner account. Emails are only sent when the host, username and from address are configured — otherwise they are silently skipped and no purchase flow breaks.</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">SMTP Host</Label>
                  <Input
                    placeholder="smtp.gmail.com"
                    value={emailSettings.host}
                    onChange={(e) => setEmailSettings((prev) => ({ ...prev, host: e.target.value }))}
                    className="bg-muted border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">SMTP Port</Label>
                  <Input
                    type="number"
                    value={emailSettings.port}
                    onChange={(e) => setEmailSettings((prev) => ({ ...prev, port: Number(e.target.value) }))}
                    className="bg-muted border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Username</Label>
                  <Input
                    placeholder="you@gmail.com"
                    value={emailSettings.user}
                    onChange={(e) => setEmailSettings((prev) => ({ ...prev, user: e.target.value }))}
                    className="bg-muted border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Password / App Password</Label>
                  <Input
                    type="password"
                    placeholder="••••••••••••"
                    value={emailSettings.password}
                    onChange={(e) => setEmailSettings((prev) => ({ ...prev, password: e.target.value }))}
                    className="bg-muted border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">From Name</Label>
                  <Input
                    placeholder="HopeChat"
                    value={emailSettings.from_name}
                    onChange={(e) => setEmailSettings((prev) => ({ ...prev, from_name: e.target.value }))}
                    className="bg-muted border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">From Email</Label>
                  <Input
                    placeholder="no-reply@hopechat.com"
                    value={emailSettings.from_email}
                    onChange={(e) => setEmailSettings((prev) => ({ ...prev, from_email: e.target.value }))}
                    className="bg-muted border-border text-foreground"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Use TLS/SSL (secure connection)</p>
                  <p className="text-xs text-muted-foreground">Enable for SSL/TLS ports (e.g. 465), disable for STARTTLS ports (e.g. 587).</p>
                </div>
                <Switch
                  checked={emailSettings.secure}
                  onCheckedChange={(checked) => setEmailSettings((prev) => ({ ...prev, secure: checked }))}
                />
              </div>

              <div className="flex justify-end border-t border-border pt-6">
                <Button onClick={handleSaveEmailSettings} disabled={saving || loading} className="bg-primary hover:bg-primary/90">
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save Email Settings"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-6 outline-none">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Subscription Configuration
              </CardTitle>
              <CardDescription>
                Grace period and multi-month discount pricing applied to plan purchases.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex gap-3 text-xs leading-relaxed text-amber-600 dark:text-amber-100">
                <Info className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">How expiry works</p>
                  <p>The app keeps working through the grace period. After it ends, credit-consuming features (AI, broadcasts, SMS, forms) are blocked and the business sees an expired banner until they renew.</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-foreground">Grace Period</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">Days after expiry before the account is locked</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        value={subscriptionSettings.grace_days}
                        onChange={(e) =>
                          setSubscriptionSettings((prev) => ({ ...prev, grace_days: Number(e.target.value) }))
                        }
                        className="bg-muted border-border text-foreground font-semibold text-lg pr-12"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        days
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground/60">
                      Applies to new and renewed subscriptions.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t border-border pt-6">
                <h3 className="text-sm font-medium text-foreground">Multi-Month Discounts</h3>
                <p className="text-xs text-muted-foreground">
                  Discount percentage applied to the total (monthly price × months) when a business purchases multiple months at once.
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  {[3, 6, 12].map((m) => (
                    <div key={m} className="space-y-2">
                      <Label className="text-muted-foreground text-xs">{m}-month discount</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={subscriptionSettings.discounts[String(m)] ?? 0}
                          onChange={(e) =>
                            setSubscriptionSettings((prev) => ({
                              ...prev,
                              discounts: {
                                ...prev.discounts,
                                [String(m)]: Number(e.target.value),
                              },
                            }))
                          }
                          className="bg-muted border-border text-foreground font-semibold text-lg pr-12"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          %
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end border-t border-border pt-6">
                <Button onClick={handleSaveSubscriptionSettings} disabled={saving || loading} className="bg-primary hover:bg-primary/90">
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save Subscription Settings"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


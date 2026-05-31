"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Building2,
  Users,
  MessageSquare,
  Activity,
  ArrowLeft,
  Calendar,
  Shield,
  CreditCard,
  Zap,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface BusinessDetails {
  id: string;
  name: string;
  status: string;
  plan_tier: string;
  created_at: string;
  features: Record<string, boolean>;
  usage_quotas: Record<string, number>;
}

interface TenantStats {
  userCount: number;
  messageCount: number;
  contactCount: number;
}

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BusinessDetails {
  id: string;
  name: string;
  status: string;
  plan_tier: string;
  created_at: string;
  features: Record<string, boolean>;
  usage_quotas: Record<string, number>;
}

interface TenantStats {
  userCount: number;
  messageCount: number;
  contactCount: number;
}

interface TenantUser {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
}

interface WAConfig {
  phone_number_id: string;
  waba_id: string;
  access_token: string;
  verify_token: string;
  status: string;
}

export default function BusinessDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [business, setBusiness] = useState<BusinessDetails | null>(null);
  const [stats, setStats] = useState<TenantStats>({ userCount: 0, messageCount: 0, contactCount: 0 });
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [waConfig, setWaConfig] = useState<WAConfig | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchDetails() {
      if (!id) return;
      setLoading(true);

      const [
        { data: biz },
        { data: bizUsers },
        { data: wa },
        { data: bizLogs },
      ] = await Promise.all([
        supabase.from("businesses").select("*").eq("id", id).single(),
        supabase.from("profiles").select("*").eq("business_id", id),
        supabase.from("whatsapp_config").select("*").eq("business_id", id).maybeSingle(),
        supabase.from("http_logs").select("*").eq("business_id", id).order("created_at", { ascending: false }).limit(20),
      ]);

      if (!biz) {
        toast.error("Failed to fetch business details");
        router.push("/admin/businesses");
        return;
      }

      setBusiness(biz);
      setUsers(bizUsers || []);
      setWaConfig(wa);
      setLogs(bizLogs || []);

      // Fetch related stats
      const { data: conversations } = await supabase
        .from("conversations")
        .select("id")
        .eq("business_id", id);
      
      const conversationIds = conversations?.map(c => c.id) || [];

      const [
        { count: userCount },
        messageCountResult,
        { count: contactCount },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("business_id", id),
        conversationIds.length > 0 
          ? supabase.from("messages").select("*", { count: "exact", head: true }).in("conversation_id", conversationIds)
          : Promise.resolve({ count: 0 }),
        supabase.from("contacts").select("*", { count: "exact", head: true }).eq("business_id", id),
      ]);

      setStats({
        userCount: userCount || 0,
        messageCount: (messageCountResult as any).count || 0,
        contactCount: contactCount || 0,
      });

      setLoading(false);
    }

    fetchDetails();
  }, [id, supabase, router]);

  async function updateWaConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!waConfig) return;

    const { error } = await supabase
      .from("whatsapp_config")
      .upsert({
        ...waConfig,
        business_id: id,
        updated_at: new Date().toISOString()
      });

    if (error) {
      toast.error("Failed to update WhatsApp config");
    } else {
      toast.success("WhatsApp configuration saved");
    }
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">Loading business intelligence...</div>;
  }

  if (!business) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-muted-foreground hover:text-foreground hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{business.name}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono text-xs">{business.id}</span>
              <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Joined {business.created_at ? format(new Date(business.created_at), "MMM yyyy") : "Unknown"}
                </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="border-border text-muted-foreground hover:text-foreground" onClick={() => {
              document.cookie = `impersonated_business_id=${business.id}; path=/; max-age=3600; SameSite=Lax`;
              document.cookie = `impersonated_business_name=${encodeURIComponent(business.name)}; path=/; max-age=3600; SameSite=Lax`;
              toast.success(`Impersonating ${business.name}`);
              setTimeout(() => {
                window.location.href = "/dashboard";
              }, 500);
           }}>
             <Shield className="mr-2 h-4 w-4" />
             Login as Tenant
           </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-muted border border-border p-1 mb-6">
          <TabsTrigger value="overview" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Overview</TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Users ({users.length})</TabsTrigger>
          <TabsTrigger value="whatsapp" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">WhatsApp</TabsTrigger>
          <TabsTrigger value="usage" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Usage & Quotas</TabsTrigger>
          <TabsTrigger value="activity" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge className={cn(
                    "capitalize",
                    business.status === "active" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  )}>
                    {business.status}
                  </Badge>
                  <Badge variant="outline" className="border-border text-muted-foreground capitalize">
                    {business.plan_tier} Plan
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Team Size</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stats.userCount}</div>
                <p className="text-xs text-muted-foreground/60">Active users</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Contacts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stats.contactCount}</div>
                <p className="text-xs text-muted-foreground/60">Across all lists</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Traffic</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stats.messageCount}</div>
                <p className="text-xs text-muted-foreground/60">Messages sent/received</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Zap className="h-5 w-5 text-emerald-500" />
                  Enabled Features
                </CardTitle>
                <CardDescription className="text-muted-foreground/60">Tenant capabilities and modules.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(business.features || {}).map(([feature, enabled]) => (
                    <button 
                      key={feature} 
                      onClick={async () => {
                        const newFeatures = { ...business.features, [feature]: !enabled };
                        const { error } = await supabase.from("businesses").update({ features: newFeatures }).eq("id", business.id);
                        if (!error) {
                          setBusiness({ ...business, features: newFeatures });
                          toast.success(`${feature.replace('_enabled', '')} toggled`);
                        }
                      }}
                      className="flex items-center justify-between p-2 rounded bg-muted hover:bg-muted/80 transition-colors text-left"
                    >
                      <span className="text-xs text-foreground/80 capitalize">{feature.replace('_enabled', '').replace('_', ' ')}</span>
                      {enabled ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <XCircle className="h-3.5 w-3.5 text-muted-foreground/40" />}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-emerald-500" />
                  Subscription Summary
                </CardTitle>
                <CardDescription className="text-muted-foreground/60">Billing and tier details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="flex items-center justify-between">
                   <span className="text-sm text-muted-foreground">Current Tier</span>
                   <span className="text-sm text-foreground font-bold capitalize">{business.plan_tier}</span>
                 </div>
                 <div className="flex items-center justify-between">
                   <span className="text-sm text-muted-foreground">Status</span>
                   <span className={cn("text-sm font-bold capitalize", business.status === 'active' ? "text-emerald-500" : "text-amber-500")}>
                     {business.status}
                   </span>
                 </div>
                 <div className="pt-4 border-t border-border">
                   <Button variant="outline" className="w-full border-border text-xs h-8 text-muted-foreground">Modify Subscription</Button>
                 </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-foreground">Team Members</CardTitle>
                <CardDescription className="text-muted-foreground/60">Manage users and permissions for this business.</CardDescription>
              </div>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">Add User</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Name</TableHead>
                    <TableHead className="text-muted-foreground">Email</TableHead>
                    <TableHead className="text-muted-foreground">Role</TableHead>
                    <TableHead className="text-muted-foreground">Joined</TableHead>
                    <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.user_id} className="border-border hover:bg-muted/50">
                      <TableCell className="text-foreground font-medium">{user.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] uppercase border-border text-muted-foreground">{user.role}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground/60 text-xs">
                        {user.created_at ? format(new Date(user.created_at), "MMM d, yyyy") : "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">Edit</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">WhatsApp Configuration</CardTitle>
              <CardDescription className="text-muted-foreground/60">Manage Meta API credentials for this tenant.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={updateWaConfig} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Phone Number ID</Label>
                    <Input 
                      value={waConfig?.phone_number_id || ""} 
                      onChange={(e) => setWaConfig(prev => ({ ...prev!, phone_number_id: e.target.value }))}
                      className="bg-muted border-border text-foreground font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">WABA ID</Label>
                    <Input 
                      value={waConfig?.waba_id || ""} 
                      onChange={(e) => setWaConfig(prev => ({ ...prev!, waba_id: e.target.value }))}
                      className="bg-muted border-border text-foreground font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Permanent Access Token</Label>
                  <Input 
                    type="password"
                    value={waConfig?.access_token || ""} 
                    onChange={(e) => setWaConfig(prev => ({ ...prev!, access_token: e.target.value }))}
                    className="bg-muted border-border text-foreground font-mono"
                  />
                </div>
                <div className="flex justify-between items-center pt-4">
                  <Badge className={cn(
                    "uppercase text-[10px]",
                    waConfig?.status === 'connected' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                  )}>
                    Status: {waConfig?.status || "Not Configured"}
                  </Badge>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">Save Credentials</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Usage Quotas</CardTitle>
              <CardDescription className="text-muted-foreground/60">Hard limits and resource consumption.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {Object.entries(business.usage_quotas || {}).map(([key, value]) => {
                const current = key === 'max_contacts' ? stats.contactCount : 
                               key === 'max_messages' ? stats.messageCount : 0;
                const percentage = Math.min(100, Math.round((current / value) * 100));
                
                return (
                  <div key={key} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground capitalize">{key.replace('max_', '').replace('_', ' ')}</span>
                      <span className="text-foreground font-medium">{current.toLocaleString()} / {value.toLocaleString()} Max</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                       <div 
                         className={cn(
                           "h-full transition-all duration-500",
                           percentage > 90 ? "bg-destructive" : percentage > 70 ? "bg-amber-500" : "bg-emerald-600"
                         )} 
                         style={{ width: `${percentage}%` }}
                       ></div>
                    </div>
                    <p className="text-[10px] text-muted-foreground/60">Currently using {percentage}% of total capacity.</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Recent Activity</CardTitle>
              <CardDescription className="text-muted-foreground/60">Filtered system logs for this tenant.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Time</TableHead>
                    <TableHead className="text-muted-foreground">Event</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} className="border-border hover:bg-muted/50">
                      <TableCell className="text-muted-foreground/60 text-[10px] font-mono whitespace-nowrap">
                        {format(new Date(log.created_at), "MMM d, HH:mm")}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-bold text-foreground/80 uppercase">{log.service}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(
                          "text-[10px]",
                          log.status_code < 300 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-destructive/10 text-destructive"
                        )}>
                          {log.status_code}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">{log.note || log.endpoint}</TableCell>
                    </TableRow>
                  ))}
                  {logs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No activity recorded yet.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
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

export default function BusinessDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [business, setBusiness] = useState<BusinessDetails | null>(null);
  const [stats, setStats] = useState<TenantStats>({ userCount: 0, messageCount: 0, contactCount: 0 });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchDetails() {
      if (!id) return;
      setLoading(true);

      const { data: biz, error: bizError } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", id)
        .single();

      if (bizError) {
        toast.error("Failed to fetch business details");
        router.push("/admin/businesses");
        return;
      }

      setBusiness(biz);

      // Fetch related stats (using service role bypass or superadmin elevation)
      const [
        { count: userCount },
        { count: msgCount },
        { count: contactCount },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("business_id", id),
        supabase.from("messages").select("*", { count: "exact", head: true }).filter("conversation_id", "in", 
          supabase.from("conversations").select("id").eq("business_id", id)
        ),
        supabase.from("contacts").select("*", { count: "exact", head: true }).eq("business_id", id),
      ]);

      setStats({
        userCount: userCount || 0,
        messageCount: msgCount || 0,
        contactCount: contactCount || 0,
      });

      setLoading(false);
    }

    fetchDetails();
  }, [id, supabase, router]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-slate-500 text-sm">Loading business intelligence...</div>;
  }

  if (!business) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-slate-400 hover:text-white hover:bg-slate-800">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">{business.name}</h1>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="font-mono text-xs">{business.id}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Joined {format(new Date(business.created_at), "MMM yyyy")}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge className={cn(
                "capitalize",
                business.status === "active" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
              )}>
                {business.status}
              </Badge>
              <Badge variant="outline" className="border-slate-700 text-slate-400 capitalize">
                {business.plan_tier} Plan
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Team Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.userCount}</div>
            <p className="text-xs text-slate-500">Active users</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.contactCount}</div>
            <p className="text-xs text-slate-500">Across all lists</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Traffic</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.messageCount}</div>
            <p className="text-xs text-slate-500">Messages sent/received</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-violet-500" />
              Enabled Features
            </CardTitle>
            <CardDescription>Tenant capabilities and modules.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(business.features || {}).map(([feature, enabled]) => (
                <div key={feature} className="flex items-center justify-between p-2 rounded bg-slate-800/50">
                  <span className="text-xs text-slate-300 capitalize">{feature.replace('_enabled', '').replace('_', ' ')}</span>
                  {enabled ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <XCircle className="h-3.5 w-3.5 text-slate-600" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-violet-500" />
              Usage Quotas
            </CardTitle>
            <CardDescription>Hard limits for this business tier.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(business.usage_quotas || {}).map(([key, value]) => (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 capitalize">{key.replace('max_', '').replace('_', ' ')}</span>
                  <span className="text-white font-medium">{value.toLocaleString()}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                   <div className="h-full bg-violet-600" style={{ width: '40%' }}></div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

import { CheckCircle2, XCircle } from "lucide-react";

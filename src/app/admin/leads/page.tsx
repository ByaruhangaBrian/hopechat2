"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Users,
  RefreshCw,
  Mail,
  MailCheck,
  Filter,
  Search,
  UserX,
  UserPlus,
  CheckCircle2,
  BellOff,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

type LeadStage = "email_captured" | "signed_up" | "onboarding_complete" | "engaged";

interface Lead {
  id: string;
  email: string;
  full_name: string | null;
  business_name: string | null;
  stage: LeadStage;
  user_id: string | null;
  business_id: string | null;
  email_kind: string | null;
  email_sent_at: string | null;
  email_error: string | null;
  emailed_by: string | null;
  opt_out: boolean;
  created_at: string;
  updated_at: string;
}

const STAGE_META: Record<LeadStage, { label: string; cls: string }> = {
  email_captured: {
    label: "Email captured",
    cls: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
  signed_up: {
    label: "Signed up",
    cls: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  onboarding_complete: {
    label: "Setup done",
    cls: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  },
  engaged: {
    label: "Engaged",
    cls: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  },
};

const EMAIL_KIND_LABEL: Record<string, string> = {
  signup_reminder: "Signup reminder",
  setup_reminder: "Setup reminder",
  engagement_reminder: "Engagement reminder",
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  async function fetchLeads() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("stage", stageFilter);
      if (search.trim()) params.set("search", search.trim());
      params.set("limit", "200");

      const res = await fetch(`/api/admin/leads?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLeads(data.leads || []);
      setCounts(data.counts || {});
    } catch (err: any) {
      toast.error("Failed to load leads");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageFilter]);

  const sendReminder = async (lead: Lead) => {
    const kindMap: Record<LeadStage, string> = {
      email_captured: "signup_reminder",
      signed_up: "setup_reminder",
      onboarding_complete: "engagement_reminder",
      engaged: "",
    };
    const kind = kindMap[lead.stage];
    if (!kind) return;

    setSendingId(lead.id);
    try {
      const res = await fetch("/api/admin/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id, email_kind: kind }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 400 || res.status === 502) toast.error(data.error || data.message);
        else toast.error(data.error || "Failed to send");
      } else {
        toast.success(data.message || "Reminder email sent");
      }
      fetchLeads();
    } catch {
      toast.error("Failed to send email");
    } finally {
      setSendingId(null);
    }
  };

  const toggleOptOut = async (lead: Lead) => {
    try {
      const res = await fetch("/api/admin/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id, opt_out: !lead.opt_out }),
      });
      if (!res.ok) throw new Error();
      toast.success(lead.opt_out ? "Lead re-enabled for emails" : "Lead opted out of emails");
      fetchLeads();
    } catch {
      toast.error("Failed to update lead");
    }
  };

  const activeLeads = useMemo(
    () => leads.filter((l) => l.stage !== "engaged"),
    [leads],
  );
  const recoverable = useMemo(
    () =>
      leads.filter(
        (l) =>
          l.stage !== "engaged" &&
          ["email_captured", "signed_up", "onboarding_complete"].includes(l.stage),
      ).length,
    [leads],
  );

  const summaryCards = [
    { label: "Total leads", value: counts.all ?? "—", icon: Users },
    { label: "Recoverable (dropped off)", value: recoverable, icon: UserPlus },
    { label: "Not engaged yet", value: activeLeads.length, icon: UserX },
    { label: "Reminders sent", value: leads.filter((l) => l.email_sent_at).length, icon: MailCheck },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6" />
            Lead Recovery Funnel
          </h1>
          <p className="text-muted-foreground">
            Visitors who started signing up or set up an account but didn&apos;t finish — so you
            can email and guide them.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchLeads}
          disabled={loading}
          className="border-border text-muted-foreground gap-1.5"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.label} className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <card.icon className="h-4 w-4" />
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={stageFilter} onValueChange={(v) => setStageFilter(v || "all")}>
          <SelectTrigger className="w-[200px] bg-card border-border text-foreground">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All stages" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border text-foreground">
            <SelectItem value="all">All stages</SelectItem>
            <SelectItem value="email_captured">Email captured</SelectItem>
            <SelectItem value="signed_up">Signed up</SelectItem>
            <SelectItem value="onboarding_complete">Setup done</SelectItem>
            <SelectItem value="engaged">Engaged</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchLeads()}
            placeholder="Search by email..."
            className="pl-9 bg-card border-border h-9"
          />
        </div>
      </div>

      {/* Leads table */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-muted-foreground">Email</TableHead>
                <TableHead className="text-muted-foreground">Name / Business</TableHead>
                <TableHead className="text-muted-foreground">Stage</TableHead>
                <TableHead className="text-muted-foreground">Created</TableHead>
                <TableHead className="text-muted-foreground">Last email</TableHead>
                <TableHead className="text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Loading leads...
                  </TableCell>
                </TableRow>
              ) : leads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    <BellOff className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                    No leads found.
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((lead) => {
                  const meta = STAGE_META[lead.stage] || STAGE_META.email_captured;
                  const canSend = ["email_captured", "signed_up", "onboarding_complete"].includes(
                    lead.stage,
                  );
                  return (
                    <TableRow key={lead.id} className="border-border hover:bg-muted/30">
                      <TableCell>
                        <div
                          className={cn(
                            "text-sm font-medium",
                            lead.opt_out ? "text-muted-foreground line-through" : "text-foreground",
                          )}
                        >
                          {lead.email}
                        </div>
                        {lead.email_error && (
                          <p className="text-xs text-red-500 truncate max-w-[240px]">
                            {lead.email_error}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="font-medium">{lead.full_name || "—"}</div>
                        <div>{lead.business_name || "—"}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("text-[10px]", meta.cls)}>{meta.label}</Badge>
                        {lead.email_kind && (
                          <div className="text-[10px] text-muted-foreground mt-1">
                            {EMAIL_KIND_LABEL[lead.email_kind] || lead.email_kind}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(lead.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {lead.email_sent_at
                          ? format(new Date(lead.email_sent_at), "MMM d, HH:mm")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canSend && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => sendReminder(lead)}
                              disabled={sendingId === lead.id || lead.opt_out}
                              className="text-xs text-muted-foreground gap-1"
                            >
                              {sendingId === lead.id ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Mail className="h-3.5 w-3.5" />
                              )}
                              Send reminder
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleOptOut(lead)}
                            disabled={sendingId === lead.id}
                            className="text-xs text-muted-foreground"
                            title={lead.opt_out ? "Re-enable emails" : "Opt out of emails"}
                          >
                            {lead.opt_out ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <UserX className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

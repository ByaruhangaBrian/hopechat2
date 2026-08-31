import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isEngaged,
  type FunnelLead,
  type RecoveryEmailKind,
} from "@/lib/onboarding-funnel";
import {
  sendSignupReminder,
  sendSetupReminder,
  sendEngagementReminder,
} from "@/lib/email";

/**
 * Scans the onboarding funnel for leads who've dropped off and emails
 * them a recovery message. Meant to be hit on a schedule (Vercel Cron /
 * external pinger) with the shared `x-cron-secret` header matching
 * `LEAD_RECOVERY_CRON_SECRET`.
 *
 * Cadence (hours stuck before email):
 *   email_captured      -> 1h  (never finished creating an account)
 *   signed_up           -> 24h (created account, never finished setup)
 *   onboarding_complete -> 72h (finished setup, never engaged)
 *
 * Each lead is only emailed once per stage (email_kind acts as a guard),
 * so overlapping cron invocations can't double-send.
 */
export async function GET(request: Request) {
  const expected = process.env.LEAD_RECOVERY_CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "cron not configured" }, { status: 503 });
  }
  const supplied = request.headers.get("x-cron-secret");
  if (supplied !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const isoT = (ms: number) => new Date(now.getTime() - ms).toISOString();
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;

  const buckets: Array<{
    stage: "email_captured" | "signed_up" | "onboarding_complete";
    age: number;
    emailKind: RecoveryEmailKind;
  }> = [
    { stage: "email_captured", age: 1 * HOUR, emailKind: "signup_reminder" },
    { stage: "signed_up", age: 24 * HOUR, emailKind: "setup_reminder" },
    { stage: "onboarding_complete", age: 72 * HOUR, emailKind: "engagement_reminder" },
  ];

  const stats: Record<string, number> = {};
  let processed = 0;

  for (const bucket of buckets) {
    stats[bucket.stage] = 0;

    const { data: leads, error } = await admin
      .from("onboarding_funnels")
      .select("*")
      .eq("stage", bucket.stage)
      .eq("opt_out", false)
      .is("email_kind", null)
      .lte("created_at", isoT(bucket.age))
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      stats[`${bucket.stage}_error`] = 0;
      continue;
    }
    if (!leads || leads.length === 0) continue;

    for (const lead of leads as FunnelLead[]) {
      // Guard against a concurrent runner having emailed since we read.
      const { data: claim } = await admin
        .from("onboarding_funnels")
        .update({ email_kind: bucket.emailKind })
        .eq("id", lead.id)
        .is("email_kind", null)
        .select("id")
        .maybeSingle();
      if (!claim) continue;

      let result: { ok: boolean; error?: string };

      // For the engagement reminder, first check whether the lead actually
      // engaged since we last looked — if so, mark them engaged & skip.
      if (bucket.stage === "onboarding_complete") {
        const engaged = await isEngaged({
          userId: lead.user_id,
          businessId: lead.business_id,
        });
        if (engaged) {
          await admin
            .from("onboarding_funnels")
            .update({ stage: "engaged", email_kind: null })
            .eq("id", lead.id);
          continue;
        }
      }

      const common = {
        to: lead.email,
        fullName: lead.full_name,
        businessName: lead.business_name,
        businessId: lead.business_id,
      };

      if (bucket.emailKind === "signup_reminder") {
        result = await sendSignupReminder(common);
      } else if (bucket.emailKind === "setup_reminder") {
        result = await sendSetupReminder(common);
      } else {
        result = await sendEngagementReminder(common);
      }

      await admin
        .from("onboarding_funnels")
        .update({
          email_sent_at: new Date().toISOString(),
          email_error: result.ok ? null : result.error ?? "unknown error",
        })
        .eq("id", lead.id);

      if (result.ok) stats[bucket.stage]++;
      processed++;
    }
  }

  return NextResponse.json({ ok: true, processed, stats });
}

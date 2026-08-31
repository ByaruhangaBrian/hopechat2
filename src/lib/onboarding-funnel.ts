import { createAdminClient } from "@/lib/supabase/admin";

export type FunnelStage =
  | "email_captured"
  | "signed_up"
  | "onboarding_complete"
  | "engaged";

export type RecoveryEmailKind = "signup_reminder" | "setup_reminder" | "engagement_reminder";

export interface FunnelLead {
  id: string;
  email: string;
  full_name: string | null;
  business_name: string | null;
  stage: FunnelStage;
  user_id: string | null;
  business_id: string | null;
  email_kind: RecoveryEmailKind | null;
  email_sent_at: string | null;
  email_error: string | null;
  emailed_by: string | null;
  opt_out: boolean;
  created_at: string;
  updated_at: string;
}

const db = () => createAdminClient();

/**
 * Move a lead to a (more advanced) stage. Upserts by lowercased email.
 * An existing lead only advances forward — events arriving out of order
 * won't push a lead backwards.
 */
export async function recordFunnelEvent(input: {
  email: string;
  stage: FunnelStage;
  fullName?: string | null;
  businessName?: string | null;
  userId?: string | null;
  businessId?: string | null;
}): Promise<void> {
  const { email, stage, fullName, businessName, userId, businessId } = input;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;

  const stageRank: Record<FunnelStage, number> = {
    email_captured: 0,
    signed_up: 1,
    onboarding_complete: 2,
    engaged: 3,
  };

  try {
    const { data: existing } = await db()
      .from("onboarding_funnels")
      .select("id, stage, full_name, business_name, user_id, business_id")
      .eq("email", normalized)
      .maybeSingle();

    const nextRank = stageRank[stage];
    const currentRank = existing ? stageRank[existing.stage as FunnelStage] : -1;

    if (existing) {
      if (nextRank <= currentRank) return;
      await db()
        .from("onboarding_funnels")
        .update({
          stage,
          full_name: fullName ?? existing.full_name ?? null,
          business_name: businessName ?? existing.business_name ?? null,
          user_id: userId ?? existing.user_id ?? null,
          business_id: businessId ?? existing.business_id ?? null,
        })
        .eq("id", existing.id);
    } else {
      // Only create rows once we have enough info to actually follow up
      // (an email). "Email captured" is the earliest stage.
      await db()
        .from("onboarding_funnels")
        .insert({
          email: normalized,
          full_name: fullName ?? null,
          business_name: businessName ?? null,
          stage,
          user_id: userId ?? null,
          business_id: businessId ?? null,
        });
    }
  } catch (err) {
    console.warn(
      "[onboarding-funnel] recordFunnelEvent failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

/**
 * Check whether a business/user has genuinely engaged with the app:
 * whatsapp configured, at least one automation created, or at least one
 * message sent/received. Used both by the cron when deciding whether to
 * stop emailing a lead, and to mark a lead engaged on the fly.
 */
export async function isEngaged(input: {
  userId?: string | null;
  businessId?: string | null;
}): Promise<boolean> {
  const client = db();
  const { userId, businessId } = input;

  if (!userId && !businessId) return false;

  // 1. WhatsApp configured & connected
  if (userId) {
    const { data: wa } = await client
      .from("whatsapp_config")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "connected")
      .maybeSingle();
    if (wa) return true;
  }

  // 2. An automation exists (created = engaged with setup)
  if (userId) {
    const { count: automationCount } = await client
      .from("automations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    if ((automationCount ?? 0) > 0) return true;
  }

  // 3. A message was sent or received
  if (userId) {
    const { data: convos } = await client
      .from("conversations")
      .select("id")
      .eq("user_id", userId)
      .limit(50);
    if (convos && convos.length > 0) {
      const { count: messageCount } = await client
        .from("messages")
        .select("*", { count: "exact", head: true })
        .in(
          "conversation_id",
          convos.map((c) => c.id),
        );
      if ((messageCount ?? 0) > 0) return true;
    }
  }

  return false;
}

/** Mark a single lead as engaged (used opportunistically by callers). */
export async function markEngaged(email: string): Promise<void> {
  return recordFunnelEvent({ email, stage: "engaged" });
}

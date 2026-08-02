import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendSubscriptionReceipt,
  sendCreditReceipt,
} from "@/lib/email";

export interface SubscriptionSettings {
  grace_days: number;
  discounts: Record<string, number>;
}

export interface SubscriptionRow {
  id: string;
  business_id: string;
  tier_id: string;
  period_months: number;
  amount_ugx: number;
  starts_on: string;
  expires_on: string;
  grace_ends_on: string;
  payment_transaction_id: string | null;
  last_reminder_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export type SubscriptionStatus = "active" | "grace" | "expired" | "none";

const DEFAULT_SETTINGS: SubscriptionSettings = {
  grace_days: 7,
  discounts: { "3": 0, "6": 5, "12": 10 },
};

export async function getSubscriptionSettings(): Promise<SubscriptionSettings> {
  const db = createAdminClient();
  const { data } = await db
    .from("system_settings")
    .select("value")
    .eq("id", "subscription_settings")
    .maybeSingle();

  const v = data?.value;
  if (!v) return DEFAULT_SETTINGS;

  return {
    grace_days: v.grace_days ?? DEFAULT_SETTINGS.grace_days,
    discounts: { ...DEFAULT_SETTINGS.discounts, ...(v.discounts ?? {}) },
  };
}

export interface SubscriptionGate {
  status: SubscriptionStatus;
  subscription: SubscriptionRow | null;
  expiresOn: string | null;
  graceEndsOn: string | null;
}

/**
 * Resolve the business's current subscription and its live status.
 * Status is derived from the row's dates (grace_ends_on is baked in at
 * purchase time from the configured grace period).
 */
export async function getSubscriptionGate(
  businessId: string,
): Promise<SubscriptionGate> {
  const db = createAdminClient();
  const { data } = await db
    .from("subscriptions")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return { status: "none", subscription: null, expiresOn: null, graceEndsOn: null };

  const row = data as unknown as SubscriptionRow;
  const today = startOfDayUtc(new Date());
  const expires = parseDateOnly(row.expires_on);
  const graceEnds = parseDateOnly(row.grace_ends_on);

  let status: SubscriptionStatus;
  if (today <= expires) {
    status = "active";
  } else if (today <= graceEnds) {
    status = "grace";
  } else {
    status = "expired";
  }

  return {
    status,
    subscription: row,
    expiresOn: row.expires_on,
    graceEndsOn: row.grace_ends_on,
  };
}

/**
 * Compute the checkout amount for a subscription: tier price x months,
 * minus the configured multi-month discount percentage.
 */
export async function getSubscriptionPrice(
  tierPriceUgx: number,
  months: number,
): Promise<number> {
  const settings = await getSubscriptionSettings();
  const discount = settings.discounts?.[String(months)] ?? 0;
  const total = tierPriceUgx * months;
  return Math.round(total * (1 - discount / 100));
}

export interface CreateOrExtendSubscriptionInput {
  businessId: string;
  tierId: string;
  months: number;
  amountUgx: number;
  paymentTransactionId: string;
}

/**
 * Apply a successful subscription payment. If the business still has a
 * current subscription, extend its expiry; otherwise start a new period.
 * Also upgrades the business's tier / features to match the purchased plan.
 */
export async function createOrExtendSubscription(
  input: CreateOrExtendSubscriptionInput,
): Promise<{ ok: true; id: string } | { ok: false; reason: string }> {
  const db = createAdminClient();
  const settings = await getSubscriptionSettings();

  const { data: tier } = await db
    .from("subscription_tiers")
    .select("*")
    .eq("id", input.tierId)
    .single();

  if (!tier) {
    return { ok: false, reason: `Subscription tier "${input.tierId}" not found` };
  }

  const today = startOfDayUtc(new Date());
  const { data: current } = await db
    .from("subscriptions")
    .select("*")
    .eq("business_id", input.businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let result:
    | { data: { id: string } | null; error: { message: string } | null }
    | undefined;

  if (current && startOfDayUtc(new Date(current.expires_on)) >= today) {
    // Extend the active subscription in place.
    const newExpires = addMonths(current.expires_on, input.months);
    const { data, error } = await db
      .from("subscriptions")
      .update({
        tier_id: input.tierId,
        period_months: input.months,
        amount_ugx: input.amountUgx,
        expires_on: newExpires,
        grace_ends_on: addDays(newExpires, settings.grace_days),
        payment_transaction_id: input.paymentTransactionId,
        last_reminder_sent_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", current.id)
      .select("id")
      .single();
    result = { data, error };
  } else {
    const startsOn = toDateOnly(today);
    const newExpires = addMonths(startsOn, input.months);
    const { data, error } = await db
      .from("subscriptions")
      .insert({
        business_id: input.businessId,
        tier_id: input.tierId,
        period_months: input.months,
        amount_ugx: input.amountUgx,
        starts_on: startsOn,
        expires_on: newExpires,
        grace_ends_on: addDays(newExpires, settings.grace_days),
        payment_transaction_id: input.paymentTransactionId,
      })
      .select("id")
      .single();
    result = { data, error };
  }

  if (!result) return { ok: false, reason: "No subscription write was performed" };
  if (result.error || !result.data) {
    return { ok: false, reason: result.error?.message ?? "Failed to write subscription" };
  }

  // Sync the business's tier, plan and features with the purchased plan.
  const features = {
    ai_enabled: true,
    inbox_enabled: true,
    contacts_enabled: true,
    automations_enabled: true,
    pipelines_enabled: true,
    broadcasts_enabled: tier.allow_broadcasts ?? false,
    flows_enabled: tier.allow_flows ?? false,
    multimodal_enabled: tier.allow_multimodal ?? false,
  };

  const { error: bizError } = await db
    .from("businesses")
    .update({
      tier_id: input.tierId,
      plan_tier: input.tierId,
      features,
      status: "active",
    })
    .eq("id", input.businessId);

  if (bizError) {
    console.error("[subscriptions] Failed to sync business tier:", bizError.message);
  }

  return { ok: true, id: result.data.id };
}

// ---- date helpers ----------------------------------------------------------

/** Shape of a successful payment_transactions row, used by the IPN + callback routes. */
export interface SuccessfulPaymentTx {
  id: string;
  business_id: string;
  amount_ugx: number;
  credits_added: number;
  purpose: string;
  tier_id: string | null;
  period_months: number | null;
  payment_reference: string | null;
}

/**
 * Apply a confirmed payment: activate/extend the subscription when the
 * purchase was a subscription, then send the appropriate receipt email.
 * Called once per transaction (the IPN and callback race is resolved by the
 * atomic status update, so only the winner reaches this point).
 */
export async function applySuccessfulPayment(tx: SuccessfulPaymentTx): Promise<void> {
  const db = createAdminClient();

  const [{ data: business }, { data: profile }] = await Promise.all([
    db.from("businesses").select("name").eq("id", tx.business_id).single(),
    db
      .from("profiles")
      .select("email")
      .eq("business_id", tx.business_id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const businessName = business?.name || "your business";
  const ownerEmail = profile?.email || "";

  if (tx.purpose === "subscription" && tx.tier_id && tx.period_months) {
    // Idempotency guard: skip if this exact payment already applied a subscription.
    const { data: existing } = await db
      .from("subscriptions")
      .select("id")
      .eq("payment_transaction_id", tx.id)
      .maybeSingle();

    if (existing) {
      console.warn("[subscriptions] Payment already applied to a subscription — skipping:", tx.id);
      return;
    }

    const res = await createOrExtendSubscription({
      businessId: tx.business_id,
      tierId: tx.tier_id,
      months: tx.period_months,
      amountUgx: Number(tx.amount_ugx),
      paymentTransactionId: tx.id,
    });

    if (!res.ok) {
      console.error("[subscriptions] Failed to apply subscription payment:", res.reason);
      return;
    }

    const [{ data: tier }, { data: sub }] = await Promise.all([
      db.from("subscription_tiers").select("name").eq("id", tx.tier_id).single(),
      db.from("subscriptions").select("expires_on").eq("id", res.id).single(),
    ]);

    if (!ownerEmail) {
      console.warn("[subscriptions] No owner email found — skipped subscription receipt");
      return;
    }

    await sendSubscriptionReceipt({
      to: ownerEmail,
      businessName,
      tierName: tier?.name || tx.tier_id,
      months: tx.period_months,
      amountUgx: Number(tx.amount_ugx),
      expiresOn: sub?.expires_on || "",
    });
    return;
  }

  if (ownerEmail) {
    await sendCreditReceipt({
      to: ownerEmail,
      businessName,
      amountUgx: Number(tx.amount_ugx),
      creditsAdded: tx.credits_added,
    });
  }
}

// ---- date helpers ----------------------------------------------------------

function startOfDayUtc(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function parseDateOnly(value: string): number {
  const [y, m, day] = value.split("-").map(Number);
  return Date.UTC(y, m - 1, day);
}

function toDateOnly(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function addMonths(dateOnly: string, months: number): string {
  const [y, m, day] = dateOnly.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + months, day));
  return toDateOnly(dt.getTime());
}

function addDays(dateOnly: string, days: number): string {
  const [y, m, day] = dateOnly.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, day + days));
  return toDateOnly(dt.getTime());
}

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { getSubscriptionGate } from "@/lib/subscriptions";
import { sendExpiryWarning } from "@/lib/email";

const REMINDER_WINDOW_DAYS = 7;

/**
 * Lazy expiry-warning email, fired when a business signs in (no scheduler
 * exists in this app). Sends at most once per reminder window per
 * subscription: when it's within REMINDER_WINDOW_DAYS of expiring or already
 * in grace, and no reminder has been recorded recently.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const businessId = profile?.business_id;
    if (!businessId) {
      return NextResponse.json({ ok: true });
    }

    const gate = await getSubscriptionGate(businessId);
    if (!gate.subscription || gate.status === "none") {
      return NextResponse.json({ ok: true });
    }

    const { subscription } = gate;

    // Only remind when close to expiring or already past expiry.
    if (gate.status === "active") {
      const days = Math.round(
        (new Date(subscription.expires_on).getTime() - Date.now()) / 86400000,
      );
      if (days > REMINDER_WINDOW_DAYS) {
        return NextResponse.json({ ok: true });
      }
    }

    // Skip if a reminder was already sent within the window.
    if (subscription.last_reminder_sent_at) {
      const last = new Date(subscription.last_reminder_sent_at).getTime();
      const withinWindow = Date.now() - last < REMINDER_WINDOW_DAYS * 86400000;
      if (withinWindow) {
        return NextResponse.json({ ok: true });
      }
    }

    const db = createAdminClient();
    const [{ data: business }, { data: profileRow }] = await Promise.all([
      db.from("businesses").select("name").eq("id", businessId).single(),
      db
        .from("profiles")
        .select("email")
        .eq("business_id", businessId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

    const ownerEmail = profileRow?.email;
    if (!ownerEmail) {
      return NextResponse.json({ ok: true });
    }

    const { data: tier } = await db
      .from("subscription_tiers")
      .select("name")
      .eq("id", subscription.tier_id)
      .single();

    const result = await sendExpiryWarning({
      to: ownerEmail,
      businessName: business?.name || "your business",
      tierName: tier?.name || subscription.tier_id,
      expiresOn: subscription.expires_on,
      graceEndsOn: subscription.grace_ends_on,
    });

    if (result.ok) {
      await db
        .from("subscriptions")
        .update({ last_reminder_sent_at: new Date().toISOString() })
        .eq("id", subscription.id);
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[subscriptions] check-expiry error:", message);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}

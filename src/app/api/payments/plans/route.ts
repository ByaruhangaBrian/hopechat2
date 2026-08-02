import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { getSubscriptionPrice } from "@/lib/subscriptions";

const PERIODS = [1, 3, 6, 12];

/**
 * Expose the plan pricing matrix (server-computed so multi-month discounts
 * never leak into client code). Business clients can read subscription_tiers
 * via RLS; the discount config stays in superadmin-only system_settings.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createAdminClient();
    const { data: tiers } = await db
      .from("subscription_tiers")
      .select("id, name, price_ugx, base_credits_monthly, allow_broadcasts, allow_flows, allow_multimodal, max_team_seats")
      .order("price_ugx", { ascending: true });

    if (!tiers) {
      return NextResponse.json({ plans: [] });
    }

    const plans = await Promise.all(
      (tiers ?? []).map(async (tier) => ({
        id: tier.id,
        name: tier.name,
        price_ugx: Number(tier.price_ugx),
        base_credits_monthly: tier.base_credits_monthly,
        allow_broadcasts: tier.allow_broadcasts,
        allow_flows: tier.allow_flows,
        allow_multimodal: tier.allow_multimodal,
        max_team_seats: tier.max_team_seats,
        prices: Object.fromEntries(
          await Promise.all(
            PERIODS.map(async (m) => [String(m), await getSubscriptionPrice(Number(tier.price_ugx), m)]),
          ),
        ),
      })),
    );

    return NextResponse.json({ plans, periods: PERIODS });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load plans";
    console.error("[payments] plans error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

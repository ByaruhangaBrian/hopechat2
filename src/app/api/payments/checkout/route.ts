import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { logHttpEvent } from "@/lib/logs/http-logs";
import { getSubscriptionPrice } from "@/lib/subscriptions";
import {
  getPesapalSettings,
  getPesapalBaseUrl,
  authenticatePesapal,
  createPesapalOrder,
  getOrCreateIpnId,
} from "@/lib/payments/pesapal";

const VALID_PERIODS = [1, 3, 6, 12];

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    
    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse request payload
    const body = await req.json();
    const { amount, businessId, paymentMethod, purpose = "credits", tierId, periodMonths } = body;

    if (!businessId) {
      return NextResponse.json({ error: "Invalid business ID" }, { status: 400 });
    }

    if (purpose !== "credits" && purpose !== "subscription") {
      return NextResponse.json({ error: "Invalid purchase purpose" }, { status: 400 });
    }

    // Subscription purchases are priced server-side from the tier + period.
    // Credit top-ups are priced by the client-supplied amount.
    const adminSupabase = createAdminClient();
    let credits_added: number;
    let finalAmount: number;
    let description: string;

    if (purpose === "subscription") {
      if (!tierId || !VALID_PERIODS.includes(periodMonths)) {
        return NextResponse.json({ error: "Invalid subscription plan or period" }, { status: 400 });
      }
      const { data: tier } = await adminSupabase
        .from("subscription_tiers")
        .select("id, name, price_ugx, base_credits_monthly")
        .eq("id", tierId)
        .single();
      if (!tier) {
        return NextResponse.json({ error: "Subscription plan not found" }, { status: 400 });
      }
      const period = periodMonths as number;
      finalAmount = await getSubscriptionPrice(Number(tier.price_ugx), period);
      credits_added = Number(tier.base_credits_monthly) * period;
      description = `HopeChat ${tier.name} (${period} month${period > 1 ? "s" : ""})`;
    } else {
      if (!amount || isNaN(amount) || amount <= 0) {
        return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
      }
      finalAmount = Number(amount);
      credits_added = Math.round((finalAmount / 10000) * 250);
      description = `HopeChat Balance Top-up: ${credits_added} message credits`;
    }

    // Log checkout attempt
    await logHttpEvent({
      userId: user.id,
      businessId: businessId,
      direction: "outgoing",
      service: "payment",
      endpoint: "/api/payments/checkout",
      note: `Initiating checkout for ${finalAmount.toLocaleString()} UGX (${purpose}) via ${paymentMethod || "mobile_money"}`,
      payload: { amount: finalAmount, purpose, paymentMethod, tierId, periodMonths }
    });

    // 3. Verify user has access to the business (or is superadmin)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("user_id", user.id)
      .single();

    const isSuperAdmin = user.app_metadata?.is_superadmin === true || user.user_metadata?.role === "super_admin";
    
    if (!isSuperAdmin && (profileError || profile?.business_id !== businessId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 4. Resolve Pesapal Credentials (DB first, then Env fallback)
    const pesapalConfig = await getPesapalSettings();

    if (!pesapalConfig.consumer_key || !pesapalConfig.consumer_secret) {
      return NextResponse.json(
        { error: "Pesapal credentials are not configured on the server." },
        { status: 500 }
      );
    }

    // 5. Generate unique merchant reference and calculate credits
    const merchantReference = `HC2-${Date.now()}-${crypto.randomUUID().substring(0, 8)}`;

    // 6. Insert pending record in payment_transactions
    const { error: dbError } = await adminSupabase
      .from("payment_transactions")
      .insert({
        business_id: businessId,
        amount_ugx: finalAmount,
        credits_added: credits_added,
        payment_method: paymentMethod === "card" ? "card" : "mobile_money",
        payment_reference: merchantReference,
        status: "pending",
        purpose,
        tier_id: purpose === "subscription" ? tierId : null,
        period_months: purpose === "subscription" ? (periodMonths as number) : null,
      });

    if (dbError) {
      console.error("Database insert error:", dbError);
      return NextResponse.json({ error: "Failed to create transaction record" }, { status: 500 });
    }

    // 7. Authenticate with Pesapal and get IPN notification_id
    const baseUrl = getPesapalBaseUrl(pesapalConfig.site_url);
    const token = await authenticatePesapal(
      pesapalConfig.consumer_key,
      pesapalConfig.consumer_secret,
      baseUrl
    );

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const ipnUrl = `${siteUrl}/api/payments/ipn`;

    // Register IPN URL (reuses existing if already registered)
    const notificationId = await getOrCreateIpnId(token, ipnUrl, baseUrl);

    // 8. Create order with Pesapal
    const orderResult = await createPesapalOrder(
      token,
      {
        id: merchantReference,
        amount: finalAmount,
        currency: "UGX",
        description,
        callbackUrl: `${siteUrl}/api/payments/callback`,
        notificationId: notificationId,
        billingEmail: user.email || "support@hopechat.com",
        billingPhone: user.user_metadata?.phone || "",
        billingFirstName: user.user_metadata?.full_name?.split(" ")[0] || "HopeChat",
        billingLastName: user.user_metadata?.full_name?.split(" ").slice(1).join(" ") || "Customer",
        billingCountryCode: "UG",
      },
      baseUrl
    );

    // Log checkout success
    await logHttpEvent({
      userId: user.id,
      businessId: businessId,
      direction: "outgoing",
      service: "payment",
      endpoint: "/api/payments/checkout",
      note: `Pesapal checkout link generated for ref ${merchantReference}`,
      statusCode: 200,
      payload: { merchantReference, redirectUrl: orderResult.redirectUrl }
    });

    return NextResponse.json({ link: orderResult.redirectUrl });

  } catch (error: any) {
    console.error("Checkout route error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

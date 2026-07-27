import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { logHttpEvent } from "@/lib/logs/http-logs";
import {
  getPesapalSettings,
  getPesapalBaseUrl,
  authenticatePesapal,
  createPesapalOrder,
  getOrCreateIpnId,
} from "@/lib/payments/pesapal";

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
    const { amount, businessId, paymentMethod } = body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    if (!businessId) {
      return NextResponse.json({ error: "Invalid business ID" }, { status: 400 });
    }

    // Log checkout attempt
    await logHttpEvent({
      userId: user.id,
      businessId: businessId,
      direction: "outgoing",
      service: "payment",
      endpoint: "/api/payments/checkout",
      note: `Initiating checkout for ${amount.toLocaleString()} UGX via ${paymentMethod || "mobile_money"}`,
      payload: { amount, paymentMethod }
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
    const credits_added = Math.round((amount / 10000) * 250);

    // 6. Insert pending record in payment_transactions
    const adminSupabase = createAdminClient();
    const { error: dbError } = await adminSupabase
      .from("payment_transactions")
      .insert({
        business_id: businessId,
        amount_ugx: amount,
        credits_added: credits_added,
        payment_method: paymentMethod === "card" ? "card" : "mobile_money",
        payment_reference: merchantReference,
        status: "pending"
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
        amount: amount,
        currency: "UGX",
        description: `HopeChat Balance Top-up: ${credits_added} message credits`,
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

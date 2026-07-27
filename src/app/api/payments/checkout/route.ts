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
    const timestamp = Date.now();
    const uuidSuffix = crypto.randomUUID().substring(0, 8);
    const merchantReference = `HC2-${timestamp}-${uuidSuffix}`;

    // Credit calculation: 10,000 UGX = 250 credits
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

    // 7. Authenticate with Pesapal and create order
    const baseUrl = getPesapalBaseUrl(pesapalConfig.site_url);
    const token = await authenticatePesapal(
      pesapalConfig.consumer_key,
      pesapalConfig.consumer_secret,
      baseUrl
    );

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const orderResult = await createPesapalOrder(
      token,
      {
        amount: amount,
        currency: "UGX",
        description: `HopeChat Balance Top-up: ${credits_added} message credits`,
        callbackUrl: `${siteUrl}/api/payments/callback`,
        merchantReference: merchantReference,
        billingEmail: user.email || "support@hopechat.com",
        billingFirstName: user.user_metadata?.full_name?.split(" ")[0] || "HopeChat",
        billingLastName: user.user_metadata?.full_name?.split(" ").slice(1).join(" ") || "Customer",
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
      note: `Pesapal checkout link generated successfully for reference ${merchantReference}`,
      statusCode: 200,
      payload: { merchantReference, redirectUrl: orderResult.redirectUrl }
    });

    // Return the redirect URL
    return NextResponse.json({ link: orderResult.redirectUrl });

  } catch (error: any) {
    console.error("Checkout route error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

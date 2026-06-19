import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { logHttpEvent } from "@/lib/logs/http-logs";

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

    // 4. Resolve Flutterwave Credentials (DB first, then Env fallback)
    const adminSupabase = createAdminClient();
    const { data: fwSettings } = await adminSupabase
      .from("system_settings")
      .select("value")
      .eq("id", "flutterwave_global")
      .maybeSingle();

    const secretKey = fwSettings?.value?.secret_key || process.env.FLUTTERWAVE_SECRET_KEY;
    const publicKey = fwSettings?.value?.public_key || process.env.FLUTTERWAVE_PUBLIC_KEY;

    if (!secretKey) {
      return NextResponse.json(
        { error: "Flutterwave credentials are not configured on the server." },
        { status: 500 }
      );
    }

    // 5. Generate unique tx_ref and calculate credits
    const timestamp = Date.now();
    const uuidSuffix = crypto.randomUUID().substring(0, 8);
    const tx_ref = `HC2-${timestamp}-${uuidSuffix}`;

    // Credit calculation: 10,000 UGX = 250 credits
    const credits_added = Math.round((amount / 10000) * 250);

    // 6. Insert pending record in payment_transactions
    const { error: dbError } = await adminSupabase
      .from("payment_transactions")
      .insert({
        business_id: businessId,
        amount_ugx: amount,
        credits_added: credits_added,
        payment_method: paymentMethod === "card" ? "card" : "mobile_money",
        payment_reference: tx_ref,
        status: "pending"
      });

    if (dbError) {
      console.error("Database insert error:", dbError);
      return NextResponse.json({ error: "Failed to create transaction record" }, { status: 500 });
    }

    // 7. Call Flutterwave payment gateway API
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const response = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        tx_ref: tx_ref,
        amount: amount,
        currency: "UGX",
        redirect_url: `${siteUrl}/api/payments/callback`,
        payment_options: "card,mobilemoneyuganda",
        customer: {
          email: user.email || "support@hopechat.com",
          name: user.user_metadata?.full_name || "HopeChat Customer"
        },
        customizations: {
          title: "HopeChat Balance Top-up",
          description: `Purchase ${credits_added} message credits for your business`
        }
      })
    });

    const responseData = await response.json();

    if (!response.ok || responseData.status !== "success") {
      console.error("Flutterwave response error:", responseData);
      await logHttpEvent({
        userId: user.id,
        businessId: businessId,
        direction: "outgoing",
        service: "payment",
        endpoint: "/api/payments/checkout",
        note: `Flutterwave checkout failed: ${responseData?.message || "Payment gateway error"}`,
        statusCode: response.status || 502,
        payload: responseData
      });
      return NextResponse.json(
        { error: responseData.message || "Failed to initiate payment gateway" },
        { status: 502 }
      );
    }

    // Log checkout success
    await logHttpEvent({
      userId: user.id,
      businessId: businessId,
      direction: "outgoing",
      service: "payment",
      endpoint: "/api/payments/checkout",
      note: `Flutterwave checkout link generated successfully for reference ${tx_ref}`,
      statusCode: 200,
      payload: { tx_ref, link: responseData.data.link }
    });

    // Return the link
    return NextResponse.json({ link: responseData.data.link });

  } catch (error: any) {
    console.error("Checkout route error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

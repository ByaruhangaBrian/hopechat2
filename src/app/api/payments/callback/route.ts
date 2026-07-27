import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { logHttpEvent } from "@/lib/logs/http-logs";
import {
  getPesapalSettings,
  getPesapalBaseUrl,
  authenticatePesapal,
  queryPesapalTransactionStatus,
} from "@/lib/payments/pesapal";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const orderTrackingId = searchParams.get("OrderTrackingId");
  const merchantReference = searchParams.get("OrderMerchantReference");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  if (!orderTrackingId || !merchantReference) {
    console.warn("Pesapal callback missing required params", { orderTrackingId, merchantReference });
    await logHttpEvent({
      direction: "incoming",
      service: "payment",
      endpoint: "/api/payments/callback",
      note: `Pesapal callback failed: missing OrderTrackingId or OrderMerchantReference`,
      statusCode: 400,
      payload: { orderTrackingId, merchantReference }
    });
    return NextResponse.redirect(`${siteUrl}/settings?tab=billing&topup=failed`);
  }

  try {
    const adminSupabase = createAdminClient();

    // 1. Resolve Pesapal credentials
    const pesapalConfig = await getPesapalSettings();

    if (!pesapalConfig.consumer_key || !pesapalConfig.consumer_secret) {
      console.error("Pesapal credentials not configured on callback");
      await logHttpEvent({
        direction: "incoming",
        service: "payment",
        endpoint: "/api/payments/callback",
        note: "Pesapal callback failed: credentials not configured in system settings",
        statusCode: 500
      });
      return NextResponse.redirect(`${siteUrl}/settings?tab=billing&topup=failed&error=credentials`);
    }

    // 2. Authenticate with Pesapal and verify transaction status
    const baseUrl = getPesapalBaseUrl(pesapalConfig.site_url);
    const token = await authenticatePesapal(
      pesapalConfig.consumer_key,
      pesapalConfig.consumer_secret,
      baseUrl
    );

    const txStatus = await queryPesapalTransactionStatus(token, orderTrackingId, baseUrl);

    // Pesapal status_code: 0=INVALID, 1=COMPLETED, 2=FAILED, 3=REVERSED
    if (txStatus.statusCode !== 1) {
      console.error("Pesapal transaction not completed:", txStatus);
      await logHttpEvent({
        direction: "incoming",
        service: "payment",
        endpoint: "/api/payments/callback",
        note: `Pesapal callback verification failed: status_code=${txStatus.statusCode} (${txStatus.statusDescription}) for ref ${merchantReference}`,
        statusCode: 400,
        payload: txStatus
      });
      return NextResponse.redirect(`${siteUrl}/settings?tab=billing&topup=failed&error=verification`);
    }

    // 3. Check db for matching merchant reference
    const { data: tx, error: fetchError } = await adminSupabase
      .from("payment_transactions")
      .select("*")
      .eq("payment_reference", merchantReference)
      .maybeSingle();

    if (fetchError || !tx) {
      console.error("Transaction record not found in database:", merchantReference, fetchError);
      await logHttpEvent({
        direction: "incoming",
        service: "payment",
        endpoint: "/api/payments/callback",
        note: `Pesapal callback transaction ref not found: ${merchantReference}`,
        statusCode: 404,
        payload: { merchantReference }
      });
      return NextResponse.redirect(`${siteUrl}/settings?tab=billing&topup=failed&error=not_found`);
    }

    // If already processed (idempotent)
    if (tx.status === "successful" || tx.status === "success") {
      console.warn("Transaction already marked successful:", merchantReference);
      await logHttpEvent({
        businessId: tx.business_id,
        direction: "incoming",
        service: "payment",
        endpoint: "/api/payments/callback",
        note: `Pesapal callback received for already completed transaction ref: ${merchantReference}`,
        statusCode: 200,
        payload: { merchantReference, status: tx.status }
      });
      return NextResponse.redirect(`${siteUrl}/settings?tab=billing&topup=success`);
    }

    // 4. Update status atomically to "successful"
    const { data: updatedTx, error: updateError } = await adminSupabase
      .from("payment_transactions")
      .update({ status: "successful" })
      .eq("id", tx.id)
      .eq("status", "pending")
      .select()
      .maybeSingle();

    if (updateError || !updatedTx) {
      console.error("Failed to update transaction status atomically:", updateError);
      await logHttpEvent({
        businessId: tx.business_id,
        direction: "incoming",
        service: "payment",
        endpoint: "/api/payments/callback",
        note: `Pesapal callback database status update failed for transaction ID ${tx.id}`,
        statusCode: 500,
        payload: { error: updateError, tx_id: tx.id }
      });
      return NextResponse.redirect(`${siteUrl}/settings?tab=billing&topup=failed&error=concurrency`);
    }

    await logHttpEvent({
      businessId: tx.business_id,
      direction: "incoming",
      service: "payment",
      endpoint: "/api/payments/callback",
      note: `Successfully verified Pesapal payment: ${tx.amount_ugx} UGX (+${tx.credits_added} credits) for ${merchantReference}`,
      statusCode: 200,
      payload: { merchantReference, amount: tx.amount_ugx, credits_added: tx.credits_added, paymentMethod: txStatus.paymentMethod, confirmationCode: txStatus.confirmationCode }
    });

    return NextResponse.redirect(`${siteUrl}/settings?tab=billing&topup=success`);

  } catch (error: any) {
    console.error("Pesapal callback route error:", error);
    await logHttpEvent({
      direction: "incoming",
      service: "payment",
      endpoint: "/api/payments/callback",
      note: `Pesapal callback route processing error: ${error?.message || "Unknown error"}`,
      statusCode: 500,
      payload: { error: error?.message || error }
    });
    return NextResponse.redirect(`${siteUrl}/settings?tab=billing&topup=failed&error=system`);
  }
}

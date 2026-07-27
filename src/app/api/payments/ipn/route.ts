import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { logHttpEvent } from "@/lib/logs/http-logs";
import {
  getPesapalSettings,
  getPesapalBaseUrl,
  authenticatePesapal,
  queryPesapalTransactionStatus,
} from "@/lib/payments/pesapal";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { OrderTrackingId, OrderMerchantReference, Status, StatusDescription } = body;

    await logHttpEvent({
      direction: "incoming",
      service: "payment",
      endpoint: "/api/payments/ipn",
      note: `Pesapal IPN received: ref=${OrderMerchantReference}, status=${Status} (${StatusDescription})`,
      statusCode: 200,
      payload: body
    });

    if (!OrderTrackingId || !OrderMerchantReference) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // 1. Resolve Pesapal credentials
    const pesapalConfig = await getPesapalSettings();

    if (!pesapalConfig.consumer_key || !pesapalConfig.consumer_secret) {
      console.error("Pesapal credentials not configured for IPN verification");
      return NextResponse.json({ error: "Credentials not configured" }, { status: 500 });
    }

    // 2. Authenticate and verify the transaction status with Pesapal directly
    const baseUrl = getPesapalBaseUrl(pesapalConfig.site_url);
    const token = await authenticatePesapal(
      pesapalConfig.consumer_key,
      pesapalConfig.consumer_secret,
      baseUrl
    );

    const txStatus = await queryPesapalTransactionStatus(
      token,
      OrderTrackingId,
      OrderMerchantReference,
      baseUrl
    );

    // Only process completed transactions (Pesapal status "0" = success)
    if (txStatus.status !== "0") {
      await logHttpEvent({
        direction: "incoming",
        service: "payment",
        endpoint: "/api/payments/ipn",
        note: `Pesapal IPN: transaction not completed, status=${txStatus.status} for ref ${OrderMerchantReference}`,
        statusCode: 200,
        payload: txStatus
      });
      return NextResponse.json({ received: true });
    }

    // 3. Find the transaction in our database
    const { data: tx, error: fetchError } = await adminSupabase
      .from("payment_transactions")
      .select("*")
      .eq("payment_reference", OrderMerchantReference)
      .maybeSingle();

    if (fetchError || !tx) {
      console.error("IPN: Transaction record not found:", OrderMerchantReference);
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    // If already processed, return success (idempotent)
    if (tx.status === "successful" || tx.status === "success") {
      return NextResponse.json({ received: true });
    }

    // 4. Update status atomically
    const { data: updatedTx, error: updateError } = await adminSupabase
      .from("payment_transactions")
      .update({ status: "successful" })
      .eq("id", tx.id)
      .eq("status", "pending")
      .select()
      .maybeSingle();

    if (updateError || !updatedTx) {
      console.error("IPN: Failed to update transaction:", updateError);
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    await logHttpEvent({
      businessId: tx.business_id,
      direction: "incoming",
      service: "payment",
      endpoint: "/api/payments/ipn",
      note: `Pesapal IPN processed: ${tx.amount_ugx} UGX (+${tx.credits_added} credits) for ${OrderMerchantReference}`,
      statusCode: 200,
      payload: { OrderMerchantReference, amount: tx.amount_ugx, credits_added: tx.credits_added }
    });

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error("Pesapal IPN route error:", error);
    await logHttpEvent({
      direction: "incoming",
      service: "payment",
      endpoint: "/api/payments/ipn",
      note: `Pesapal IPN error: ${error?.message || "Unknown error"}`,
      statusCode: 500,
      payload: { error: error?.message || error }
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

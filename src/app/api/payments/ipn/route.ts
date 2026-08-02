import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { logHttpEvent } from "@/lib/logs/http-logs";
import { applySuccessfulPayment } from "@/lib/subscriptions";
import {
  getPesapalSettings,
  getPesapalBaseUrl,
  authenticatePesapal,
  queryPesapalTransactionStatus,
} from "@/lib/payments/pesapal";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { OrderTrackingId, OrderMerchantReference, OrderNotificationType } = body;

    await logHttpEvent({
      direction: "incoming",
      service: "payment",
      endpoint: "/api/payments/ipn",
      note: `Pesapal IPN received: ref=${OrderMerchantReference}, type=${OrderNotificationType}`,
      statusCode: 200,
      payload: body
    });

    if (!OrderTrackingId || !OrderMerchantReference) {
      return NextResponse.json(
        { orderNotificationType: "IPNCHANGE", orderTrackingId: "", orderMerchantReference: "", status: 500 },
        { status: 200 }
      );
    }

    const adminSupabase = createAdminClient();

    // 1. Resolve Pesapal credentials
    const pesapalConfig = await getPesapalSettings();

    if (!pesapalConfig.consumer_key || !pesapalConfig.consumer_secret) {
      console.error("Pesapal credentials not configured for IPN verification");
      return NextResponse.json(
        { orderNotificationType: "IPNCHANGE", orderTrackingId: OrderTrackingId, orderMerchantReference: OrderMerchantReference, status: 500 },
        { status: 200 }
      );
    }

    // 2. Authenticate and verify the transaction status with Pesapal directly
    const baseUrl = getPesapalBaseUrl(pesapalConfig.site_url);
    const token = await authenticatePesapal(
      pesapalConfig.consumer_key,
      pesapalConfig.consumer_secret,
      baseUrl
    );

    const txStatus = await queryPesapalTransactionStatus(token, OrderTrackingId, baseUrl);

    // Pesapal status_code: 0=INVALID, 1=COMPLETED, 2=FAILED, 3=REVERSED
    if (txStatus.statusCode !== 1) {
      await logHttpEvent({
        direction: "incoming",
        service: "payment",
        endpoint: "/api/payments/ipn",
        note: `Pesapal IPN: transaction not completed, status_code=${txStatus.statusCode} for ref ${OrderMerchantReference}`,
        statusCode: 200,
        payload: txStatus
      });
      return NextResponse.json(
        { orderNotificationType: "IPNCHANGE", orderTrackingId: OrderTrackingId, orderMerchantReference: OrderMerchantReference, status: 200 },
        { status: 200 }
      );
    }

    // 3. Find the transaction in our database
    const { data: tx, error: fetchError } = await adminSupabase
      .from("payment_transactions")
      .select("*")
      .eq("payment_reference", OrderMerchantReference)
      .maybeSingle();

    if (fetchError || !tx) {
      console.error("IPN: Transaction record not found:", OrderMerchantReference);
      return NextResponse.json(
        { orderNotificationType: "IPNCHANGE", orderTrackingId: OrderTrackingId, orderMerchantReference: OrderMerchantReference, status: 500 },
        { status: 200 }
      );
    }

    // If already processed, return success (idempotent)
    if (tx.status === "successful" || tx.status === "success") {
      return NextResponse.json(
        { orderNotificationType: "IPNCHANGE", orderTrackingId: OrderTrackingId, orderMerchantReference: OrderMerchantReference, status: 200 },
        { status: 200 }
      );
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
      return NextResponse.json(
        { orderNotificationType: "IPNCHANGE", orderTrackingId: OrderTrackingId, orderMerchantReference: OrderMerchantReference, status: 500 },
        { status: 200 }
      );
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

    // Fire-and-forget: apply subscription / send receipt. Swallowed errors are
    // logged inside so a failed email never breaks the Pesapal IPN handshake.
    void applySuccessfulPayment(updatedTx).catch((err) => {
      console.error("[payments] applySuccessfulPayment failed:", err?.message ?? err);
    });

    return NextResponse.json(
      { orderNotificationType: "IPNCHANGE", orderTrackingId: OrderTrackingId, orderMerchantReference: OrderMerchantReference, status: 200 },
      { status: 200 }
    );

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
    return NextResponse.json(
      { orderNotificationType: "IPNCHANGE", orderTrackingId: "", orderMerchantReference: "", status: 500 },
      { status: 200 }
    );
  }
}

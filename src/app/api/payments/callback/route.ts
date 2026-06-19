import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { logHttpEvent } from "@/lib/logs/http-logs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const transactionId = searchParams.get("transaction_id");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // If the status is not successful, redirect to failure directly
  if (status !== "successful" || !transactionId) {
    console.warn("Callback received non-successful status or missing transaction ID", { status, transactionId });
    await logHttpEvent({
      direction: "incoming",
      service: "payment",
      endpoint: "/api/payments/callback",
      note: `Callback failed: non-successful status (${status}) or missing transaction ID (${transactionId})`,
      statusCode: 400,
      payload: { status, transactionId }
    });
    return NextResponse.redirect(`${siteUrl}/settings?tab=billing&topup=failed`);
  }

  try {
    const adminSupabase = createAdminClient();

    // 1. Resolve Flutterwave secret key (DB first, then Env fallback)
    const { data: fwSettings } = await adminSupabase
      .from("system_settings")
      .select("value")
      .eq("id", "flutterwave_global")
      .maybeSingle();

    const secretKey = fwSettings?.value?.secret_key || process.env.FLUTTERWAVE_SECRET_KEY;

    if (!secretKey) {
      console.error("Flutterwave credentials not configured on callback");
      await logHttpEvent({
        direction: "incoming",
        service: "payment",
        endpoint: "/api/payments/callback",
        note: "Callback failed: Flutterwave keys not configured in system settings",
        statusCode: 500
      });
      return NextResponse.redirect(`${siteUrl}/settings?tab=billing&topup=failed&error=credentials`);
    }

    // 2. Perform verification request to Flutterwave
    const response = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json"
      }
    });

    const responseData = await response.json();

    if (!response.ok || responseData.status !== "success" || responseData.data.status !== "successful") {
      console.error("Flutterwave verification failed:", responseData);
      await logHttpEvent({
        direction: "incoming",
        service: "payment",
        endpoint: "/api/payments/callback",
        note: `Callback verification failed for Flutterwave tx ID ${transactionId}`,
        statusCode: response.status || 502,
        payload: responseData
      });
      return NextResponse.redirect(`${siteUrl}/settings?tab=billing&topup=failed&error=verification`);
    }

    const { tx_ref, amount, currency } = responseData.data;

    // Verify it is UGX
    if (currency !== "UGX") {
      console.error("Currency mismatch:", currency);
      await logHttpEvent({
        direction: "incoming",
        service: "payment",
        endpoint: "/api/payments/callback",
        note: `Callback currency mismatch: Expected UGX, received ${currency}`,
        statusCode: 400,
        payload: { currency, amount, tx_ref }
      });
      return NextResponse.redirect(`${siteUrl}/settings?tab=billing&topup=failed&error=currency`);
    }

    // 3. Check db for duplicate tx_ref and process update atomically
    // Fetch transaction record first to confirm it matches amount and is pending
    const { data: tx, error: fetchError } = await adminSupabase
      .from("payment_transactions")
      .select("*")
      .eq("payment_reference", tx_ref)
      .maybeSingle();

    if (fetchError || !tx) {
      console.error("Transaction record not found in database:", tx_ref, fetchError);
      await logHttpEvent({
        direction: "incoming",
        service: "payment",
        endpoint: "/api/payments/callback",
        note: `Callback transaction ref not found: ${tx_ref}`,
        statusCode: 404,
        payload: { tx_ref }
      });
      return NextResponse.redirect(`${siteUrl}/settings?tab=billing&topup=failed&error=not_found`);
    }

    // If transaction has already been processed (e.g. webhook or double callback click)
    if (tx.status === "successful" || tx.status === "success") {
      console.warn("Transaction already marked successful:", tx_ref);
      await logHttpEvent({
        businessId: tx.business_id,
        direction: "incoming",
        service: "payment",
        endpoint: "/api/payments/callback",
        note: `Callback received for already completed transaction ref: ${tx_ref}`,
        statusCode: 200,
        payload: { tx_ref, status: tx.status }
      });
      return NextResponse.redirect(`${siteUrl}/settings?tab=billing&topup=success`);
    }

    // Validate amount matches (handling float conversion carefully)
    const dbAmount = parseFloat(tx.amount_ugx);
    const apiAmount = parseFloat(amount);
    if (Math.abs(dbAmount - apiAmount) > 0.01) {
      console.error("Amount mismatch:", { dbAmount, apiAmount });
      await logHttpEvent({
        businessId: tx.business_id,
        direction: "incoming",
        service: "payment",
        endpoint: "/api/payments/callback",
        note: `Callback verification failed: amount mismatch (DB: ${dbAmount}, API: ${apiAmount})`,
        statusCode: 400,
        payload: { tx_ref, dbAmount, apiAmount }
      });
      return NextResponse.redirect(`${siteUrl}/settings?tab=billing&topup=failed&error=amount_mismatch`);
    }

    // 4. Update status atomically to "successful"
    // Since the database trigger 'trigger_process_transaction_ledger' executes AFTER UPDATE inside the same transaction block,
    // this single atomic query updates transaction status and increments business balance/credits in one strict ACID block.
    const { data: updatedTx, error: updateError } = await adminSupabase
      .from("payment_transactions")
      .update({ status: "successful" })
      .eq("id", tx.id)
      .eq("status", "pending") // Strict optimistic lock preventing concurrent updates
      .select()
      .maybeSingle();

    if (updateError || !updatedTx) {
      console.error("Failed to update transaction status atomically (possible concurrency lock):", updateError);
      await logHttpEvent({
        businessId: tx.business_id,
        direction: "incoming",
        service: "payment",
        endpoint: "/api/payments/callback",
        note: `Callback database status update failed for transaction ID ${tx.id}`,
        statusCode: 500,
        payload: { error: updateError, tx_id: tx.id }
      });
      return NextResponse.redirect(`${siteUrl}/settings?tab=billing&topup=failed&error=concurrency`);
    }

    // Log callback processing success
    await logHttpEvent({
      businessId: tx.business_id,
      direction: "incoming",
      service: "payment",
      endpoint: "/api/payments/callback",
      note: `Successfully verified and applied payment top-up of ${amount} UGX (+${tx.credits_added} credits) for ${tx_ref}`,
      statusCode: 200,
      payload: { tx_ref, amount, credits_added: tx.credits_added }
    });

    // Redirect to settings with success parameter
    return NextResponse.redirect(`${siteUrl}/settings?tab=billing&topup=success`);

  } catch (error: any) {
    console.error("Callback route error:", error);
    await logHttpEvent({
      direction: "incoming",
      service: "payment",
      endpoint: "/api/payments/callback",
      note: `Callback route processing error: ${error?.message || "Unknown error"}`,
      statusCode: 500,
      payload: { error: error?.message || error }
    });
    return NextResponse.redirect(`${siteUrl}/settings?tab=billing&topup=failed&error=system`);
  }
}

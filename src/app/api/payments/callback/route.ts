import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const transactionId = searchParams.get("transaction_id");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // If the status is not successful, redirect to failure directly
  if (status !== "successful" || !transactionId) {
    console.warn("Callback received non-successful status or missing transaction ID", { status, transactionId });
    return NextResponse.redirect(`${siteUrl}/settings?topup=failed`);
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
      return NextResponse.redirect(`${siteUrl}/settings?topup=failed&error=credentials`);
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
      return NextResponse.redirect(`${siteUrl}/settings?topup=failed&error=verification`);
    }

    const { tx_ref, amount, currency } = responseData.data;

    // Verify it is UGX
    if (currency !== "UGX") {
      console.error("Currency mismatch:", currency);
      return NextResponse.redirect(`${siteUrl}/settings?topup=failed&error=currency`);
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
      return NextResponse.redirect(`${siteUrl}/settings?topup=failed&error=not_found`);
    }

    // If transaction has already been processed (e.g. webhook or double callback click)
    if (tx.status === "successful" || tx.status === "success") {
      console.warn("Transaction already marked successful:", tx_ref);
      return NextResponse.redirect(`${siteUrl}/settings?topup=success`);
    }

    // Validate amount matches (handling float conversion carefully)
    const dbAmount = parseFloat(tx.amount_ugx);
    const apiAmount = parseFloat(amount);
    if (Math.abs(dbAmount - apiAmount) > 0.01) {
      console.error("Amount mismatch:", { dbAmount, apiAmount });
      return NextResponse.redirect(`${siteUrl}/settings?topup=failed&error=amount_mismatch`);
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
      return NextResponse.redirect(`${siteUrl}/settings?topup=failed&error=concurrency`);
    }

    // Redirect to settings with success parameter
    return NextResponse.redirect(`${siteUrl}/settings?topup=success`);

  } catch (error: any) {
    console.error("Callback route error:", error);
    return NextResponse.redirect(`${siteUrl}/settings?topup=failed&error=system`);
  }
}

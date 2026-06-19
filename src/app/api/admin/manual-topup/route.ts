import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // 1. Authenticate caller and verify Super Admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuperAdmin = user.app_metadata?.is_superadmin === true || user.user_metadata?.role === "super_admin";
    if (!isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. Parse payload
    const body = await req.json();
    const { businessId, creditsToAdd, reason } = body;

    const credits = parseInt(creditsToAdd, 10);
    if (!businessId) {
      return NextResponse.json({ error: "Invalid business ID" }, { status: 400 });
    }
    if (isNaN(credits) || credits <= 0) {
      return NextResponse.json({ error: "Invalid credits quantity" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // 3. Insert transaction log to 'payment_transactions' with status 'successful'
    // The database trigger 'trigger_process_transaction_ledger' will automatically increment
    // the target business's 'credits_remaining' field atomically inside the same transaction block.
    const auditReference = `MANUAL-${Date.now()}-${crypto.randomUUID().substring(0, 8)}`;
    const { data: tx, error: txError } = await adminSupabase
      .from("payment_transactions")
      .insert({
        business_id: businessId,
        amount_ugx: 0.00,
        credits_added: credits,
        payment_method: "manual_admin",
        payment_reference: auditReference,
        status: "successful"
      })
      .select()
      .single();

    if (txError) {
      console.error("Manual top-up database error:", txError);
      return NextResponse.json({ error: "Failed to record manual transaction" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      transaction_id: tx.id,
      credits_added: credits,
      reference: auditReference
    });

  } catch (error: any) {
    console.error("Manual top-up route error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

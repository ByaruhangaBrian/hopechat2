import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function PUT(req: Request) {
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
    const { 
      id, 
      price_ugx, 
      base_credits_monthly, 
      max_team_seats, 
      allow_broadcasts, 
      allow_flows, 
      allow_multimodal 
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Invalid tier ID" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // 3. Update the targeted row
    const { data: tier, error: updateError } = await adminSupabase
      .from("subscription_tiers")
      .update({
        price_ugx: parseFloat(price_ugx),
        base_credits_monthly: parseInt(base_credits_monthly, 10),
        max_team_seats: parseInt(max_team_seats, 10),
        allow_broadcasts: !!allow_broadcasts,
        allow_flows: !!allow_flows,
        allow_multimodal: !!allow_multimodal,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Database update error:", updateError);
      return NextResponse.json({ error: "Failed to update pricing tier configurations" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      tier
    });

  } catch (error: any) {
    console.error("Pricing tiers route error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function PUT(req: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_superadmin')
      .eq('user_id', user.id)
      .single();

    if (!profile?.is_superadmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { trial_days, trial_credits, trial_features } = body;

    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from("system_settings")
      .upsert(
        {
          id: "trial_settings",
          value: {
            trial_days: typeof trial_days === "number" ? trial_days : 14,
            trial_credits: typeof trial_credits === "number" ? trial_credits : 500,
            trial_features: trial_features || {},
          },
        },
        { onConflict: "id" },
      );

    if (error) {
      console.error("Failed to save trial settings:", error);
      return NextResponse.json({ error: "Failed to save trial settings" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Trial settings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

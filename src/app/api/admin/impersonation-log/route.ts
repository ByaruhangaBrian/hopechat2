import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuperAdmin = user.app_metadata?.is_superadmin === true || user.user_metadata?.role === "super_admin";
    if (!isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { businessId, businessName, action } = body;

    if (!businessId || !businessName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    if (action === "start") {
      const { data, error } = await adminSupabase
        .from("admin_impersonation_logs")
        .insert({
          admin_user_id: user.id,
          admin_email: user.email,
          business_id: businessId,
          business_name: businessName,
          ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
          user_agent: req.headers.get("user-agent") || "unknown",
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, log_id: data.id });
    }

    if (action === "end") {
      const { logId } = body;
      if (!logId) {
        // Find the most recent open session for this admin+business
        const { data: openLog } = await adminSupabase
          .from("admin_impersonation_logs")
          .select("id, started_at")
          .eq("admin_user_id", user.id)
          .eq("business_id", businessId)
          .is("ended_at", null)
          .order("started_at", { ascending: false })
          .limit(1)
          .single();

        if (openLog) {
          const duration = Math.floor((Date.now() - new Date(openLog.started_at).getTime()) / 1000);
          await adminSupabase
            .from("admin_impersonation_logs")
            .update({ ended_at: new Date().toISOString(), duration_seconds: duration })
            .eq("id", openLog.id);
        }
      } else {
        const { data: openLog } = await adminSupabase
          .from("admin_impersonation_logs")
          .select("started_at")
          .eq("id", logId)
          .single();

        if (openLog) {
          const duration = Math.floor((Date.now() - new Date(openLog.started_at).getTime()) / 1000);
          await adminSupabase
            .from("admin_impersonation_logs")
            .update({ ended_at: new Date().toISOString(), duration_seconds: duration })
            .eq("id", logId);
        }
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Impersonation log error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuperAdmin = user.app_metadata?.is_superadmin === true || user.user_metadata?.role === "super_admin";
    if (!isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminSupabase = createAdminClient();
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const businessId = searchParams.get("business_id");

    let query = adminSupabase
      .from("admin_impersonation_logs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(limit);

    if (businessId) {
      query = query.eq("business_id", businessId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ logs: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

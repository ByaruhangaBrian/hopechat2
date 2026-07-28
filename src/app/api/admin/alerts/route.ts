import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isSuperAdmin = user.app_metadata?.is_superadmin === true || user.user_metadata?.role === "super_admin";
    if (!isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const adminSupabase = createAdminClient();
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const unreadOnly = searchParams.get("unread") === "true";
    const alertType = searchParams.get("type");

    let query = adminSupabase
      .from("admin_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (unreadOnly) query = query.eq("is_read", false);
    if (alertType) query = query.eq("alert_type", alertType);

    const { data, error } = await query;
    if (error) throw error;

    // Get unread count
    const { count: unreadCount } = await adminSupabase
      .from("admin_alerts")
      .select("*", { count: "exact", head: true })
      .eq("is_read", false);

    return NextResponse.json({ alerts: data, unread_count: unreadCount || 0 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isSuperAdmin = user.app_metadata?.is_superadmin === true || user.user_metadata?.role === "super_admin";
    if (!isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { alert_type, business_id, severity, title, message, metadata } = body;

    if (!alert_type || !title || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from("admin_alerts")
      .insert({
        alert_type,
        business_id: business_id || null,
        severity: severity || "info",
        title,
        message,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, alert: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isSuperAdmin = user.app_metadata?.is_superadmin === true || user.user_metadata?.role === "super_admin";
    if (!isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { id, is_read, mark_all_read } = body;

    const adminSupabase = createAdminClient();

    if (mark_all_read) {
      await adminSupabase
        .from("admin_alerts")
        .update({ is_read: true })
        .eq("is_read", false);
      return NextResponse.json({ success: true });
    }

    if (!id) return NextResponse.json({ error: "Missing alert ID" }, { status: 400 });

    const { error } = await adminSupabase
      .from("admin_alerts")
      .update({ is_read: is_read ?? true })
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

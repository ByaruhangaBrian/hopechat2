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
    const limit = parseInt(searchParams.get("limit") || "100");
    const category = searchParams.get("category");
    const businessId = searchParams.get("business_id");

    let query = adminSupabase
      .from("business_expenses")
      .select("*")
      .order("expense_date", { ascending: false })
      .limit(limit);

    if (category) query = query.eq("category", category);
    if (businessId) query = query.eq("business_id", businessId);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ expenses: data });
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
    const { business_id, category, description, amount_ugx, amount_usd, reference, expense_date, notes } = body;

    if (!category || !description || !amount_ugx) {
      return NextResponse.json({ error: "Missing required fields (category, description, amount_ugx)" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from("business_expenses")
      .insert({
        business_id: business_id || null,
        category,
        description,
        amount_ugx: parseFloat(amount_ugx),
        amount_usd: parseFloat(amount_usd || "0"),
        reference: reference || null,
        expense_date: expense_date || new Date().toISOString().split("T")[0],
        created_by: user.id,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, expense: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isSuperAdmin = user.app_metadata?.is_superadmin === true || user.user_metadata?.role === "super_admin";
    if (!isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing expense ID" }, { status: 400 });

    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase.from("business_expenses").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

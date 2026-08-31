import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import {
  isEngaged,
  type RecoveryEmailKind,
} from "@/lib/onboarding-funnel";
import {
  sendSignupReminder,
  sendSetupReminder,
  sendEngagementReminder,
} from "@/lib/email";

interface LeadRow {
  id: string;
  email: string;
  full_name: string | null;
  business_name: string | null;
  stage: string;
  user_id: string | null;
  business_id: string | null;
  email_kind: RecoveryEmailKind | null;
  email_sent_at: string | null;
  email_error: string | null;
  emailed_by: string | null;
  opt_out: boolean;
  created_at: string;
  updated_at: string;
}

async function isSuperAdmin(req: Request): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return false;
  return user.app_metadata?.is_superadmin === true || user.user_metadata?.role === "super_admin";
}

export async function GET(req: Request) {
  try {
    if (!(await isSuperAdmin(req))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = createAdminClient();
    const { searchParams } = new URL(req.url);
    const stage = searchParams.get("stage") || "all";
    const limit = parseInt(searchParams.get("limit") || "200");
    const search = searchParams.get("search")?.trim();

    let query = admin
      .from("onboarding_funnels")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (stage !== "all") query = query.eq("stage", stage);
    if (search) query = query.ilike("email", `%${search}%`);

    const { data, error } = await query;
    if (error) throw error;

    // Count by stage for summary cards.
    const { data: all } = await admin.from("onboarding_funnels").select("stage");
    const counts: Record<string, number> = { all: all?.length ?? 0 };
    for (const row of all ?? []) {
      counts[row.stage] = (counts[row.stage] ?? 0) + 1;
    }

    return NextResponse.json({ leads: data, counts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const isSuper =
      user.app_metadata?.is_superadmin === true || user.user_metadata?.role === "super_admin";
    if (!isSuper) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { id, email_kind } = body as { id?: string; email_kind?: RecoveryEmailKind };

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "A lead id is required" }, { status: 400 });
    }
    if (
      !email_kind ||
      !["signup_reminder", "setup_reminder", "engagement_reminder"].includes(email_kind)
    ) {
      return NextResponse.json({ error: "A valid email_kind is required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: lead, error } = await admin
      .from("onboarding_funnels")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    // Verify the kind is appropriate for this lead's stage (defensive).
    const kindToStage: Record<RecoveryEmailKind, string[]> = {
      signup_reminder: ["email_captured"],
      setup_reminder: ["signed_up"],
      engagement_reminder: ["onboarding_complete", "signed_up", "email_captured"],
    };
    if (!kindToStage[email_kind].includes(lead.stage)) {
      return NextResponse.json(
        { error: `Email kind '${email_kind}' is not valid for a lead at stage '${lead.stage}'` },
        { status: 400 },
      );
    }

    const row = lead as LeadRow;

    // For engagement reminder, only send if the lead hasn't engaged.
    if (email_kind === "engagement_reminder") {
      const engaged = await isEngaged({ userId: row.user_id, businessId: row.business_id });
      if (engaged) {
        await admin
          .from("onboarding_funnels")
          .update({ stage: "engaged", email_kind: null })
          .eq("id", row.id);
        return NextResponse.json({
          ok: false,
          message: "This lead has engaged already; marking them as engaged.",
        });
      }
    }

    const common = {
      to: row.email,
      fullName: row.full_name,
      businessName: row.business_name,
      businessId: row.business_id,
    };

    const result =
      email_kind === "signup_reminder"
        ? await sendSignupReminder(common)
        : email_kind === "setup_reminder"
          ? await sendSetupReminder(common)
          : await sendEngagementReminder(common);

    await admin
      .from("onboarding_funnels")
      .update({
        email_kind,
        email_sent_at: new Date().toISOString(),
        email_error: result.ok ? null : result.error ?? "unknown error",
        emailed_by: user.id,
      })
      .eq("id", row.id);

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
    }

    return NextResponse.json({ ok: true, message: "Email sent" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const isSuper =
      user.app_metadata?.is_superadmin === true || user.user_metadata?.role === "super_admin";
    if (!isSuper) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { id, opt_out } = body as { id?: string; opt_out?: boolean };

    if (!id || typeof opt_out !== "boolean") {
      return NextResponse.json({ error: "id and opt_out are required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin.from("onboarding_funnels").update({ opt_out }).eq("id", id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, business_id, is_superadmin")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (profile.role !== "owner" && profile.role !== "admin" && !profile.is_superadmin) {
      return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
    }

    let businessId = profile.business_id;
    if (profile.is_superadmin) {
      const cookieStore = await cookies();
      const impersonatedId = cookieStore.get("impersonated_business_id")?.value;
      if (impersonatedId) {
        businessId = impersonatedId;
      }
    }

    if (!businessId) {
      return NextResponse.json({ error: "No business context found" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data: users, error: selectError } = await adminClient
      .from("profiles")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: true });

    if (selectError) {
      throw selectError;
    }

    // Fetch plan limits and tier information
    const { data: business, error: bizError } = await adminClient
      .from("businesses")
      .select(`
        name,
        tier_id,
        subscription_tiers (
          name,
          max_team_seats
        )
      `)
      .eq("id", businessId)
      .single();

    if (bizError || !business) {
      return NextResponse.json({ error: "Failed to load business subscription info" }, { status: 400 });
    }

    const tierInfo = business.subscription_tiers as any;

    return NextResponse.json({
      users: users || [],
      business: {
        name: business.name,
        tier_id: business.tier_id,
        plan_name: tierInfo?.name || "Bronze Plan",
        max_team_seats: tierInfo?.max_team_seats ?? 1
      }
    });
  } catch (error: any) {
    console.error("GET tenant users error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, business_id, is_superadmin")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (profile.role !== "owner" && profile.role !== "admin" && !profile.is_superadmin) {
      return NextResponse.json({ error: "Forbidden: Admin or owner role required" }, { status: 403 });
    }

    let businessId = profile.business_id;
    if (profile.is_superadmin) {
      const cookieStore = await cookies();
      const impersonatedId = cookieStore.get("impersonated_business_id")?.value;
      if (impersonatedId) {
        businessId = impersonatedId;
      }
    }

    if (!businessId) {
      return NextResponse.json({ error: "No business context found" }, { status: 400 });
    }

    const { email, full_name, role, password } = await req.json();
    if (!email || !full_name || !role || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (role !== "admin" && role !== "agent") {
      return NextResponse.json({ error: "Role must be 'admin' or 'agent'" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // 1. Fetch current business subscription plan and limits
    const { data: business, error: bizError } = await adminClient
      .from("businesses")
      .select(`
        tier_id,
        subscription_tiers (
          id,
          name,
          max_team_seats
        )
      `)
      .eq("id", businessId)
      .single();

    if (bizError || !business) {
      return NextResponse.json({ error: "Failed to retrieve subscription plan configurations" }, { status: 400 });
    }

    const tierInfo = business.subscription_tiers as any;
    const maxSeats = tierInfo?.max_team_seats ?? 1;

    // 2. Count existing team members (profiles)
    const { count: currentSeatsCount, error: countError } = await adminClient
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId);

    if (countError) {
      throw countError;
    }

    const currentSeats = currentSeatsCount ?? 0;

    // 3. Enforce seat limit check
    if (currentSeats >= maxSeats) {
      const planName = tierInfo?.name || "Bronze Plan";
      return NextResponse.json({
        error: `Seat limit reached: Your current ${planName} allows a maximum of ${maxSeats} user seats. Please upgrade your subscription to add more agents.`
      }, { status: 400 });
    }

    // 4. Create user in Supabase auth
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        business_id: businessId
      }
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // 5. Update the default profile from 'owner' role to the specified role
    const { error: profileError } = await adminClient
      .from("profiles")
      .update({
        role,
        full_name
      })
      .eq("user_id", authUser.user.id);

    if (profileError) {
      // Rollback auth user creation if profile setup fails
      await adminClient.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json({ error: `Failed to initialize profile: ${profileError.message}` }, { status: 500 });
    }

    // 6. Fetch full new profile
    const { data: newProfile } = await adminClient
      .from("profiles")
      .select("*")
      .eq("user_id", authUser.user.id)
      .single();

    return NextResponse.json(newProfile, { status: 201 });
  } catch (error: any) {
    console.error("POST tenant users error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

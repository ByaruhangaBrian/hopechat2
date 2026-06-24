import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetUserId } = await params;
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

    const { full_name, role } = await req.json();

    const adminClient = createAdminClient();

    // Verify target user belongs to same business
    const { data: targetProfile, error: targetError } = await adminClient
      .from("profiles")
      .select("*")
      .eq("user_id", targetUserId)
      .single();

    if (targetError || !targetProfile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    if (targetProfile.business_id !== businessId) {
      return NextResponse.json({ error: "Forbidden: Target user belongs to another business" }, { status: 403 });
    }

    // Role validations
    if (role) {
      if (role !== "admin" && role !== "agent") {
        return NextResponse.json({ error: "Role must be 'admin' or 'agent'" }, { status: 400 });
      }
      
      // Do not allow self-demotion or self-change of role via this route
      if (targetUserId === user.id) {
        return NextResponse.json({ error: "You cannot modify your own role" }, { status: 400 });
      }

      // Do not allow demoting owners
      if (targetProfile.role === "owner") {
        return NextResponse.json({ error: "Owner role cannot be changed" }, { status: 400 });
      }
    }

    const updates: Record<string, any> = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (role !== undefined) updates.role = role;

    if (Object.keys(updates).length > 0) {
      const { data: updatedProfile, error: updateError } = await adminClient
        .from("profiles")
        .update(updates)
        .eq("user_id", targetUserId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json(updatedProfile);
    }

    return NextResponse.json(targetProfile);
  } catch (error: any) {
    console.error("PATCH tenant user error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetUserId } = await params;
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

    if (targetUserId === user.id) {
      return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Verify target user belongs to same business
    const { data: targetProfile, error: targetError } = await adminClient
      .from("profiles")
      .select("*")
      .eq("user_id", targetUserId)
      .single();

    if (targetError || !targetProfile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    if (targetProfile.business_id !== businessId) {
      return NextResponse.json({ error: "Forbidden: Target user belongs to another business" }, { status: 403 });
    }

    // Protect owners from deletion
    if (targetProfile.role === "owner") {
      return NextResponse.json({ error: "The primary business owner cannot be deleted" }, { status: 400 });
    }

    // Delete user from Supabase Auth (Cascades to delete profile row automatically)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetUserId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true, message: "User deleted successfully" });
  } catch (error: any) {
    console.error("DELETE tenant user error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

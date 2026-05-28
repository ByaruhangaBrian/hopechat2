import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const adminSupabase = createAdminClient();
    const { 
      business_name, 
      plan_tier, 
      owner_name, 
      owner_email, 
      owner_password,
      whatsapp 
    } = await req.json();

    // Note: We use the adminSupabase client which bypasses RLS.
    // The middleware already protects /api/admin by checking superadmin status.

    // 2. Create Business
    const { data: business, error: bizError } = await adminSupabase
      .from("businesses")
      .insert({
        name: business_name,
        plan_tier: plan_tier || 'basic',
        status: 'active',
        features: {
          ai_enabled: true,
          broadcasts_enabled: true,
          automations_enabled: true,
          pipelines_enabled: true
        }
      })
      .select()
      .single();

    if (bizError) throw bizError;

    // 3. Create Owner Account
    const { data: authUser, error: authError } = await adminSupabase.auth.admin.createUser({
      email: owner_email,
      password: owner_password,
      email_confirm: true,
      user_metadata: {
        full_name: owner_name,
        business_id: business.id,
        business_name: business.name
      }
    });

    if (authError) {
      // Rollback business creation? In a real app yes, here we'll just throw
      await adminSupabase.from("businesses").delete().eq("id", business.id);
      throw authError;
    }

    // 4. WhatsApp Config (Optional)
    if (whatsapp?.phone_number_id && whatsapp?.access_token) {
      const { error: waError } = await adminSupabase
        .from("whatsapp_config")
        .insert({
          business_id: business.id,
          phone_number_id: whatsapp.phone_number_id,
          waba_id: whatsapp.waba_id || null,
          access_token: whatsapp.access_token,
          verify_token: whatsapp.verify_token || 'hopechat_' + Math.random().toString(36).substring(7),
          status: 'disconnected'
        });
      
      if (waError) {
        console.error("Failed to create WhatsApp config:", waError);
        // We don't fail the whole onboarding for this
      }
    }

    return NextResponse.json({ 
      success: true, 
      business_id: business.id,
      owner_id: authUser.user.id 
    });

  } catch (error: any) {
    console.error("Onboarding error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

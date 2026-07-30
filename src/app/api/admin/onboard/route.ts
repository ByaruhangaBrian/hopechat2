import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const adminSupabase = createAdminClient();
    const { 
      business_name, 
      plan_tier,
      tier_id,
      owner_name, 
      owner_email, 
      owner_password,
      whatsapp 
    } = await req.json();

    const resolvedTierId = tier_id || plan_tier || 'bronze';

    // Fetch tier details to set features and quotas
    const { data: tierData } = await adminSupabase
      .from("subscription_tiers")
      .select("*")
      .eq("id", resolvedTierId)
      .single();

    const tier = tierData || { 
      allow_broadcasts: false, 
      allow_flows: false, 
      allow_multimodal: false,
      base_credits_monthly: 1500,
      max_team_seats: 1
    };

    // 2. Create Business
    const { data: business, error: bizError } = await adminSupabase
      .from("businesses")
      .insert({
        name: business_name,
        plan_tier: resolvedTierId,
        tier_id: resolvedTierId,
        status: 'active',
        credits_remaining: tier.base_credits_monthly || 1500,
        usage_quotas: {
          max_contacts: resolvedTierId === "gold" ? 10000 : resolvedTierId === "silver" ? 5000 : 100,
          max_messages: resolvedTierId === "gold" ? 100000 : resolvedTierId === "silver" ? 50000 : 1000,
        },
        features: {
          ai_enabled: true,
          broadcasts_enabled: tier.allow_broadcasts ?? false,
          flows_enabled: tier.allow_flows ?? false,
          multimodal_enabled: tier.allow_multimodal ?? false,
          automations_enabled: true,
          pipelines_enabled: true,
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

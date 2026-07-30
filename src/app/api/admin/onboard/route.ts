import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { encrypt } from "@/lib/whatsapp/encryption";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_superadmin')
      .eq('user_id', user.id)
      .single()

    if (!profile?.is_superadmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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
      max_team_seats: 1,
      trial_days: 0,
      trial_credits: 0,
      trial_features: {}
    };

    const isTrial = (tier.trial_days || 0) > 0;
    const status = isTrial ? 'trialing' : 'active';
    const credits_remaining = isTrial ? (tier.trial_credits || 0) : (tier.base_credits_monthly || 1500);
    const features = isTrial
      ? {
          ...{
            ai_enabled: true,
            inbox_enabled: true,
            contacts_enabled: true,
            broadcasts_enabled: false,
            flows_enabled: false,
            multimodal_enabled: false,
            automations_enabled: true,
            pipelines_enabled: true,
          },
          ...(tier.trial_features || {}),
        }
      : {
          ai_enabled: true,
          inbox_enabled: true,
          contacts_enabled: true,
          broadcasts_enabled: tier.allow_broadcasts ?? false,
          flows_enabled: tier.allow_flows ?? false,
          multimodal_enabled: tier.allow_multimodal ?? false,
          automations_enabled: true,
          pipelines_enabled: true,
        };

    // 2. Create Business
    const { data: business, error: bizError } = await adminSupabase
      .from("businesses")
      .insert({
        name: business_name,
        plan_tier: resolvedTierId,
        tier_id: resolvedTierId,
        status,
        credits_remaining,
        usage_quotas: {
          max_contacts: resolvedTierId === "gold" ? 10000 : resolvedTierId === "silver" ? 5000 : 100,
          max_messages: resolvedTierId === "gold" ? 100000 : resolvedTierId === "silver" ? 50000 : 1000,
        },
        features
      })
      .select()
      .single();

    if (bizError) throw bizError;

    // 3. Create Owner Account
    const { data: authUser, error: createUserError } = await adminSupabase.auth.admin.createUser({
      email: owner_email,
      password: owner_password,
      email_confirm: true,
      user_metadata: {
        full_name: owner_name,
        business_id: business.id,
        business_name: business.name
      }
    });

    if (createUserError) {
      // Rollback business creation? In a real app yes, here we'll just throw
      await adminSupabase.from("businesses").delete().eq("id", business.id);
      throw createUserError;
    }

    if (!authUser?.user) {
      await adminSupabase.from("businesses").delete().eq("id", business.id);
      throw new Error('Failed to create user account');
    }

    // 4. WhatsApp Config (Optional)
    if (whatsapp?.phone_number_id && whatsapp?.access_token) {
      const { error: waError } = await adminSupabase
        .from("whatsapp_config")
        .insert({
          business_id: business.id,
          phone_number_id: whatsapp.phone_number_id,
          waba_id: whatsapp.waba_id || null,
          access_token: encrypt(whatsapp.access_token),
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

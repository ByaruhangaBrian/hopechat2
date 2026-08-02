import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/whatsapp/encryption';
import { appendFileSync } from 'fs';
import { join } from 'path';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    if (!type) return NextResponse.json({ error: 'Missing type' }, { status: 400 });

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile?.business_id) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    // 1. Fetch Integration
    const { data: integration } = await supabase
      .from('business_integrations')
      .select('*')
      .eq('business_id', profile.business_id)
      .eq('type', type)
      .maybeSingle();

    // 2. Fetch Global Settings for bot email
    const { data: globalSettings } = await supabase
      .from('system_settings')
      .select('value')
      .eq('id', 'integrations_global')
      .maybeSingle();

    const globalBotEmail = (globalSettings?.value as any)?.google_sheets?.default_service_account?.client_email || '';

    return NextResponse.json({
      integration,
      global_bot_email: globalBotEmail
    });
  } catch (err) {
    console.error('[integrations] GET failed:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let requestBody: any = null;
  try {
    const body = await req.json();
    requestBody = body;
    const { type, is_enabled, config } = body;
    
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile?.business_id) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    // Prepare config (encrypt private key if provided)
    const finalConfig = { ...config };
    if (config.private_key && config.private_key.trim().length > 0) {
      const normalizedKey = config.private_key
        .replace(/\\r\\n/g, '\n')
        .replace(/\\r/g, '\n')
        .replace(/\\n/g, '\n')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim();
      finalConfig.private_key = encrypt(normalizedKey);
    } else {
      // If no new key, keep existing if it exists
      const { data: existing } = await supabase
        .from('business_integrations')
        .select('config')
        .eq('business_id', profile.business_id)
        .eq('type', type)
        .maybeSingle();
      
      if (existing?.config?.private_key) {
        finalConfig.private_key = existing.config.private_key;
      }
    }

    const { data, error } = await supabase
      .from('business_integrations')
      .upsert({
        business_id: profile.business_id,
        type,
        is_enabled,
        config: finalConfig,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'business_id, type'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, integration: data });
  } catch (err: any) {
    console.error('[integrations] POST failed:', err);
    try {
      appendFileSync(
        join(process.cwd(), 'error_log.txt'),
        `[${new Date().toISOString()}] POST failed: ${err.message}\nStack: ${err.stack}\nPayload config: ${JSON.stringify(requestBody?.config)}\n\n`
      );
    } catch (logErr) {
      console.error('Failed to write to error_log.txt:', logErr);
    }
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!profile?.business_id) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const { data: legal } = await supabase
      .from('system_settings')
      .select('value')
      .eq('id', 'legal_versions')
      .maybeSingle()

    const versions = legal?.value ?? {}
    const termsVersion = versions.terms_version ?? 1
    const privacyVersion = versions.privacy_version ?? 1

    const { data: record } = await supabase
      .from('consent_records')
      .select('accepted_at, terms_version, privacy_version')
      .eq('user_id', user.id)
      .eq('terms_version', termsVersion)
      .eq('privacy_version', privacyVersion)
      .order('accepted_at', { ascending: false })
      .maybeSingle()

    return NextResponse.json({
      terms_version: termsVersion,
      privacy_version: privacyVersion,
      accepted: !!record,
      accepted_at: record?.accepted_at ?? null,
    })
  } catch (error) {
    console.error('Consent status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
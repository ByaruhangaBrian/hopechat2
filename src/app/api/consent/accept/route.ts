import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

function captureIp(req: Request): string | null {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim() || null
  return req.headers.get('x-real-ip')
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: { terms_version?: unknown; privacy_version?: unknown }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const termsVersion = Number(body.terms_version)
    const privacyVersion = Number(body.privacy_version)
    if (
      !Number.isInteger(termsVersion) ||
      termsVersion <= 0 ||
      !Number.isInteger(privacyVersion) ||
      privacyVersion <= 0
    ) {
      return NextResponse.json(
        { error: 'terms_version and privacy_version must be positive integers' },
        { status: 400 },
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!profile?.business_id) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Reject stale clients: accepted versions must equal what is live now.
    const { data: legal } = await supabase
      .from('system_settings')
      .select('value')
      .eq('id', 'legal_versions')
      .maybeSingle()

    const versions = legal?.value ?? {}
    const currentTerms = versions.terms_version ?? 1
    const currentPrivacy = versions.privacy_version ?? 1
    if (termsVersion !== currentTerms || privacyVersion !== currentPrivacy) {
      return NextResponse.json(
        { error: 'Stale consent version', current_terms_version: currentTerms, current_privacy_version: currentPrivacy },
        { status: 400 },
      )
    }

    const admin = createAdminClient()
    const { error: insertErr } = await admin
      .from('consent_records')
      .insert({
        business_id: profile.business_id,
        user_id: user.id,
        terms_version: termsVersion,
        privacy_version: privacyVersion,
        ip_address: captureIp(req),
        user_agent: req.headers.get('user-agent') ?? null,
      })
      .select()
      .maybeSingle()

    if (insertErr) {
      // Unique (user_id, terms_version, privacy_version) already exists —
      // that's an idempotent re-accept, not a failure.
      if (`${insertErr.code}` !== '23505') {
        console.error('Consent accept insert error:', insertErr)
        return NextResponse.json({ error: 'Failed to record consent' }, { status: 500 })
      }
    }

    // A tenant that has accepted is no longer "soft" — enforce going forward.
    const { error: flipErr } = await admin
      .from('businesses')
      .update({ consent_state: 'required' })
      .eq('id', profile.business_id)
    if (flipErr) {
      console.error('Consent accept flip error:', flipErr)
      return NextResponse.json({ error: 'Failed to record consent' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Consent accept error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
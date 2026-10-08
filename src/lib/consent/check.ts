import type { SupabaseClient } from '@supabase/supabase-js'

export type ConsentGateDecision = 'ok' | 'soft' | 'blocked'

/**
 * Cheap consent-gate decision for the app proxy (Task 14).
 *
 * Runs with the user's server-scoped client so it honours the same RLS as the
 * rest of the app (profiles, businesses, system_settings, consent_records all
 * readable by the authenticated user). Honours
 * `system_settings.consent_gate.enforce_from`: until that cutoff exists (or is
 * still in the future) nothing is hard-gated. Fails open so a broken gate can
 * never lock users out.
 */
export async function getConsentGateDecision(
  supabase: SupabaseClient,
  userId: string
): Promise<ConsentGateDecision> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', userId)
      .maybeSingle()
    if (!profile?.business_id) return 'ok'

    const [{ data: gateSetting }, { data: business }] = await Promise.all([
      supabase
        .from('system_settings')
        .select('value')
        .eq('id', 'consent_gate')
        .maybeSingle(),
      supabase
        .from('businesses')
        .select('consent_state')
        .eq('id', profile.business_id)
        .maybeSingle(),
    ])

    const enforceFromRaw = (
      gateSetting?.value as { enforce_from?: string | null } | null | undefined
    )?.enforce_from
    const enforceFrom = enforceFromRaw ? Date.parse(enforceFromRaw) : NaN
    if (!Number.isFinite(enforceFrom) || Date.now() < enforceFrom) return 'ok'

    const consentState = business?.consent_state ?? 'required'

    const { data: legalSetting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('id', 'legal_versions')
      .maybeSingle()
    const legal =
      (legalSetting?.value as { terms_version?: number; privacy_version?: number } | null | undefined) ?? {}
    const termsVersion = legal.terms_version ?? 1
    const privacyVersion = legal.privacy_version ?? 1

    const { data: record } = await supabase
      .from('consent_records')
      .select('id')
      .eq('user_id', userId)
      .eq('terms_version', termsVersion)
      .eq('privacy_version', privacyVersion)
      .maybeSingle()

    if (record) return 'ok'
    return consentState === 'required' ? 'blocked' : 'soft'
  } catch {
    return 'ok'
  }
}
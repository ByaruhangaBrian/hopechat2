import { supabaseAdmin } from '@/lib/automations/admin-client'

export const DEFAULT_SESSION_TIMEOUT_HOURS = 2

export interface BusinessSettings {
  /** Hours of inactivity before an untimed session is discarded. */
  session_timeout_hours: number
}

/**
 * Load a business's runtime settings from `business_settings`.
 * Falls back to defaults when the row is missing or malformed.
 */
export async function getBusinessSettings(businessId: string): Promise<BusinessSettings> {
  const db = supabaseAdmin()
  const { data } = await db
    .from('business_settings')
    .select('value')
    .eq('business_id', businessId)
    .maybeSingle()

  const v = (data?.value ?? {}) as Record<string, unknown>
  const hours = Number(v.session_timeout_hours)
  return {
    session_timeout_hours:
      Number.isFinite(hours) && hours > 0 ? hours : DEFAULT_SESSION_TIMEOUT_HOURS,
  }
}

/** Convenience accessor for the inactivity window, in hours. */
export async function getSessionTimeoutHours(businessId: string): Promise<number> {
  const settings = await getBusinessSettings(businessId)
  return settings.session_timeout_hours
}
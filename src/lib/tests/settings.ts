import { supabaseAdmin } from '@/lib/automations/admin-client'
import { normalizeAiSchedule, type AiSchedule } from '@/lib/ai/schedule'
import { normalizeEscalationPolicy, type EscalationPolicy } from '@/lib/ai/escalation'

export const DEFAULT_SESSION_TIMEOUT_HOURS = 2

export interface BusinessSettings {
  /** Hours of inactivity before an untimed session is discarded. */
  session_timeout_hours: number
  /** When true, the AI assistant can offer this business's tests (confirm-first). */
  enable_ai_test_offers: boolean
  /** Business-level availability window for the AI assistant. */
  ai_schedule: AiSchedule
  /** When and how the AI hands a conversation off to a human. */
  escalation: EscalationPolicy
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
    enable_ai_test_offers: v.enable_ai_test_offers !== false,
    ai_schedule: normalizeAiSchedule(v.ai_schedule),
    escalation: normalizeEscalationPolicy(v.escalation),
  }
}

/**
 * Merge `patch` into a business's `business_settings.value` without clobbering
 * unrelated keys. `business_settings` is a single JSONB column shared by
 * several features, so writers must read-modify-write rather than replace.
 */
export async function updateBusinessSettings(
  businessId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const db = supabaseAdmin()
  const { data } = await db
    .from('business_settings')
    .select('value')
    .eq('business_id', businessId)
    .maybeSingle()

  const existing = (data?.value ?? {}) as Record<string, unknown>
  const { error } = await db.from('business_settings').upsert(
    {
      business_id: businessId,
      value: { ...existing, ...patch },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'business_id' },
  )

  if (error) throw new Error(error.message)
}

/** Convenience accessor for the inactivity window, in hours. */
export async function getSessionTimeoutHours(businessId: string): Promise<number> {
  const settings = await getBusinessSettings(businessId)
  return settings.session_timeout_hours
}
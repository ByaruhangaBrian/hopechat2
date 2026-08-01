import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Lazy, shared service-role client — same pattern as automations/admin-client.
let _adminClient: SupabaseClient | null = null

function admin(): SupabaseClient {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
  }
  return _adminClient
}

export type CreditAction = 'ai_chat' | 'interactive_form' | 'bulk_broadcast'

export interface CreditCostEntry {
  credits: number
  label: string
}

export interface CreditCosts {
  ai_chat: CreditCostEntry
  interactive_form: CreditCostEntry
  bulk_broadcast: CreditCostEntry
  credit_ugx_rate: number
}

const DEFAULT_COSTS: CreditCosts = {
  ai_chat: { credits: 1, label: 'Inbound AI Chat Session' },
  interactive_form: { credits: 1, label: 'Interactive Form / Flow' },
  bulk_broadcast: { credits: 15, label: 'Bulk Broadcast' },
  credit_ugx_rate: 40,
}

/**
 * Fetch the current credit costs from system_settings.
 * Falls back to defaults if the row is missing.
 */
export async function getCreditCosts(): Promise<CreditCosts> {
  const db = admin()
  const { data } = await db
    .from('system_settings')
    .select('value')
    .eq('id', 'credit_costs')
    .maybeSingle()

  if (!data?.value) return DEFAULT_COSTS

  const v = data.value
  return {
    ai_chat: v.ai_chat ?? DEFAULT_COSTS.ai_chat,
    interactive_form: v.interactive_form ?? DEFAULT_COSTS.interactive_form,
    bulk_broadcast: v.bulk_broadcast ?? DEFAULT_COSTS.bulk_broadcast,
    credit_ugx_rate: v.credit_ugx_rate ?? DEFAULT_COSTS.credit_ugx_rate,
  }
}

/**
 * Return the number of credits required for a given action type.
 */
export async function getCreditCost(action: CreditAction): Promise<number> {
  const costs = await getCreditCosts()
  return costs[action].credits
}

/**
 * Check whether a business has enough credits for an action.
 */
export async function checkCredits(
  businessId: string,
  action: CreditAction,
): Promise<{ ok: true; remaining: number } | { ok: false; remaining: number; required: number }> {
  const required = await getCreditCost(action)
  const db = admin()
  const { data } = await db
    .from('businesses')
    .select('credits_remaining')
    .eq('id', businessId)
    .single()

  const remaining = data?.credits_remaining ?? 0
  if (remaining >= required) {
    return { ok: true, remaining }
  }
  return { ok: false, remaining, required }
}

export interface ConsumeCreditsOptions {
  /** The actor who triggered the consumption, if any. */
  userId?: string | null
  /** Human-readable reason, e.g. "Inbound AI chat response". */
  description?: string
  /** Optional business-scoped reference (conversation_id, broadcast_id, ...). */
  referenceId?: string
  /** Optional extra context stored on the ledger row. */
  metadata?: Record<string, unknown>
}

export interface ConsumeCreditsSuccess {
  ok: true
  newBalance: number
  /** Id of the ledger row written to credit_usage_logs. */
  usageId: string | null
}

export type ConsumeCreditsResult =
  | ConsumeCreditsSuccess
  | { ok: false; reason: string }

/**
 * Atomically deduct credits from a business.
 * Uses a conditional UPDATE (credits_remaining >= N) to prevent races and
 * re-reads after the write so a 0-row match (concurrent double-spend) is
 * detected instead of silently reporting success. Retries a few times on
 * contention. Every successful deduction is recorded in credit_usage_logs.
 */
export async function consumeCredits(
  businessId: string,
  action: CreditAction,
  options: ConsumeCreditsOptions = {},
): Promise<ConsumeCreditsResult> {
  const required = await getCreditCost(action)
  const db = admin()

  for (let attempt = 0; attempt < 3; attempt++) {
    // Step 1: Check current balance
    const { data: row } = await db
      .from('businesses')
      .select('credits_remaining')
      .eq('id', businessId)
      .single()

    const current = row?.credits_remaining ?? 0
    if (current < required) {
      return {
        ok: false,
        reason: `Insufficient credits: have ${current}, need ${required}`,
      }
    }

    // Step 2: Atomic conditional update (prevents double-spend via race).
    // `.select()` + `.maybeSingle()` lets us tell whether the row actually
    // matched the guard; a 0-row match means another request won the race.
    const newBalance = current - required
    const { data: updated, error } = await db
      .from('businesses')
      .update({ credits_remaining: newBalance })
      .eq('id', businessId)
      .gte('credits_remaining', current)
      .select('credits_remaining')
      .maybeSingle()

    if (error) {
      return { ok: false, reason: `Database error: ${error.message}` }
    }

    if (!updated) {
      // Concurrent deduction happened between our read and write — retry.
      continue
    }

    // Step 3: Record the consumption in the credit ledger.
    // The balance update is authoritative; if this insert fails we surface
    // the error but do not roll back the deduction.
    const { data: usage, error: usageError } = await db
      .from('credit_usage_logs')
      .insert({
        business_id: businessId,
        user_id: options.userId ?? null,
        action,
        credits_used: required,
        description: options.description ?? null,
        reference_id: options.referenceId ?? null,
        metadata: options.metadata ?? {},
      })
      .select('id')
      .single()

    if (usageError) {
      console.error(
        `[credits] Deducted ${required} credit(s) but failed to write usage log for business ${businessId}:`,
        usageError.message,
      )
    }

    return { ok: true, newBalance, usageId: usage?.id ?? null }
  }

  return {
    ok: false,
    reason: 'Credits are being deducted concurrently — please retry',
  }
}

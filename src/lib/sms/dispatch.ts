import { supabaseAdmin } from '@/lib/automations/admin-client'
import { getCreditCosts, consumeCredits, refundCredits } from '@/lib/credits'
import {
  getSmsSettings,
  normalizeUgPhone,
  sendKintuSms,
} from '@/lib/sms/kintu-sms'
import { logHttpEvent } from '@/lib/logs/http-logs'

export const SMS_MAX_RECIPIENTS = 1000
export const SMS_MAX_MESSAGE_LENGTH = 160
const INSERT_CHUNK = 200

export interface DispatchRecipient {
  contactId?: string | null
  phone: string
}

export interface DispatchSmsParams {
  businessId: string
  userId: string
  name: string
  message: string
  /** Persisted on the broadcast for reporting. */
  audience?: Record<string, unknown> | null
  recipients: DispatchRecipient[]
}

export type DispatchSmsResult =
  | {
      ok: true
      broadcastId: string
      total: number
      sent: number
      failed: number
      creditsUsed: number
      newBalance: number
    }
  | { ok: false; status: number; error: string }

/**
 * Shared core for bulk SMS broadcasts (used by both the compose flow
 * and retrying a failed broadcast).
 *
 * Flow: validates the input, writes the sms_broadcast + recipient rows,
 * deducts recipients × cost-per-message credits up front, then
 * dispatches the whole audience to KintuSMS in one comma-separated call.
 *
 * Credits are charged only when the gateway actually accepts the send:
 * a rejected call (the whole batch fails together) is refunded and the
 * broadcast is recorded as failed with credits_used = 0.
 */
export async function dispatchSmsBroadcast(
  params: DispatchSmsParams,
): Promise<DispatchSmsResult> {
  const { businessId, userId, name, message, audience, recipients } = params

  const cleanName = (name ?? '').trim()
  if (!cleanName) {
    return { ok: false, status: 400, error: 'Broadcast name is required' }
  }

  const cleanMessage = (message ?? '').trim()
  if (!cleanMessage) {
    return { ok: false, status: 400, error: 'Message is required' }
  }
  if (cleanMessage.length > SMS_MAX_MESSAGE_LENGTH) {
    return {
      ok: false,
      status: 400,
      error: `Message is ${cleanMessage.length} characters — SMS allows at most ${SMS_MAX_MESSAGE_LENGTH}.`,
    }
  }

  if (!Array.isArray(recipients) || recipients.length === 0) {
    return { ok: false, status: 400, error: 'Provide at least one recipient' }
  }
  if (recipients.length > SMS_MAX_RECIPIENTS) {
    return {
      ok: false,
      status: 400,
      error: `A single SMS broadcast is capped at ${SMS_MAX_RECIPIENTS} recipients`,
    }
  }

  // SMS gateway must be configured and enabled.
  const settings = await getSmsSettings()
  if (!settings || !settings.enabled) {
    return {
      ok: false,
      status: 400,
      error: 'SMS sending is not enabled. Contact your administrator.',
    }
  }
  if (!settings.url || !settings.username || !settings.password || !settings.sender) {
    return {
      ok: false,
      status: 500,
      error: 'SMS provider is not fully configured. Contact your administrator.',
    }
  }

  // Normalize + dedupe by phone, dropping numbers we can't interpret.
  const seen = new Set<string>()
  const valid: { contactId: string | null; phone: string; recipientPhone: string }[] = []
  for (const r of recipients) {
    if (!r.phone) continue
    const normalized = normalizeUgPhone(r.phone)
    if (!normalized) continue
    if (seen.has(normalized)) continue
    seen.add(normalized)
    valid.push({
      contactId: r.contactId ?? null,
      phone: r.phone,
      recipientPhone: normalized,
    })
  }

  if (valid.length === 0) {
    return {
      ok: false,
      status: 400,
      error: 'None of the selected recipients have a valid Ugandan phone number.',
    }
  }

  const db = supabaseAdmin()

  // ── Credit gate: check first for a friendly error, then deduct
  //    atomically after the rows are created. Cost = recipients ×
  //    cost-per-message, deducted once per broadcast.
  const costs = await getCreditCosts()
  const costPerMessage = costs.sms_per_message.credits
  const totalCost = valid.length * costPerMessage

  const { data: business } = await db
    .from('businesses')
    .select('credits_remaining')
    .eq('id', businessId)
    .single()

  if ((business?.credits_remaining ?? 0) < totalCost) {
    return {
      ok: false,
      status: 402,
      error: `Insufficient credits: this broadcast needs ${totalCost} credits (${valid.length} recipients × ${costPerMessage}), but you have ${business?.credits_remaining ?? 0}.`,
    }
  }

  // ── Create broadcast + recipient rows ─────────────────────────
  const { data: broadcast, error: broadcastError } = await db
    .from('sms_broadcasts')
    .insert({
      business_id: businessId,
      user_id: userId,
      name: cleanName,
      message: cleanMessage,
      audience_filter: audience ?? null,
      status: 'sending',
      total_recipients: valid.length,
      sent_count: 0,
      failed_count: 0,
      credits_used: totalCost,
    })
    .select('id')
    .single()

  if (broadcastError || !broadcast) {
    return {
      ok: false,
      status: 500,
      error: `Failed to create broadcast: ${broadcastError?.message ?? 'unknown error'}`,
    }
  }

  const recipientRows = valid.map((r) => ({
    sms_broadcast_id: broadcast.id,
    contact_id: r.contactId,
    phone: r.phone,
    recipient_phone: r.recipientPhone,
    status: 'pending' as const,
  }))

  for (let i = 0; i < recipientRows.length; i += INSERT_CHUNK) {
    const chunk = recipientRows.slice(i, i + INSERT_CHUNK)
    const { error: recipientError } = await db.from('sms_recipients').insert(chunk)
    if (recipientError) {
      await db
        .from('sms_broadcasts')
        .update({ status: 'failed', failed_count: valid.length, credits_used: 0 })
        .eq('id', broadcast.id)
      return {
        ok: false,
        status: 500,
        error: `Failed to save recipients: ${recipientError.message}`,
      }
    }
  }

  // ── Deduct credits (atomic, retried on contention) ────────────
  const deduction = await consumeCredits(businessId, 'sms', {
    userId,
    amount: totalCost,
    referenceId: broadcast.id,
    description: `SMS broadcast: ${cleanName}`,
    metadata: {
      recipient_count: valid.length,
      cost_per_message: costPerMessage,
    },
  })

  if (!deduction.ok) {
    await db
      .from('sms_broadcasts')
      .update({ status: 'failed', credits_used: 0 })
      .eq('id', broadcast.id)
    return { ok: false, status: 402, error: deduction.reason }
  }

  // ── Dispatch to the gateway ───────────────────────────────────
  const numbers = valid.map((r) => r.recipientPhone)
  const result = await sendKintuSms(settings, numbers, cleanMessage)

  await logHttpEvent({
    userId,
    businessId,
    direction: 'outgoing',
    service: 'sms',
    endpoint: settings.url,
    payload: { recipient_count: numbers.length },
    statusCode: result.ok ? 200 : 502,
    note: `SMS broadcast "${cleanName}": ${result.raw.slice(0, 300)}`,
  })

  if (result.ok) {
    const now = new Date().toISOString()
    await db
      .from('sms_recipients')
      .update({ status: 'sent', sent_at: now, error_message: null })
      .eq('sms_broadcast_id', broadcast.id)
    await db
      .from('sms_broadcasts')
      .update({ status: 'sent', sent_count: valid.length })
      .eq('id', broadcast.id)

    return {
      ok: true,
      broadcastId: broadcast.id,
      total: valid.length,
      sent: valid.length,
      failed: 0,
      creditsUsed: totalCost,
      newBalance: deduction.newBalance,
    }
  }

  // ── Refund: the gateway rejected the whole call, so nothing was
  //    actually sent. Restore the balance and erase the ledger charge.
  const refund = await refundCredits(businessId, {
    amount: totalCost,
    referenceId: broadcast.id,
  })
  if (!refund.ok) {
    console.error(`[sms] Refund failed for broadcast ${broadcast.id}:`, refund.reason)
  }

  await db
    .from('sms_recipients')
    .update({ status: 'failed', error_message: result.raw.slice(0, 500) })
    .eq('sms_broadcast_id', broadcast.id)
  await db
    .from('sms_broadcasts')
    .update({ status: 'failed', failed_count: valid.length, credits_used: 0 })
    .eq('id', broadcast.id)

  return {
    ok: false,
    status: 502,
    error: `SMS gateway rejected the send: ${result.raw.slice(0, 200)}`,
  }
}

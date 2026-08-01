import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/automations/admin-client'
import { getCreditCosts, consumeCredits, refundCredits } from '@/lib/credits'
import {
  getSmsSettings,
  normalizeUgPhone,
  sendKintuSms,
} from '@/lib/sms/kintu-sms'
import { logHttpEvent } from '@/lib/logs/http-logs'
import {
  checkRateLimit,
  rateLimitResponse,
  RATE_LIMITS,
} from '@/lib/rate-limit'

const MAX_RECIPIENTS = 1000
const MAX_MESSAGE_LENGTH = 160
const INSERT_CHUNK = 200

interface SmsRecipientInput {
  contactId?: string | null
  phone: string
}

/**
 * POST /api/sms/send
 *
 * Body:
 *   {
 *     businessId: string,
 *     name: string,
 *     message: string,          // plain text, ≤160 chars
 *     audience: AudienceConfig, // persisted for reporting
 *     recipients: Array<{ contactId?: string; phone: string }>
 *   }
 *
 * Flow: validates the request, writes the sms_broadcast + recipient
 * rows, deducts recipients × cost-per-message credits up front, then
 * dispatches the whole audience to KintuSMS in one comma-separated call.
 *
 * Credits are charged only when the gateway actually accepts the send:
 * a rejected call (the whole batch fails together) is refunded and the
 * broadcast is recorded as failed with credits_used = 0.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limit = checkRateLimit(`sms:${user.id}`, RATE_LIMITS.broadcast)
    if (!limit.success) {
      return rateLimitResponse(limit)
    }

    const body = await request.json()
    const { businessId, name, message, audience, recipients } = body as {
      businessId: string
      name: string
      message: string
      audience?: Record<string, unknown>
      recipients: SmsRecipientInput[]
    }

    if (!businessId) {
      return NextResponse.json({ error: 'Missing businessId' }, { status: 400 })
    }

    const cleanName = (name ?? '').trim()
    if (!cleanName) {
      return NextResponse.json({ error: 'Broadcast name is required' }, { status: 400 })
    }

    const cleanMessage = (message ?? '').trim()
    if (!cleanMessage) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }
    if (cleanMessage.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        {
          error: `Message is ${cleanMessage.length} characters — SMS allows at most ${MAX_MESSAGE_LENGTH}.`,
        },
        { status: 400 },
      )
    }

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { error: 'Provide at least one recipient' },
        { status: 400 },
      )
    }
    if (recipients.length > MAX_RECIPIENTS) {
      return NextResponse.json(
        { error: `A single SMS broadcast is capped at ${MAX_RECIPIENTS} recipients` },
        { status: 400 },
      )
    }

    // Verify the user belongs to this business.
    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.business_id !== businessId) {
      return NextResponse.json({ error: 'Business mismatch' }, { status: 403 })
    }

    // SMS gateway must be configured and enabled.
    const settings = await getSmsSettings()
    if (!settings || !settings.enabled) {
      return NextResponse.json(
        { error: 'SMS sending is not enabled. Contact your administrator.' },
        { status: 400 },
      )
    }
    if (!settings.url || !settings.username || !settings.password || !settings.sender) {
      return NextResponse.json(
        { error: 'SMS provider is not fully configured. Contact your administrator.' },
        { status: 500 },
      )
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
      return NextResponse.json(
        { error: 'None of the selected recipients have a valid Ugandan phone number.' },
        { status: 400 },
      )
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
      return NextResponse.json(
        {
          error: `Insufficient credits: this broadcast needs ${totalCost} credits (${valid.length} recipients × ${costPerMessage}), but you have ${business?.credits_remaining ?? 0}.`,
        },
        { status: 402 },
      )
    }

    // ── Create broadcast + recipient rows ─────────────────────────
    const { data: broadcast, error: broadcastError } = await db
      .from('sms_broadcasts')
      .insert({
        business_id: businessId,
        user_id: user.id,
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
      return NextResponse.json(
        { error: `Failed to create broadcast: ${broadcastError?.message ?? 'unknown error'}` },
        { status: 500 },
      )
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
        return NextResponse.json(
          { error: `Failed to save recipients: ${recipientError.message}` },
          { status: 500 },
        )
      }
    }

    // ── Deduct credits (atomic, retried on contention) ────────────
    const deduction = await consumeCredits(businessId, 'sms', {
      userId: user.id,
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
      return NextResponse.json({ error: deduction.reason, ok: false }, { status: 402 })
    }

    // ── Dispatch to the gateway ───────────────────────────────────
    const numbers = valid.map((r) => r.recipientPhone)
    const result = await sendKintuSms(settings, numbers, cleanMessage)

    await logHttpEvent({
      userId: user.id,
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

      return NextResponse.json({
        success: true,
        broadcastId: broadcast.id,
        total: valid.length,
        sent: valid.length,
        failed: 0,
        creditsUsed: totalCost,
        remaining: deduction.newBalance,
      })
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

    return NextResponse.json(
      {
        error: `SMS gateway rejected the send: ${result.raw.slice(0, 200)}`,
        ok: false,
      },
      { status: 502 },
    )
  } catch (error) {
    console.error('Error in SMS send POST:', error)
    return NextResponse.json(
      { error: 'Failed to process SMS broadcast' },
      { status: 500 },
    )
  }
}

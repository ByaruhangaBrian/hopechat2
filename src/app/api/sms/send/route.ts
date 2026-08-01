import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dispatchSmsBroadcast } from '@/lib/sms/dispatch'
import {
  checkRateLimit,
  rateLimitResponse,
  RATE_LIMITS,
} from '@/lib/rate-limit'

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
 * Delegates to dispatchSmsBroadcast, which validates the request,
 * writes the broadcast + recipient rows, gates/deducts credits, and
 * dispatches to the gateway (refunding the charge if the gateway
 * rejects the send).
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

    // Verify the user belongs to this business.
    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.business_id !== businessId) {
      return NextResponse.json({ error: 'Business mismatch' }, { status: 403 })
    }

    const result = await dispatchSmsBroadcast({
      businessId,
      userId: user.id,
      name,
      message,
      audience: audience ?? null,
      recipients,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error, ok: false }, { status: result.status })
    }

    return NextResponse.json({
      success: true,
      broadcastId: result.broadcastId,
      total: result.total,
      sent: result.sent,
      failed: result.failed,
      creditsUsed: result.creditsUsed,
      remaining: result.newBalance,
    })
  } catch (error) {
    console.error('Error in SMS send POST:', error)
    return NextResponse.json(
      { error: 'Failed to process SMS broadcast' },
      { status: 500 },
    )
  }
}

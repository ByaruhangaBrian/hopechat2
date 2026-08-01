import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/automations/admin-client'
import { dispatchSmsBroadcast, SMS_MAX_RECIPIENTS } from '@/lib/sms/dispatch'
import {
  checkRateLimit,
  rateLimitResponse,
  RATE_LIMITS,
} from '@/lib/rate-limit'

/**
 * POST /api/sms/retry
 *
 * Body:
 *   {
 *     businessId: string,
 *     sourceBroadcastId: string   // a FAILED sms_broadcast
 *   }
 *
 * Re-sends the recipients that failed in the source broadcast (status
 * 'failed' or 'pending') as a brand-new broadcast named "<name> (retry)".
 * The original broadcast row is left untouched so it keeps its failure
 * record for tracking. Credits are only charged if the gateway accepts
 * the retry.
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

    const limit = checkRateLimit(`sms-retry:${user.id}`, RATE_LIMITS.broadcast)
    if (!limit.success) {
      return rateLimitResponse(limit)
    }

    const body = await request.json()
    const { businessId, sourceBroadcastId } = body as {
      businessId?: string
      sourceBroadcastId?: string
    }

    if (!businessId) {
      return NextResponse.json({ error: 'Missing businessId' }, { status: 400 })
    }
    if (!sourceBroadcastId) {
      return NextResponse.json({ error: 'Missing sourceBroadcastId' }, { status: 400 })
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

    const db = supabaseAdmin()

    // Only a failed broadcast is eligible for retry.
    const { data: source, error: sourceError } = await db
      .from('sms_broadcasts')
      .select('*')
      .eq('id', sourceBroadcastId)
      .eq('business_id', businessId)
      .maybeSingle()

    if (sourceError) {
      return NextResponse.json({ error: `Failed to load broadcast: ${sourceError.message}` }, { status: 500 })
    }
    if (!source) {
      return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 })
    }
    if (source.status !== 'failed') {
      return NextResponse.json(
        { error: 'Only failed broadcasts can be retried.' },
        { status: 400 },
      )
    }

    const { data: failedRows, error: recipientsError } = await db
      .from('sms_recipients')
      .select('phone, contact_id')
      .eq('sms_broadcast_id', sourceBroadcastId)
      .in('status', ['failed', 'pending'])
      .limit(SMS_MAX_RECIPIENTS)

    if (recipientsError) {
      return NextResponse.json({ error: `Failed to load recipients: ${recipientsError.message}` }, { status: 500 })
    }

    const recipients = (failedRows ?? []).map((r) => ({
      contactId: r.contact_id as string | null,
      phone: r.phone,
    }))

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'No failed recipients to retry.' },
        { status: 400 },
      )
    }

    const result = await dispatchSmsBroadcast({
      businessId,
      userId: user.id,
      name: `${source.name} (retry)`,
      message: source.message,
      audience: source.audience_filter ?? null,
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
    console.error('Error in SMS retry POST:', error)
    return NextResponse.json(
      { error: 'Failed to retry SMS broadcast' },
      { status: 500 },
    )
  }
}

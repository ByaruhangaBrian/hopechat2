import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/automations/admin-client'
import { verifyCalComWebhookSignature } from '@/lib/calcom/webhook-signature'
import { logHttpEvent } from '@/lib/logs/http-logs'

interface CalWebhookPayload {
  triggerEvent?: string
  action?: string
  payload?: Record<string, unknown>
  booking?: Record<string, unknown>
  organizer?: Record<string, unknown>
  bookingUid?: unknown
  id?: unknown
  [key: string]: unknown
}

type BookingStatus = 'booked' | 'rescheduled' | 'cancelled'

function mapStatus(body: CalWebhookPayload): BookingStatus {
  const trigger = (body.triggerEvent || body.action || '').toLowerCase()
  if (trigger.includes('cancel') || trigger.includes('reject')) return 'cancelled'
  if (trigger.includes('resched') || trigger.includes('update')) return 'rescheduled'
  return 'booked'
}

/** Cal.com nests the booking in `payload`; keep defensive fallbacks for shape drift. */
function bookingField(body: CalWebhookPayload, key: string): unknown {
  return body.payload?.[key] ?? body[key] ?? body.booking?.[key]
}

/**
 * Cal.com webhook receiver.
 *
 * Subscribed once to a single URL (`/api/calcom/webhook`) with the global
 * `calcom_global` secret. The business is resolved from the booking's
 * organizer username, which we stored as `config.username` on connect —
 * so one shared endpoint safely serves every connected business.
 *
 * Contract: verified events return 200 even if the business can't be
 * resolved (ack + log). Unverified requests are rejected outright.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-cal-signature-256')

  if (!(await verifyCalComWebhookSignature(rawBody, signature))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let body: CalWebhookPayload
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const uid = bookingField(body, 'uid') || bookingField(body, 'bookingUid')
  const trigger = body.triggerEvent || body.action || 'BOOKING_EVENT'

  void logHttpEvent({
    direction: 'incoming',
    service: 'calcom',
    endpoint: '/api/calcom/webhook',
    payload: { trigger, uid: typeof uid === 'string' ? uid : null },
    note: `calcom_webhook_received: ${trigger}`,
  })

  if (typeof uid !== 'string' || !uid) {
    console.warn('[calcom webhook] missing booking uid:', JSON.stringify(body).slice(0, 500))
    return NextResponse.json({ status: 'received' }, { status: 200 })
  }

  const organizer = (body.payload?.organizer || body.organizer || {}) as Record<string, unknown>
  const organizerUsername = typeof organizer.username === 'string' ? organizer.username : null

  if (!organizerUsername) {
    console.warn('[calcom webhook] no organizer username:', JSON.stringify(body).slice(0, 500))
    return NextResponse.json({ status: 'received' }, { status: 200 })
  }

  const businessId = await resolveBusinessByUsername(organizerUsername)
  if (!businessId) {
    console.warn(`[calcom webhook] no connected business for username "${organizerUsername}"`)
    return NextResponse.json({ status: 'received' }, { status: 200 })
  }

  // Cal.com webhook payload is shared-context `payload`; extract nullable fields defensively.
  const p = body.payload || {}
  const eventTypeId =
    asNumber(p.eventTypeId) ?? asNumber((p.eventType as Record<string, unknown> | undefined)?.id)
  const startTime = asIso(p.startTime)
  const endTime = asIso(p.endTime)
  const title =
    typeof p.title === 'string'
      ? p.title
      : typeof p.eventTitle === 'string'
        ? p.eventTitle
        : typeof p.type === 'string'
          ? p.type
          : 'Appointment'

  const attendee = Array.isArray(p.attendees) && p.attendees.length > 0 ? p.attendees[0] : null
  const attendeeName = typeof attendee?.name === 'string' ? attendee.name : null
  const attendeeEmail = typeof attendee?.email === 'string' ? attendee.email : null

  const status = mapStatus(body)

  const { error } = await supabaseAdmin()
    .from('cal_bookings')
    .upsert(
      {
        business_id: businessId,
        cal_uid: uid,
        cal_booking_id: typeof bookingField(body, 'id') === 'number' ? asNumber(bookingField(body, 'id')) : null,
        cal_event_type_id: eventTypeId,
        event_title: title,
        start_time: startTime,
        end_time: endTime,
        attendee_name: attendeeName,
        attendee_email: attendeeEmail,
        status,
        raw: body,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'business_id, cal_uid' },
    )

  if (error) {
    console.error(`[calcom webhook] upsert failed for uid ${uid}:`, error.message)
    void logHttpEvent({
      businessId,
      direction: 'incoming',
      service: 'calcom',
      endpoint: '/api/calcom/webhook',
      payload: { error: error.message },
      statusCode: 500,
      note: 'calcom_webhook_upsert_failed',
    })
    return NextResponse.json({ status: 'received' }, { status: 200 })
  }

  void logHttpEvent({
    businessId,
    direction: 'incoming',
    service: 'calcom',
    endpoint: '/api/calcom/webhook',
    payload: { uid, status },
    note: `calcom webhook upserted: ${status}`,
  })

  return NextResponse.json({ status: 'received' }, { status: 200 })
}

/** The username is stored plaintext in `config.username` at connect time. */
async function resolveBusinessByUsername(username: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin()
    .from('business_integrations')
    .select('business_id')
    .eq('type', 'calcom')
    .eq('config->>username', username)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[calcom webhook] business lookup failed:', error.message)
    return null
  }
  return data?.business_id ?? null
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' ? value : null
}

/** Cal.com sends ISO timestamps; keep null-safe for shape drift. */
function asIso(value: unknown): string | null {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null
}
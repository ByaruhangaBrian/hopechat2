import { NextResponse } from 'next/server'
import { resolveBusinessId } from '@/lib/business-context'
import {
  CalComNotConfiguredError,
  CalComApiError,
  createBooking,
  syncCalBookings,
  upsertCalBookings,
} from '@/lib/integrations/calcom'
import { getCalcomManager } from '@/app/api/integrations/calcom/helpers'

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }

/**
 * Cal.com bookings for the current business, newest first.
 *
 * GET            → rows from `cal_bookings` (webhook + sync mirrors).
 * GET ?sync=1    → pull recent bookings from Cal.com first, then return rows.
 * POST           → book an appointment on a customer's behalf via
 *                  POST /v2/bookings, then mirror it into `cal_bookings`.
 */
export async function GET(request: Request) {
  try {
    const { admin, effectiveBusinessId, error } = await resolveBusinessId()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const wantSync = searchParams.get('sync') === '1'
    const statusParam = searchParams.get('status')
    const limitParam = searchParams.get('limit')

    if (wantSync) {
      const guard = await getCalcomManager()
      if (guard.error) return guard.error
      try {
        await syncCalBookings(effectiveBusinessId)
      } catch (err) {
        console.error('[calcom] sync error:', err instanceof Error ? err.message : err)
        return NextResponse.json(
          { error: err instanceof Error ? err.message : 'Failed to sync bookings' },
          { status: 502 },
        )
      }
    }

    let query = admin.from('cal_bookings').select('*').eq('business_id', effectiveBusinessId)
    if (statusParam === 'booked' || statusParam === 'rescheduled' || statusParam === 'cancelled') {
      query = query.eq('status', statusParam)
    }

    const parsedLimit = Number(limitParam)
    const limit = Number.isInteger(parsedLimit) && parsedLimit > 0 && parsedLimit <= 100 ? parsedLimit : 25
    query = query.order('start_time', { ascending: false }).limit(limit)

    const { data, error: fetchErr } = await query
    if (fetchErr) {
      console.error('[calcom] bookings fetch error:', fetchErr.message)
      return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    }

    return NextResponse.json({ bookings: data }, { headers: NO_CACHE })
  } catch (err) {
    console.error('[calcom] bookings GET failed:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

interface CreateBookingBody {
  eventTypeId?: unknown
  start?: unknown
  attendee?: { name?: unknown; email?: unknown; timeZone?: unknown; language?: unknown }
}

export async function POST(request: Request) {
  try {
    const guard = await getCalcomManager()
    if (guard.error) return guard.error

    const { effectiveBusinessId, error } = await resolveBusinessId()
    if (error) return error

    const body = (await request.json().catch(() => null)) as CreateBookingBody | null
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

    const eventTypeId = typeof body.eventTypeId === 'number' ? body.eventTypeId : null
    const start = typeof body.start === 'string' ? body.start : null
    if (!eventTypeId) return NextResponse.json({ error: 'Select an event type to book.' }, { status: 400 })
    if (!start || Number.isNaN(Date.parse(start))) {
      return NextResponse.json({ error: 'Pick a valid start time.' }, { status: 400 })
    }

    const attendeeName = typeof body.attendee?.name === 'string' ? body.attendee.name.trim() : ''
    const attendeeEmail = typeof body.attendee?.email === 'string' ? body.attendee.email.trim() : ''
    const attendeeTimeZone = typeof body.attendee?.timeZone === 'string' ? body.attendee.timeZone.trim() : ''
    const attendeeLanguage = typeof body.attendee?.language === 'string' && body.attendee.language ? body.attendee.language : undefined

    if (!attendeeName) return NextResponse.json({ error: 'Attendee name is required.' }, { status: 400 })
    if (!attendeeEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attendeeEmail)) {
      return NextResponse.json({ error: 'A valid attendee email is required.' }, { status: 400 })
    }
    if (!attendeeTimeZone) return NextResponse.json({ error: 'Attendee time zone is required.' }, { status: 400 })

    const booking = await createBooking(effectiveBusinessId, {
      eventTypeId,
      start,
      attendee: { name: attendeeName, email: attendeeEmail, timeZone: attendeeTimeZone, language: attendeeLanguage },
    })

    try {
      await upsertCalBookings(effectiveBusinessId, [booking])
    } catch (err) {
      console.error('[calcom] mirror created booking failed:', err instanceof Error ? err.message : err)
    }

    return NextResponse.json({ booking }, { headers: NO_CACHE })
  } catch (err) {
    if (err instanceof CalComApiError) {
      const status = err.status >= 400 && err.status < 600 ? err.status : 400
      return NextResponse.json(
        { error: `Cal.com rejected the booking (${err.status}): ${err.message.replace(/^Cal\.com API error \(\d+\): /, '')}` },
        { status },
      )
    }
    if (err instanceof CalComNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error('[calcom] bookings POST failed:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
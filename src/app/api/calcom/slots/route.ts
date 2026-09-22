import { NextResponse } from 'next/server'
import { resolveBusinessId } from '@/lib/business-context'
import { CalComNotConfiguredError, CalComApiError, getSlots } from '@/lib/integrations/calcom'
import { getCalcomManager } from '@/app/api/integrations/calcom/helpers'

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }

/** Available start times (UTC ISO) for an event type within a UTC range. */
export async function GET(request: Request) {
  try {
    const guard = await getCalcomManager()
    if (guard.error) return guard.error

    const { effectiveBusinessId, error } = await resolveBusinessId()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const eventTypeIdParam = searchParams.get('eventTypeId')
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    const timeZone = searchParams.get('timeZone') || undefined

    const eventTypeId = Number(eventTypeIdParam)
    if (!Number.isInteger(eventTypeId) || eventTypeId <= 0) {
      return NextResponse.json({ error: 'A valid eventTypeId is required.' }, { status: 400 })
    }
    if (!start || Number.isNaN(Date.parse(start)) || !end || Number.isNaN(Date.parse(end))) {
      return NextResponse.json({ error: 'Provide valid UTC start and end dates.' }, { status: 400 })
    }

    const slots = await getSlots(effectiveBusinessId, { eventTypeId, start, end, timeZone })
    return NextResponse.json({ slots }, { headers: NO_CACHE })
  } catch (err) {
    if (err instanceof CalComApiError) {
      const status = err.status >= 400 && err.status < 600 ? err.status : 400
      return NextResponse.json(
        { error: `Cal.com could not load slots (${err.status}): ${err.message.replace(/^Cal\.com API error \(\d+\): /, '')}` },
        { status },
      )
    }
    if (err instanceof CalComNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error('[calcom] slots GET failed:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
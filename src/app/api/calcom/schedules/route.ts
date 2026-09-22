import { NextResponse } from 'next/server'
import { resolveBusinessId } from '@/lib/business-context'
import {
  CalComApiError,
  CalComNotConfiguredError,
  getDefaultSchedule,
  setDefaultWeekAvailability,
  type CalWeekday,
} from '@/lib/integrations/calcom'
import { getCalcomManager } from '@/app/api/integrations/calcom/helpers'

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }

const WEEKDAY_NAMES: CalWeekday[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

interface WeekdayPayload {
  day?: unknown
  enabled?: unknown
  start?: unknown
  end?: unknown
}

export async function GET() {
  try {
    const guard = await getCalcomManager()
    if (guard.error) return guard.error

    const { effectiveBusinessId, error } = await resolveBusinessId()
    if (error) return error

    const schedule = await getDefaultSchedule(effectiveBusinessId, { fallbackEmpty: true })
    return NextResponse.json({ schedule }, { headers: NO_CACHE })
  } catch (err) {
    if (err instanceof CalComNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    if (err instanceof CalComApiError) {
      const status = err.status >= 400 && err.status < 600 ? err.status : 502
      return NextResponse.json(
        { error: `Cal.com rejected the request: ${err.message.replace(/^Cal\.com API error \(\d+\): /, '')}` },
        { status },
      )
    }
    console.error('[calcom] schedules GET failed:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const guard = await getCalcomManager()
    if (guard.error) return guard.error

    const { effectiveBusinessId, error } = await resolveBusinessId()
    if (error) return error

    const body = (await request.json().catch(() => null)) as {
      days?: WeekdayPayload[]
      timeZone?: unknown
    } | null
    if (!body || !Array.isArray(body.days)) {
      return NextResponse.json({ error: 'Provide a days array in the request body.' }, { status: 400 })
    }
    if (body.days.length !== 7) {
      return NextResponse.json({ error: 'Provide exactly 7 day entries (Monday → Sunday).' }, { status: 400 })
    }

    const timeZone = typeof body.timeZone === 'string' && body.timeZone.trim() ? body.timeZone.trim() : undefined
    if (timeZone && timeZone.length > 64) {
      return NextResponse.json({ error: 'Invalid time zone.' }, { status: 400 })
    }

    const windows: Array<{ day: CalWeekday; startTime: string; endTime: string } | null> = []

    for (let i = 0; i < 7; i++) {
      const entry = body.days[i] as WeekdayPayload
      const day = WEEKDAY_NAMES[i]

      if (entry.enabled !== true) {
        windows.push(null)
        continue
      }

      const start = typeof entry.start === 'string' ? entry.start : ''
      const end = typeof entry.end === 'string' ? entry.end : ''
      if (!TIME_RE.test(start) || !TIME_RE.test(end)) {
        return NextResponse.json(
          { error: `${day}: start and end times must use HH:MM (24h) format.` },
          { status: 400 },
        )
      }
      if (start >= end) {
        return NextResponse.json(
          { error: `${day}: the end time must be after the start time.` },
          { status: 400 },
        )
      }
      windows.push({ day, startTime: start, endTime: end })
    }

    const schedule = await setDefaultWeekAvailability(effectiveBusinessId, windows, timeZone)

    return NextResponse.json({ schedule }, { headers: NO_CACHE })
  } catch (err) {
    if (err instanceof CalComNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    if (err instanceof CalComApiError) {
      const status = err.status >= 400 && err.status < 600 ? err.status : 502
      return NextResponse.json(
        { error: `Cal.com rejected the update: ${err.message.replace(/^Cal\.com API error \(\d+\): /, '')}` },
        { status },
      )
    }
    console.error('[calcom] schedules PATCH failed:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
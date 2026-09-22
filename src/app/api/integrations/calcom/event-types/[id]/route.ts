import { NextResponse } from 'next/server'
import { resolveBusinessId } from '@/lib/business-context'
import { CalComApiError, updateEventType } from '@/lib/integrations/calcom'
import { getCalcomManager, NO_CACHE } from '../../helpers'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await getCalcomManager()
    if (guard.error) return guard.error

    const { effectiveBusinessId, error } = await resolveBusinessId()
    if (error) return error

    const { id } = await params
    const eventTypeId = Number(id)
    if (!Number.isInteger(eventTypeId)) {
      return NextResponse.json({ error: 'Invalid event type id' }, { status: 400 })
    }

    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

    const patch: Record<string, unknown> = {}
    if (typeof body.disabled === 'boolean') patch.hidden = body.disabled
    if (typeof body.lengthInMinutes === 'number') patch.lengthInMinutes = body.lengthInMinutes

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { error: 'Provide `disabled` (or `lengthInMinutes`) to update the event type' },
        { status: 400 },
      )
    }

    try {
      const eventType = await updateEventType(effectiveBusinessId, eventTypeId, patch)
      return NextResponse.json({ success: true, event_type: eventType }, { headers: NO_CACHE })
    } catch (err) {
      if (err instanceof CalComApiError) {
        return NextResponse.json(
          {
            error: `Cal.com rejected the update (${err.status}): ${err.message.replace(/^Cal\.com API error \(\d+\): /, '')}`,
          },
          { status: err.status >= 500 ? 502 : 400 },
        )
      }
      throw err
    }
  } catch (err) {
    console.error('[calcom] PATCH event-type failed:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
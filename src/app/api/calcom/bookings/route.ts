import { NextResponse } from 'next/server'
import { resolveBusinessId } from '@/lib/business-context'

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }

/**
 * Recent Cal.com bookings for the current business, newest first.
 * Webhook-upserted rows land here via the `cal_uid` natural key.
 */
export async function GET(request: Request) {
  try {
    const { admin, effectiveBusinessId, error } = await resolveBusinessId()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get('status')
    const limitParam = searchParams.get('limit')

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
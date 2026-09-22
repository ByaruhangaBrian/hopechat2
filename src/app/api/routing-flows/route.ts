import { NextResponse } from 'next/server'
import { resolveBusinessId } from '@/lib/business-context'

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }

export async function GET() {
  try {
    const { admin, effectiveBusinessId, error } = await resolveBusinessId()
    if (error) return error

    const { data, error: dbErr } = await admin
      .from('routing_flows')
      .select('*')
      .eq('business_id', effectiveBusinessId)
      .order('created_at', { ascending: false })

    if (dbErr) {
      console.error('[routing-flows] GET error:', dbErr)
      return NextResponse.json({ error: dbErr.message }, { status: 500 })
    }

    // Count steps with a separate query so we don't depend on the
    // PostgREST relationship cache (avoids "table not in schema cache" errors).
    const counts: Record<string, number> = {}
    if (data && data.length > 0) {
      try {
        const { data: steps } = await admin
          .from('routing_steps')
          .select('flow_id')
          .in('flow_id', data.map((f: any) => f.id))
        for (const s of steps || []) {
          counts[s.flow_id] = (counts[s.flow_id] || 0) + 1
        }
      } catch (countErr) {
        console.error('[routing-flows] step count error (ignored):', countErr)
      }
    }

    const flows = (data || []).map((f: any) => ({
      ...f,
      step_count: counts[f.id] || 0,
    }))

    return NextResponse.json({ flows }, { headers: NO_CACHE })
  } catch (err: any) {
    console.error('[routing-flows] GET route error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { admin, effectiveBusinessId, error } = await resolveBusinessId()
    if (error) return error

    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

    const name = String(body.name || '').trim()
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const { data: created, error: insertErr } = await admin
      .from('routing_flows')
      .insert({
        business_id: effectiveBusinessId,
        name,
        description: body.description ? String(body.description).trim() : null,
        entry_step_id: null,
        is_active: body.is_active === undefined ? true : Boolean(body.is_active),
      })
      .select()
      .single()

    if (insertErr) {
      console.error('[routing-flows] POST error:', insertErr)
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    return NextResponse.json({ flow: { ...created, step_count: 0, steps: [] } }, { status: 201 })
  } catch (err: any) {
    console.error('[routing-flows] POST route error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
import { NextResponse } from 'next/server'
import { resolveBusinessId } from '@/lib/business-context'

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { admin, effectiveBusinessId, error } = await resolveBusinessId()
    if (error) return error

    const { data: flow, error: dbErr } = await admin
      .from('routing_flows')
      .select('*')
      .eq('id', id)
      .eq('business_id', effectiveBusinessId)
      .maybeSingle()

    if (dbErr || !flow) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Steps fetched separately (no embedded relationship, no schema-cache dependency).
    const { data: steps, error: stepsErr } = await admin
      .from('routing_steps')
      .select('*')
      .eq('flow_id', id)
      .order('position', { ascending: true })
    if (stepsErr) {
      console.error('[routing-flows/[id]] steps error:', stepsErr)
      return NextResponse.json({ error: stepsErr.message }, { status: 500 })
    }

    return NextResponse.json({ flow: { ...flow, steps: steps || [] } }, { headers: NO_CACHE })
  } catch (err: any) {
    console.error('[routing-flows/[id]] GET error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { admin, effectiveBusinessId, error } = await resolveBusinessId()
    if (error) return error

    const { data: existing } = await admin
      .from('routing_flows')
      .select('id')
      .eq('id', id)
      .eq('business_id', effectiveBusinessId)
      .maybeSingle()
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

    const updates: Record<string, any> = { updated_at: new Date().toISOString() }
    if ('name' in body) updates.name = String(body.name).trim()
    if ('description' in body) updates.description = body.description ? String(body.description).trim() : null
    if ('is_active' in body) updates.is_active = Boolean(body.is_active)
    // entry_step_id is set via /steps sync to guarantee the id exists.

    const { data: updated, error: updateErr } = await admin
      .from('routing_flows')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateErr) {
      console.error('[routing-flows/[id]] PATCH error:', updateErr)
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ flow: updated })
  } catch (err: any) {
    console.error('[routing-flows/[id]] PATCH error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { admin, effectiveBusinessId, error } = await resolveBusinessId()
    if (error) return error

    const { data: existing } = await admin
      .from('routing_flows')
      .select('id')
      .eq('id', id)
      .eq('business_id', effectiveBusinessId)
      .maybeSingle()
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { error: delErr } = await admin.from('routing_flows').delete().eq('id', id)
    if (delErr) {
      console.error('[routing-flows/[id]] DELETE error:', delErr)
      return NextResponse.json({ error: delErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { headers: NO_CACHE })
  } catch (err: any) {
    console.error('[routing-flows/[id]] DELETE error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
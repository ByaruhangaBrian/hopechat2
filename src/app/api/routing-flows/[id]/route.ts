import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/automations/admin-client'

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }

async function resolveBusinessId() {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const admin = supabaseAdmin()
  let { data: profile } = await supabase
    .from('profiles').select('business_id').eq('user_id', user.id).maybeSingle()

  if (!profile?.business_id) {
    const { data: adminProfile } = await admin
      .from('profiles').select('business_id').eq('user_id', user.id).maybeSingle()
    profile = adminProfile
  }

  const cookieStore = await cookies()
  const impersonatedId = cookieStore.get('impersonated_business_id')?.value
  const effectiveBusinessId = impersonatedId || profile?.business_id
  if (!effectiveBusinessId) return { error: NextResponse.json({ error: 'Business not found' }, { status: 400 }) }

  return { admin, effectiveBusinessId }
}

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
      .select('*, routing_steps(*)')
      .eq('id', id)
      .eq('business_id', effectiveBusinessId)
      .single()

    if (dbErr || !flow) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const steps = ((flow.routing_steps ?? []) as any[])
      .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))

    return NextResponse.json({ flow: { ...flow, steps, routing_steps: undefined } }, { headers: NO_CACHE })
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
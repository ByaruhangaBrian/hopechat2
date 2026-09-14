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

export async function GET() {
  try {
    const { admin, effectiveBusinessId, error } = await resolveBusinessId()
    if (error) return error

    const { data, error: dbErr } = await admin
      .from('routing_flows')
      .select('*, routing_steps(count)')
      .eq('business_id', effectiveBusinessId)
      .order('created_at', { ascending: false })

    if (dbErr) {
      console.error('[routing-flows] GET error:', dbErr)
      return NextResponse.json({ error: dbErr.message }, { status: 500 })
    }

    const flows = (data || []).map((f: any) => ({
      ...f,
      step_count: f.routing_steps?.[0]?.count ?? 0,
      routing_steps: undefined,
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
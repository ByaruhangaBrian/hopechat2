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

    const { data: test, error: dbErr } = await admin
      .from('tests')
      .select('*, test_questions(*)')
      .eq('id', id)
      .eq('business_id', effectiveBusinessId)
      .single()

    if (dbErr || !test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 })
    }

    const questions = (test.test_questions || []).sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
    return NextResponse.json({ test: { ...test, questions, test_questions: undefined } }, { headers: NO_CACHE })
  } catch (err: any) {
    console.error('[tests/[id]] GET error:', err)
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

    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

    const { data: existing, error: findErr } = await admin
      .from('tests')
      .select('id')
      .eq('id', id)
      .eq('business_id', effectiveBusinessId)
      .maybeSingle()
    if (findErr || !existing) return NextResponse.json({ error: 'Test not found' }, { status: 404 })

    const updates: Record<string, any> = { updated_at: new Date().toISOString() }

    if ('title' in body) updates.title = String(body.title).trim()
    if ('description' in body) updates.description = body.description ? String(body.description).trim() : null
    if ('start_message' in body) updates.start_message = body.start_message ? String(body.start_message).trim() : null
    if ('intro_fields' in body) updates.intro_fields = Array.isArray(body.intro_fields) ? body.intro_fields : []

    let newMode = body.mode ?? null
    let newDuration = body.duration_minutes ?? null
    if ('mode' in body) {
      if (body.mode !== 'practice' && body.mode !== 'test') {
        return NextResponse.json({ error: 'mode must be "practice" or "test"' }, { status: 400 })
      }
      updates.mode = body.mode
      newMode = body.mode
      if (body.mode === 'practice') updates.duration_minutes = null
    }
    if ('duration_minutes' in body) {
      newDuration = body.duration_minutes
      updates.duration_minutes = body.duration_minutes == null ? null : Number(body.duration_minutes)
    }
    if (newMode === 'test' && (newDuration == null || newDuration <= 0)) {
      return NextResponse.json({ error: 'duration_minutes is required and must be > 0 for timed tests' }, { status: 400 })
    }

    if ('pass_mark' in body) {
      const v = Number(body.pass_mark)
      if (typeof v !== 'number' || v < 0 || v > 100) {
        return NextResponse.json({ error: 'pass_mark must be between 0 and 100' }, { status: 400 })
      }
      updates.pass_mark = v
    }

    if ('shuffle' in body) updates.shuffle = Boolean(body.shuffle)
    if ('is_active' in body) updates.is_active = Boolean(body.is_active)

    const { data: updated, error: updateErr } = await admin
      .from('tests')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateErr) {
      console.error('[tests/[id]] PATCH error:', updateErr)
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ test: updated })
  } catch (err: any) {
    console.error('[tests/[id]] PATCH error:', err)
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

    const { data: existing, error: findErr } = await admin
      .from('tests')
      .select('id')
      .eq('id', id)
      .eq('business_id', effectiveBusinessId)
      .maybeSingle()
    if (findErr || !existing) return NextResponse.json({ error: 'Test not found' }, { status: 404 })

    const { error: delErr } = await admin.from('tests').delete().eq('id', id)

    if (delErr) {
      console.error('[tests/[id]] DELETE error:', delErr)
      return NextResponse.json({ error: delErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { headers: NO_CACHE })
  } catch (err: any) {
    console.error('[tests/[id]] DELETE error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
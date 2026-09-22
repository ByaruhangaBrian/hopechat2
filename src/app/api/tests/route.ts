import { NextResponse } from 'next/server'
import { resolveBusinessId } from '@/lib/business-context'

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }

export async function GET() {
  try {
    const { admin, effectiveBusinessId, error } = await resolveBusinessId()
    if (error) return error

    const { data, error: dbErr } = await admin
      .from('tests')
      .select('*, test_questions(count)')
      .eq('business_id', effectiveBusinessId)
      .order('created_at', { ascending: false })

    if (dbErr) {
      console.error('[tests] GET error:', dbErr)
      return NextResponse.json({ error: dbErr.message }, { status: 500 })
    }

    const tests = (data || []).map((t: any) => ({
      ...t,
      question_count: t.test_questions?.[0]?.count ?? 0,
      test_questions: undefined,
    }))

    return NextResponse.json({ tests }, { headers: NO_CACHE })
  } catch (err: any) {
    console.error('[tests] GET route error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { admin, effectiveBusinessId, error } = await resolveBusinessId()
    if (error) return error

    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

    const {
      title,
      description,
      start_message,
      intro_fields = [],
      mode = 'practice',
      duration_minutes = null,
      pass_mark = 0,
      shuffle = false,
      is_active = true,
      is_entry = false,
      route_rules = null,
    } = body

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (mode !== 'practice' && mode !== 'test') {
      return NextResponse.json({ error: 'mode must be "practice" or "test"' }, { status: 400 })
    }

    if (mode === 'test' && (duration_minutes == null || duration_minutes <= 0)) {
      return NextResponse.json({ error: 'duration_minutes is required and must be > 0 for timed tests' }, { status: 400 })
    }

    if (typeof pass_mark !== 'number' || pass_mark < 0 || pass_mark > 100) {
      return NextResponse.json({ error: 'pass_mark must be between 0 and 100' }, { status: 400 })
    }

    const { data: created, error: insertErr } = await admin
      .from('tests')
      .insert({
        business_id: effectiveBusinessId,
        title: title.trim(),
        description: description ? String(description).trim() : null,
        start_message: start_message ? String(start_message).trim() : null,
        intro_fields: Array.isArray(intro_fields) ? intro_fields : [],
        mode,
        duration_minutes: mode === 'test' ? Number(duration_minutes) : null,
        pass_mark: Number(pass_mark),
        shuffle: Boolean(shuffle),
        is_active: Boolean(is_active),
        is_entry: Boolean(is_entry),
        route_rules:
          route_rules && typeof route_rules === 'object' && Object.keys(route_rules).length > 0
            ? route_rules
            : null,
      })
      .select()
      .single()

    if (insertErr) {
      console.error('[tests] POST error:', insertErr)
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    return NextResponse.json({ test: { ...created, question_count: 0, questions: [] } }, { status: 201 })
  } catch (err: any) {
    console.error('[tests] POST route error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
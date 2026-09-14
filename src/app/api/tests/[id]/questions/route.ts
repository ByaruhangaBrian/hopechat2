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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: testId } = await params
    const { admin, effectiveBusinessId, error } = await resolveBusinessId()
    if (error) return error

    const { data: test } = await admin
      .from('tests')
      .select('id')
      .eq('id', testId)
      .eq('business_id', effectiveBusinessId)
      .maybeSingle()
    if (!test) return NextResponse.json({ error: 'Test not found' }, { status: 404 })

    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

    // Determine next position
    const { data: maxRow } = await admin
      .from('test_questions')
      .select('position')
      .eq('test_id', testId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle()
    let nextPos = (maxRow?.position ?? -1) + 1

    const incoming = Array.isArray(body.questions) ? body.questions : [body]
    const rows: any[] = []

    for (const q of incoming) {
      const questionText = String(q.question || '').trim()
      if (!questionText) continue // skip empty
      const options = Array.isArray(q.options) ? q.options : []
      rows.push({
        test_id: testId,
        question: questionText,
        options: options.map((o: any, i: number) => ({
          key: String(o.key || String.fromCharCode(65 + i)).trim(),
          label: String(o.label || '').trim(),
        })),
        correct_answer: q.correct_answer ? String(q.correct_answer).trim() : null,
        points: typeof q.points === 'number' ? q.points : 1,
        position: nextPos++,
      })
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No valid questions provided' }, { status: 400 })
    }

    const { data: inserted, error: insertErr } = await admin
      .from('test_questions')
      .insert(rows)
      .select()

    if (insertErr) {
      console.error('[questions] POST error:', insertErr)
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    return NextResponse.json(
      { questions: inserted, count: inserted?.length ?? 0 },
      { status: 201, headers: NO_CACHE }
    )
  } catch (err: any) {
    console.error('[questions] POST route error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
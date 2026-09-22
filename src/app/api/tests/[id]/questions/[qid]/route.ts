import { NextResponse } from 'next/server'
import { resolveBusinessId } from '@/lib/business-context'

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; qid: string }> }
) {
  try {
    const { id: testId, qid } = await params
    const { admin, effectiveBusinessId, error } = await resolveBusinessId()
    if (error) return error

    const { data: test } = await admin
      .from('tests')
      .select('id')
      .eq('id', testId)
      .eq('business_id', effectiveBusinessId)
      .maybeSingle()
    if (!test) return NextResponse.json({ error: 'Test not found' }, { status: 404 })

    const { data: existing, error: findErr } = await admin
      .from('test_questions')
      .select('id')
      .eq('id', qid)
      .eq('test_id', testId)
      .maybeSingle()
    if (findErr || !existing) return NextResponse.json({ error: 'Question not found' }, { status: 404 })

    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

    const updates: Record<string, any> = {}
    if ('question' in body) updates.question = String(body.question).trim()
    if ('options' in body) {
      updates.options = (Array.isArray(body.options) ? body.options : []).map((o: any, i: number) => ({
        key: String(o.key || String.fromCharCode(65 + i)).trim(),
        label: String(o.label || '').trim(),
      }))
    }
    if ('correct_answer' in body) updates.correct_answer = body.correct_answer ? String(body.correct_answer).trim() : null
    if ('points' in body && typeof body.points === 'number') updates.points = body.points
    if ('position' in body && typeof body.position === 'number') updates.position = body.position

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data: updated, error: updateErr } = await admin
      .from('test_questions')
      .update(updates)
      .eq('id', qid)
      .eq('test_id', testId)
      .select()
      .single()

    if (updateErr) {
      console.error('[questions/[qid]] PATCH error:', updateErr)
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ question: updated }, { headers: NO_CACHE })
  } catch (err: any) {
    console.error('[questions/[qid]] PATCH error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; qid: string }> }
) {
  try {
    const { id: testId, qid } = await params
    const { admin, effectiveBusinessId, error } = await resolveBusinessId()
    if (error) return error

    const { data: test } = await admin
      .from('tests')
      .select('id')
      .eq('id', testId)
      .eq('business_id', effectiveBusinessId)
      .maybeSingle()
    if (!test) return NextResponse.json({ error: 'Test not found' }, { status: 404 })

    const { data: existing, error: findErr } = await admin
      .from('test_questions')
      .select('id')
      .eq('id', qid)
      .eq('test_id', testId)
      .maybeSingle()
    if (findErr || !existing) return NextResponse.json({ error: 'Question not found' }, { status: 404 })

    const { error: delErr } = await admin
      .from('test_questions')
      .delete()
      .eq('id', qid)
      .eq('test_id', testId)
    if (delErr) {
      console.error('[questions/[qid]] DELETE error:', delErr)
      return NextResponse.json({ error: delErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { headers: NO_CACHE })
  } catch (err: any) {
    console.error('[questions/[qid]] DELETE error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
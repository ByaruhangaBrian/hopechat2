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

export async function GET(request: Request) {
  try {
    const { admin, effectiveBusinessId, error } = await resolveBusinessId()
    if (error) return error

    const url = new URL(request.url)
    const testId = url.searchParams.get('test_id') || undefined
    const routingKey = url.searchParams.get('routing_key') || undefined
    const routingValue = url.searchParams.get('routing_value') || undefined
    const rawLimit = Number(url.searchParams.get('limit') || 50)
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(1, Math.round(rawLimit)), 200) : 50

    let query = admin
      .from('test_attempts')
      .select('*, tests(title), contacts(name, phone)')
      .eq('business_id', effectiveBusinessId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (testId) query = query.eq('test_id', testId)
    if (routingKey && routingValue) {
      query = query.contains('routing_answers', { [routingKey]: String(routingValue) })
    }

    const { data: attempts, error: attErr } = await query
    if (attErr) {
      console.error('[results] attempts error:', attErr)
      return NextResponse.json({ error: attErr.message }, { status: 500 })
    }

    const rows = (attempts || []) as any[]

    const attemptIds = rows.map((a) => a.id)
    let questionRows: any[] = []
    if (attemptIds.length > 0) {
      const { data, error: qErr } = await admin
        .from('test_question_results')
        .select('*')
        .in('attempt_id', attemptIds)
      if (qErr) {
        console.error('[results] question results error:', qErr)
      } else {
        questionRows = (data || []) as any[]
      }
    }

    // --- Per-test aggregates ---
    const testAgg = new Map<string, {
      id: string; title: string; count: number; sumPct: number; sumDuration: number; durationCount: number;
    }>()
    for (const a of rows) {
      const cur = testAgg.get(a.test_id) || {
        id: a.test_id, title: a.tests?.title || 'Untitled', count: 0, sumPct: 0, sumDuration: 0, durationCount: 0,
      }
      cur.count++
      cur.sumPct += a.percentage ?? 0
      if (a.duration_ms) { cur.sumDuration += a.duration_ms; cur.durationCount++ }
      testAgg.set(a.test_id, cur)
    }
    const tests = [...testAgg.values()].map((t) => ({
      id: t.id,
      title: t.title,
      attemptCount: t.count,
      avgScore: t.count ? t.sumPct / 100 : 0,
      avgDuration: t.durationCount ? Math.round(t.sumDuration / t.durationCount) : 0,
    }))

    // --- Per-question difficulty (grouped by question text, with per-test breakdown) ---
    type QAgg = { questionId: string | null; text: string; total: number; correct: number; testMap: Map<string, { testId: string; testTitle: string; answered: number; correct: number }> }
    const qMap = new Map<string, QAgg>()
    for (const r of questionRows) {
      if (!r.question_text) continue
      const key = r.question_id || `$${r.question_text}`
      let agg = qMap.get(key)
      if (!agg) {
        agg = { questionId: r.question_id ?? null, text: r.question_text, total: 0, correct: 0, testMap: new Map() }
        qMap.set(key, agg)
      }
      agg.total++
      if (r.correct) agg.correct++
      const tKey = r.test_id
      const tAgg = agg.testMap.get(tKey) || { testId: r.test_id, testTitle: 'Untitled', answered: 0, correct: 0 }
      tAgg.answered++
      if (r.correct) tAgg.correct++
      agg.testMap.set(tKey, tAgg)
    }
    // Resolve test titles
    for (const agg of qMap.values()) {
      for (const [tKey, tAgg] of agg.testMap) {
        const testMeta = testAgg.get(tKey)
        if (testMeta) tAgg.testTitle = testMeta.title
      }
    }
    const questions = [...qMap.values()]
      .map((q) => ({
        questionId: q.questionId || q.text,
        text: q.text,
        totalAnswered: q.total,
        totalCorrect: q.correct,
        accuracy: q.total ? q.correct / q.total : 0,
        stats: [...q.testMap.values()],
      }))
      .sort((a, b) => a.accuracy - b.accuracy)

    // --- Summary ---
    const totalCount = rows.length
    const summary = {
      totalAttempts: totalCount,
      avgScore: totalCount ? rows.reduce((s, a) => s + (a.percentage ?? 0), 0) / totalCount / 100 : null,
    }

    // --- Distinct routing keys ---
    const routingKeys: string[] = []
    const seen = new Set<string>()
    for (const a of rows) {
      for (const k of Object.keys(a.routing_answers || {})) {
        if (!seen.has(k)) { seen.add(k); routingKeys.push(k) }
      }
    }

    return NextResponse.json({
      tests,
      questions,
      summary,
      routingKeys: routingKeys.slice(0, 20),
      attempts: rows.map((a) => ({
        id: a.id,
        testId: a.test_id,
        testTitle: a.tests?.title || 'Untitled',
        contactId: a.contact_id,
        contactName: a.contacts?.name || null,
        score: a.score ?? 0,
        totalQuestions: a.total ?? 0,
        startedAt: a.started_at || null,
        completedAt: a.finished_at || null,
        durationMs: a.duration_ms ?? null,
        routingAnswers: a.routing_answers || {},
      })),
    }, { headers: NO_CACHE })
  } catch (err: any) {
    console.error('[results] GET route error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

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
      test_id: string; title: string; count: number; sumPct: number; passCount: number; sumCorrect: number; sumTotal: number;
    }>()
    for (const a of rows) {
      const cur = testAgg.get(a.test_id) || {
        test_id: a.test_id, title: a.tests?.title || 'Untitled', count: 0, sumPct: 0, passCount: 0, sumCorrect: 0, sumTotal: 0,
      }
      cur.count++
      cur.sumPct += a.percentage
      if (a.passed === true) cur.passCount++
      cur.sumCorrect += a.correct_count
      cur.sumTotal += a.total
      testAgg.set(a.test_id, cur)
    }
    const testStats = [...testAgg.values()].map((t) => ({
      test_id: t.test_id,
      title: t.title,
      attempts: t.count,
      avg_percentage: t.count ? Math.round(t.sumPct / t.count) : 0,
      pass_rate: t.count ? Math.round((t.passCount / t.count) * 100) : 0,
      avg_correct: t.count ? t.sumCorrect / t.count : 0,
      avg_total: t.count ? Math.round(t.sumTotal / t.count) : 0,
    }))

    // --- Per-question difficulty ---
    const qAgg = new Map<string, {
      question_id: string | null; test_id: string; question_text: string; count: number; correctCount: number;
    }>()
    for (const r of questionRows) {
      if (!r.question_text) continue
      const key = r.question_id || `$${r.question_text}`
      const cur = qAgg.get(key) || {
        question_id: r.question_id ?? null, test_id: r.test_id, question_text: r.question_text, count: 0, correctCount: 0,
      }
      cur.count++
      if (r.correct) cur.correctCount++
      qAgg.set(key, cur)
    }
    const questionStats = [...qAgg.values()]
      .map((q) => ({
        question_id: q.question_id,
        test_id: q.test_id,
        question_text: q.question_text,
        attempts: q.count,
        correct_count: q.correctCount,
        accuracy: q.count ? Math.round((q.correctCount / q.count) * 100) : 0,
      }))
      .sort((a, b) => a.accuracy - b.accuracy)

    // --- Summary ---
    const totalCount = rows.length
    const summary = {
      attempts: totalCount,
      avg_percentage: totalCount ? Math.round(rows.reduce((s, a) => s + a.percentage, 0) / totalCount) : 0,
      pass_rate: totalCount ? Math.round((rows.filter((a) => a.passed === true).length / totalCount) * 100) : 0,
      avg_correct: totalCount
        ? Number((rows.reduce((s, a) => s + a.correct_count, 0) / totalCount).toFixed(2))
        : 0,
    }

    // --- Distinct routing keys present in the results (for filters) ---
    const routingKeys: string[] = []
    const seen = new Set<string>()
    for (const a of rows) {
      for (const k of Object.keys(a.routing_answers || {})) {
        if (!seen.has(k)) {
          seen.add(k)
          routingKeys.push(k)
        }
      }
    }

    return NextResponse.json({
      attempts: rows.map((a) => ({
        id: a.id,
        test_id: a.test_id,
        test_title: a.tests?.title || 'Untitled',
        contact_id: a.contact_id,
        contact_name: a.contacts?.name || null,
        contact_phone: a.contacts?.phone || null,
        mode: a.mode,
        routing_answers: a.routing_answers || {},
        score: a.score,
        total: a.total,
        percentage: a.percentage,
        correct_count: a.correct_count,
        passed: a.passed,
        timed_out: a.timed_out,
        started_at: a.started_at,
        finished_at: a.finished_at,
      })),
      testStats,
      questionStats,
      summary,
      routingKeys: routingKeys.slice(0, 20),
    }, { headers: NO_CACHE })
  } catch (err: any) {
    console.error('[results] GET route error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
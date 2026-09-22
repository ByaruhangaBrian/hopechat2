import { NextResponse } from 'next/server'
import { resolveBusinessId } from '@/lib/business-context'

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }

/** Return the flow row (used for responding with refreshed data). */
async function loadFlowForResponse(admin: any, id: string, businessId: string) {
  const { data: flow, error: dbErr } = await admin
    .from('routing_flows')
    .select('*')
    .eq('id', id)
    .eq('business_id', businessId)
    .maybeSingle()
  if (dbErr || !flow) return null
  const { data: steps } = await admin
    .from('routing_steps')
    .select('*')
    .eq('flow_id', id)
    .order('position', { ascending: true })
  return { ...flow, steps: steps || [], step_count: (steps || []).length }
}

/**
 * Full upsert of the step list + entry_step_id for a routing flow.
 * Expected body:
 *   {
 *     entry_step_id: string | null,
 *     deleted_step_ids: string[],
 *     steps: [
 *       { id: string, key: string, prompt: string, step_type: "choice"|"text",
 *         options: [{ label, next_step_id?, test_id? }],
 *         next_step_id?: string|null, test_id?: string|null, position: number }
 *     ]
 *   }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { admin, effectiveBusinessId, error } = await resolveBusinessId()
    if (error) return error

    const { data: flow } = await admin
      .from('routing_flows')
      .select('id')
      .eq('id', id)
      .eq('business_id', effectiveBusinessId)
      .maybeSingle()
    if (!flow) return NextResponse.json({ error: 'Flow not found' }, { status: 404 })

    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

    const rawSteps: any[] = Array.isArray(body.steps) ? body.steps : []
    const deletedIds: string[] = Array.isArray(body.deleted_step_ids) ? body.deleted_step_ids : []
    const entryStepId: string | null = body.entry_step_id ?? null

    // ---- Validation -------------------------------------------------

    const payloadIds = new Set(rawSteps.map((s) => String(s.id).trim()).filter(Boolean))

    for (const s of rawSteps) {
      if (!payloadIds.has(s.id)) {
        return NextResponse.json({ error: `Step id "${s.id}" is not a valid id` }, { status: 400 })
      }
      s.key = String(s.key || '').trim()
      s.prompt = String(s.prompt || '').trim()
      if (!s.key) return NextResponse.json({ error: 'Every step needs a non-empty key' }, { status: 400 })
      if (!s.prompt) return NextResponse.json({ error: `Step "${s.key}" needs a prompt` }, { status: 400 })
      if (s.step_type !== 'choice' && s.step_type !== 'text') {
        return NextResponse.json({ error: `Step "${s.key}" has an invalid step_type` }, { status: 400 })
      }
      if (s.step_type === 'choice') {
        if (!Array.isArray(s.options) || s.options.length < 1) {
          return NextResponse.json({ error: `Choice step "${s.key}" needs at least 1 option` }, { status: 400 })
        }
        if (s.options.length > 10) {
          return NextResponse.json({ error: `Step "${s.key}" has more than 10 options (WhatsApp limit)` }, { status: 400 })
        }
        for (const opt of s.options) {
          if (!opt.label || String(opt.label).trim() === '') {
            return NextResponse.json({ error: `Step "${s.key}" has an option with no label` }, { status: 400 })
          }
          if (opt.next_step_id && !payloadIds.has(opt.next_step_id)) {
            return NextResponse.json({ error: `Step "${s.key}" targets a step that is not in the list` }, { status: 400 })
          }
        }
      } else {
        // text step: continuation is optional (empty target = end flow)
        if (s.next_step_id && !payloadIds.has(s.next_step_id)) {
          return NextResponse.json({ error: `Text step "${s.key}" targets a step that is not in the list` }, { status: 400 })
        }
      }
    }

    // key uniqueness within the payload
    const keySet = new Set<string>()
    for (const s of rawSteps) {
      if (keySet.has(s.key)) {
        return NextResponse.json({ error: `Duplicate key "${s.key}" in steps` }, { status: 400 })
      }
      keySet.add(s.key)
    }

    // cycle detection (DFS over next_step_id links, ignore text test leaves)
    if (entryStepId && payloadIds.has(entryStepId)) {
      const visited = new Set<string>()
      const stack = [entryStepId]
      while (stack.length > 0) {
        const cur = stack.pop()!
        if (visited.has(cur)) return NextResponse.json({ error: 'Cycle detected in step targets' }, { status: 400 })
        visited.add(cur)
        const s = rawSteps.find((x) => x.id === cur)
        if (!s) continue
        if (s.step_type === 'text' && s.next_step_id) {
          stack.push(s.next_step_id)
        } else if (s.step_type === 'choice') {
          for (const opt of s.options) {
            if (opt.next_step_id && payloadIds.has(opt.next_step_id)) stack.push(opt.next_step_id)
          }
        }
      }
    }

    if (entryStepId && !payloadIds.has(entryStepId)) {
      return NextResponse.json({ error: 'entry_step_id is not in the step list' }, { status: 400 })
    }

    // test_id references exist and belong to this business
    const testIds = new Set<string>()
    for (const s of rawSteps) {
      if (s.test_id) testIds.add(s.test_id)
      for (const opt of s.options || []) {
        if (opt.test_id) testIds.add(opt.test_id)
      }
    }
    if (testIds.size > 0) {
      const { data: existingTests } = await admin
        .from('tests')
        .select('id')
        .eq('business_id', effectiveBusinessId)
        .in('id', [...testIds])
      const validTestIds = new Set((existingTests || []).map((t: any) => t.id))
      for (const tid of testIds) {
        if (!validTestIds.has(tid)) {
          return NextResponse.json({ error: `Test id ${tid} does not exist or belongs to another business` }, { status: 400 })
        }
      }
    }

    // ---- Persist -------------------------------------------------

    // 1. upsert all payload steps
    if (rawSteps.length > 0) {
      const rows = rawSteps.map((s: any) => ({
        id: s.id,
        flow_id: id,
        key: s.key,
        prompt: s.prompt,
        step_type: s.step_type,
        options: (s.options || []).map((o: any) => ({
          label: String(o.label).trim(),
          next_step_id: o.next_step_id ?? null,
          test_id: o.test_id ?? null,
        })),
        next_step_id: s.next_step_id ?? null,
        test_id: s.test_id ?? null,
        position: Number(s.position ?? 0),
      }))
      const { error: upsertErr } = await admin
        .from('routing_steps')
        .upsert(rows, { onConflict: 'id' })
      if (upsertErr) {
        console.error('[routing-flows/steps] upsert error:', upsertErr)
        return NextResponse.json({ error: upsertErr.message }, { status: 500 })
      }
    }

    // 2. delete any remaining old steps not in the payload
    if (deletedIds.length > 0) {
      await admin
        .from('routing_steps')
        .delete()
        .in('id', deletedIds)
        .eq('flow_id', id)
    }
    if (payloadIds.size === 0) {
      await admin.from('routing_steps').delete().eq('flow_id', id)
    } else {
      await admin
        .from('routing_steps')
        .delete()
        .eq('flow_id', id)
        .not('id', 'in', `(${[...payloadIds].join(',')})`)
    }

    // 3. update the flow's entry_step_id
    await admin
      .from('routing_flows')
      .update({ entry_step_id: entryStepId, updated_at: new Date().toISOString() })
      .eq('id', id)

    const refreshed = await loadFlowForResponse(admin, id, effectiveBusinessId)
    return NextResponse.json({ flow: refreshed }, { headers: NO_CACHE })
  } catch (err: any) {
    console.error('[routing-flows/steps] PATCH error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
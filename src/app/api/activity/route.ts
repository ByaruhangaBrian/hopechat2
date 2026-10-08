import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logActivity, validateActivityInput, type ActivityInput } from '@/lib/activity/log'
import { clampPage, clampPageSize, validCategory, parseIsoDate } from '@/app/api/activity/params'

interface ParsedPayload {
  category: string
  action: string
  entityType?: string | null
  entityId?: string | null
  summary: string
  metadata?: Record<string, unknown>
}

function parseBody(body: unknown): { payload?: ParsedPayload; error?: string } {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { error: 'Invalid JSON body' }
  }
  const raw = body as Record<string, unknown>
  const payload: ParsedPayload = {
    category: typeof raw.category === 'string' ? raw.category.trim() : '',
    action: typeof raw.action === 'string' ? raw.action.trim() : '',
    entityType: typeof raw.entity_type === 'string' ? raw.entity_type : null,
    entityId: raw.entity_id === null || raw.entity_id === undefined ? null : String(raw.entity_id),
    summary: typeof raw.summary === 'string' ? raw.summary.trim() : '',
    metadata:
      typeof raw.metadata === 'object' && raw.metadata !== null && !Array.isArray(raw.metadata)
        ? (raw.metadata as Record<string, unknown>)
        : undefined,
  }
  return { payload }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: businessId, error: businessError } = await supabase.rpc('get_user_business_id')
    if (businessError || !businessId) {
      return NextResponse.json({ error: 'No business is linked to this account' }, { status: 403 })
    }

    let rawBody: unknown
    try {
      rawBody = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { payload, error } = parseBody(rawBody)
    if (error || !payload) {
      return NextResponse.json({ error: error ?? 'Invalid body' }, { status: 400 })
    }

    const input: ActivityInput = {
      businessId,
      actorUserId: user.id,
      actorLabel: user.email ?? null,
      category: payload.category,
      action: payload.action,
      entityType: payload.entityType,
      entityId: payload.entityId,
      summary: payload.summary,
      metadata: payload.metadata,
    }

    // The server-derived businessId wins; a body cannot spoof another tenant.
    const validationError = validateActivityInput(input)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const result = await logActivity(input)
    return NextResponse.json({ success: true, id: result?.id ?? null })
  } catch (err: unknown) {
    console.error('Activity route error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// Tenant-facing feed. RLS already scopes rows to the caller's business;
// the explicit column list guarantees no ip/city/country/UA is ever emitted.
export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = clampPage(searchParams.get('page'))
    const pageSize = clampPageSize(searchParams.get('pageSize'))
    const category = validCategory(searchParams.get('category'))
    const from = parseIsoDate(searchParams.get('from'))
    const to = parseIsoDate(searchParams.get('to'))

    const fromIndex = (page - 1) * pageSize
    const toIndex = fromIndex + pageSize - 1

    let query = supabase
      .from('activity_events')
      .select('id, actor_user_id, actor_label, category, action, entity_type, entity_id, summary, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(fromIndex, toIndex)

    if (category) query = query.eq('category', category)
    if (from) query = query.gte('created_at', from)
    if (to) query = query.lte('created_at', to)

    const { data, count, error } = await query
    if (error) {
      return NextResponse.json({ error: 'Failed to load activity' }, { status: 500 })
    }

    return NextResponse.json({
      events: data ?? [],
      total: count ?? 0,
      page,
      pageSize,
    })
  } catch (err: unknown) {
    console.error('Activity route error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logActivity, validateActivityInput, type ActivityInput } from '@/lib/activity/log'

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
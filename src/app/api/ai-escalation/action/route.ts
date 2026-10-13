import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getBusinessSettings } from '@/lib/tests/settings'
import { removeReservedTag } from '@/lib/ai/escalation'

const ACTIONS = ['take_over', 'resolve', 'return_to_ai'] as const
type EscalationAction = (typeof ACTIONS)[number]

function isAction(value: unknown): value is EscalationAction {
  return typeof value === 'string' && (ACTIONS as readonly string[]).includes(value)
}

function patchFor(action: EscalationAction): Record<string, unknown> {
  if (action === 'take_over') {
    return { escalated: false, human_takeover: true, ai_enabled: false }
  }
  if (action === 'resolve') {
    return { escalated: false }
  }
  return { escalated: false, human_takeover: false, ai_enabled: true }
}

async function resolveBusinessId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('business_id')
    .eq('user_id', userId)
    .maybeSingle()

  return data?.business_id ?? null
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const businessId = await resolveBusinessId(supabase, user.id)
    if (!businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const body = await req.json().catch(() => null)
    const conversationId = (body as { conversationId?: unknown } | null)?.conversationId
    const action = (body as { action?: unknown } | null)?.action

    if (typeof conversationId !== 'string' || !conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 })
    }
    if (!isAction(action)) {
      return NextResponse.json({ error: 'Invalid escalation action' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: conversation, error: fetchError } = await admin
      .from('conversations')
      .select('id, contact_id, escalated')
      .eq('id', conversationId)
      .eq('business_id', businessId)
      .maybeSingle()

    if (fetchError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const patch = patchFor(action)

    const { error: updateError } = await admin
      .from('conversations')
      .update(patch)
      .eq('id', conversationId)

    if (updateError) {
      console.error('[ai-escalation] conversation update failed:', updateError)
      return NextResponse.json({ error: 'Failed to update escalation' }, { status: 500 })
    }

    const contactId = (conversation as { contact_id: string | null }).contact_id
    if (contactId) {
      const { count } = await admin
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('contact_id', contactId)
        .eq('escalated', true)

      if (!count) {
        const { escalation } = await getBusinessSettings(businessId)
        await removeReservedTag(admin, { businessId, contactId, tagName: escalation.tagName })
      }
    }

    return NextResponse.json({ conversation: { id: conversationId, ...patch } })
  } catch (error) {
    console.error('[ai-escalation] action failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBusinessSettings, updateBusinessSettings } from '@/lib/tests/settings'
import { validateEscalationPolicy } from '@/lib/ai/escalation'

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

export async function GET() {
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

    const { escalation } = await getBusinessSettings(businessId)
    return NextResponse.json({ policy: escalation })
  } catch (error) {
    console.error('[ai-escalation] GET failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
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
    const result = validateEscalationPolicy(body)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    await updateBusinessSettings(businessId, { escalation: result.value })
    return NextResponse.json({ policy: result.value })
  } catch (error) {
    console.error('[ai-escalation] PUT failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

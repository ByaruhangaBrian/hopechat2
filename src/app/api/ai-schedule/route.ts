import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBusinessSettings, updateBusinessSettings } from '@/lib/tests/settings'
import { validateAiSchedule } from '@/lib/ai/schedule'

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

    const { ai_schedule } = await getBusinessSettings(businessId)
    return NextResponse.json({ schedule: ai_schedule })
  } catch (error) {
    console.error('[ai-schedule] GET failed:', error)
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
    const result = validateAiSchedule(body)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    await updateBusinessSettings(businessId, { ai_schedule: result.value })
    return NextResponse.json({ schedule: result.value })
  } catch (error) {
    console.error('[ai-schedule] PUT failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

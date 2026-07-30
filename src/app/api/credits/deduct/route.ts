import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { consumeCredits, checkCredits, getCreditCosts, type CreditAction } from '@/lib/credits'

/**
 * POST /api/credits/deduct
 *
 * Body: { businessId: string, action: CreditAction }
 *
 * Checks whether the business has sufficient credits for the given action,
 * and if so, atomically deducts them. Returns the remaining balance.
 *
 * Used by the broadcast hook (client-side) to deduct credits before sending,
 * and can be used by any future client-side flow that needs to gate on credits.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { businessId, action } = body as { businessId: string; action: CreditAction }

    if (!businessId || !action) {
      return NextResponse.json({ error: 'Missing businessId or action' }, { status: 400 })
    }

    const validActions: CreditAction[] = ['ai_chat', 'interactive_form', 'bulk_broadcast']
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: `Invalid action. Must be one of: ${validActions.join(', ')}` }, { status: 400 })
    }

    // Verify the user belongs to this business
    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.business_id !== businessId) {
      return NextResponse.json({ error: 'Business mismatch' }, { status: 403 })
    }

    const result = await consumeCredits(businessId, action)

    if (!result.ok) {
      return NextResponse.json(
        { error: result.reason, ok: false },
        { status: 402 },
      )
    }

    return NextResponse.json({ ok: true, newBalance: result.newBalance })
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/**
 * GET /api/credits/deduct
 *
 * Returns current credit costs configuration (for display purposes).
 */
export async function GET() {
  try {
    const costs = await getCreditCosts()
    return NextResponse.json(costs)
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

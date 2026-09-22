import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/automations/admin-client'

// Shared tenant-resolution for business-facing API routes.
//
// The `impersonated_business_id` cookie is a plain, user-writable cookie,
// so it must be honored ONLY for superadmins — otherwise any logged-in
// user could set it to another tenant's id and read or mutate that
// tenant's data through these service-role queries (RLS is bypassed).
export async function resolveBusinessId() {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const isSuperadmin = user.app_metadata?.is_superadmin === true

  const admin = supabaseAdmin()
  let { data: profile } = await supabase
    .from('profiles').select('business_id').eq('user_id', user.id).maybeSingle()

  if (!profile?.business_id) {
    const { data: adminProfile } = await admin
      .from('profiles').select('business_id').eq('user_id', user.id).maybeSingle()
    profile = adminProfile
  }

  const cookieStore = await cookies()
  const impersonatedId = isSuperadmin
    ? cookieStore.get('impersonated_business_id')?.value
    : undefined
  const effectiveBusinessId = impersonatedId || profile?.business_id
  if (!effectiveBusinessId) {
    return { error: NextResponse.json({ error: 'Business not found' }, { status: 400 }) }
  }

  return { admin, effectiveBusinessId }
}
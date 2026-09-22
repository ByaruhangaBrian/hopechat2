import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canAccess, type Permissions } from '@/lib/permissions'

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }

export { NO_CACHE }

export function maskApiKey(key: string): string {
  if (!key) return ''
  if (key.length <= 8) return `${key.slice(0, 2)}****`
  return `${key.slice(0, 8)}****${key.slice(-4)}`
}

/**
 * Owners/admins and anyone granted `bookings` or `settings` may manage the
 * Cal.com integration. Returns the current user's profile on success, or a
 * `{ error }` NextResponse to short-circuit the handler.
 */
export async function getCalcomManager() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, permissions, business_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile?.business_id) {
    return { error: NextResponse.json({ error: 'Business not found' }, { status: 400 }) }
  }

  const role = profile.role as string | null
  const permissions = profile.permissions as Permissions | null
  const allowed =
    canAccess(permissions, 'bookings', role) || canAccess(permissions, 'settings', role)

  if (!allowed) {
    return {
      error: NextResponse.json(
        {
          error:
            'You do not have permission to manage integrations. Ask an owner to grant you the "Appointment Bookings" permission.',
        },
        { status: 403 },
      ),
    }
  }

  return { profile, role: profile.role as string | null, permissions }
}
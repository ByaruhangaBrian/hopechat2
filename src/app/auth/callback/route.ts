import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity/log'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in search params, use it as the redirection URL
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const user = data.user
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('business_id')
          .eq('user_id', user.id)
          .maybeSingle()
        if (profile?.business_id) {
          void logActivity({
            businessId: profile.business_id,
            actorUserId: user.id,
            actorLabel: user.email ?? null,
            category: 'auth',
            action: 'login',
            summary: `Signed in as ${user.email ?? 'user'}`,
          })
        }
      }
      const forwardedHost = request.headers.get('x-forwarded-host') // if origin is not the same as forwarded host
      const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
      const isLocalEnv = process.env.NODE_ENV === 'development'

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`${forwardedProto}://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}

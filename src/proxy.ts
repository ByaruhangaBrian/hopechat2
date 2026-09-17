import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const DOCS_HOST = 'docs.hopechat2.vercel.app'

export async function proxy(request: NextRequest) {
  // ──────────────────────────────────────────────────────────────
  // Docs subdomain: rewrite to the /docs route group, skip auth.
  // Hosted on the same deployment; Vercel routes the subdomain here.
  // ──────────────────────────────────────────────────────────────
  const hostname = request.nextUrl.hostname
  if (hostname === DOCS_HOST) {
    const { pathname } = request.nextUrl
    if (!pathname.startsWith('/docs')) {
      const rewritten = request.nextUrl.clone()
      rewritten.pathname = `/docs${pathname === '/' ? '' : pathname}`
      return NextResponse.rewrite(rewritten)
    }
    return NextResponse.next({ request })
  }

  // ──────────────────────────────────────────────────────────────
  // Everything below is the existing auth proxy, unchanged.
  // ──────────────────────────────────────────────────────────────
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Admin pages - redirect to dashboard if not superadmin
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const isSuperadmin = user?.app_metadata?.is_superadmin === true;
    if (!isSuperadmin) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  // Auth pages - redirect to dashboard if already logged in
  if (user && (
    request.nextUrl.pathname === '/login' ||
    request.nextUrl.pathname === '/signup' ||
    request.nextUrl.pathname === '/forgot-password'
  )) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Protected pages - redirect to login if not authenticated
  const protectedPaths = ['/dashboard', '/inbox', '/contacts', '/pipelines', '/broadcasts', '/automations', '/settings', '/onboarding']
  if (!user && protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // API routes that need auth (not webhooks)
  if (!user && request.nextUrl.pathname.startsWith('/api/whatsapp/') &&
      !request.nextUrl.pathname.includes('/webhook')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

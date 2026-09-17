import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Subdomain zones. All three share one deployment; the proxy splits them:
// - apex (hopechat.net, www.hopechat.net) → marketing landing page
// - app.hopechat.net                      → the business app (dashboard + auth)
// - docs.hopechat.net                     → the documentation site
const APP_HOST = 'app.hopechat.net'
const DOCS_HOST = 'docs.hopechat.net'
const DOCS_LEGACY_HOST = 'docs.hopechat2.vercel.app'
const LANDING_HOSTS = new Set(['hopechat.net', 'www.hopechat.net'])

// Paths that belong to the app zone. Requests for these coming in on the
// landing domain are redirected to app.hopechat.net.
const APP_PATHS = [
  '/dashboard', '/inbox', '/contacts', '/pipelines', '/broadcasts',
  '/automations', '/settings', '/onboarding', '/menus', '/ai',
  '/login', '/signup', '/forgot-password',
]

function withHost(pathname: string, search: string, host: string): NextResponse {
  return NextResponse.redirect(new URL(`${pathname}${search}`, `https://${host}`))
}

export async function proxy(request: NextRequest) {
  const hostname = request.nextUrl.hostname
  const { pathname, search } = request.nextUrl

  // ──────────────────────────────────────────────────────────────
  // Docs zone: rewrite /x → /docs/x, skip auth.
  // Vercel routes the docs subdomain to this deployment.
  // ──────────────────────────────────────────────────────────────
  if (hostname === DOCS_HOST || hostname === DOCS_LEGACY_HOST) {
    if (!pathname.startsWith('/docs')) {
      const rewritten = request.nextUrl.clone()
      rewritten.pathname = `/docs${pathname === '/' ? '' : pathname}`
      return NextResponse.rewrite(rewritten)
    }
    return NextResponse.next({ request })
  }

  // ──────────────────────────────────────────────────────────────
  // App zone
  // ──────────────────────────────────────────────────────────────
  const isAppZoneBareRoot = hostname === APP_HOST && pathname === '/'
  if (hostname === APP_HOST && pathname.startsWith('/docs')) {
    return withHost(pathname, search, DOCS_HOST)
  }
  // Bare "/" on the app host resolves to the dashboard home. Mutating the
  // request before the auth checks lets the existing protected-path logic
  // decide (anonymous visitors are sent to /login on this host). The mutation
  // is carried by NextResponse.next({ request }) and does not re-run proxy.
  if (isAppZoneBareRoot) {
    request.nextUrl.pathname = '/dashboard'
  }

  // ──────────────────────────────────────────────────────────────
  // Landing zone: keep the app and docs off the landing domain.
  // ──────────────────────────────────────────────────────────────
  if (LANDING_HOSTS.has(hostname)) {
    if (APP_PATHS.some((p) => pathname.startsWith(p))) {
      return withHost(pathname, search, APP_HOST)
    }
    if (pathname.startsWith('/docs')) {
      return withHost(pathname, search, DOCS_HOST)
    }
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

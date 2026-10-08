import type { NextFetchEvent, NextRequest } from 'next/server'
import type { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/automations/admin-client'

export const SESSION_COOKIE = 'hc_sid'
export const THROTTLE_COOKIE = 'hc_last_seen'
export const THROTTLE_MS = 60_000
export const SESSION_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

export function shouldCapture(lastSeenMs: number | null, now = Date.now()): boolean {
  return lastSeenMs === null || now - lastSeenMs >= THROTTLE_MS
}

export function parseGeoFloat(value: string | null): number | null {
  if (value === null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

interface SessionSnapshot {
  sessionId: string
  userId: string
  pathname: string
  ip: string | null
  city: string | null
  country: string | null
  region: string | null
  latitude: number | null
  longitude: number | null
  userAgent: string | null
}

/**
 * Best-effort, throttled session capture for authenticated page navigations.
 *
 * - Issues an `hc_sid` cookie (session identity) when absent.
 * - Writes an `auth_sessions` row at most once per 60s per browser session,
 *   fire-and-forget via `event.waitUntil` so the page response is never
 *   delayed or failed by the write.
 * - Tolerates missing Vercel geo headers (local dev has none).
 * Never throws.
 */
export function captureSessionIfDue(
  request: NextRequest,
  event: NextFetchEvent,
  response: NextResponse,
  userId: string
): NextResponse {
  const now = Date.now()
  const priorSid = request.cookies.get(SESSION_COOKIE)?.value
  const lastSeenRaw = request.cookies.get(THROTTLE_COOKIE)?.value
  const lastSeen = lastSeenRaw ? Number(lastSeenRaw) : null

  let sessionId = priorSid
  let due = shouldCapture(lastSeen, now)

  if (!sessionId) {
    sessionId = crypto.randomUUID()
    due = true
    response.cookies.set({
      name: SESSION_COOKIE,
      value: sessionId,
      httpOnly: true,
      sameSite: 'lax',
      secure: request.nextUrl.protocol === 'https:',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    })
  }

  if (!due) return response

  response.cookies.set({
    name: THROTTLE_COOKIE,
    value: String(now),
    httpOnly: true,
    secure: request.nextUrl.protocol === 'https:',
    maxAge: 60 * 60 * 24, // throttle marker only; a day is plenty
    path: '/',
  })

  const snapshot: SessionSnapshot = {
    sessionId,
    userId,
    pathname: request.nextUrl.pathname,
    ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    city: request.headers.get('x-vercel-ip-city'),
    country: request.headers.get('x-vercel-ip-country'),
    region: request.headers.get('x-vercel-ip-country-region'),
    latitude: parseGeoFloat(request.headers.get('x-vercel-ip-latitude')),
    longitude: parseGeoFloat(request.headers.get('x-vercel-ip-longitude')),
    userAgent: request.headers.get('user-agent'),
  }

  void event.waitUntil(persistSession(snapshot))

  return response
}

async function persistSession(snapshot: SessionSnapshot): Promise<void> {
  try {
    const admin = supabaseAdmin()

    const { data: profile } = await admin
      .from('profiles')
      .select('business_id')
      .eq('user_id', snapshot.userId)
      .maybeSingle()

    const businessId = profile?.business_id
    if (!businessId) return // no business yet — nothing to attribute the session to

    await admin
      .from('auth_sessions')
      .upsert(
        {
          business_id: businessId,
          user_id: snapshot.userId,
          session_id: snapshot.sessionId,
          ip_address: snapshot.ip,
          city: snapshot.city,
          country: snapshot.country,
          country_region: snapshot.region,
          latitude: snapshot.latitude,
          longitude: snapshot.longitude,
          user_agent: snapshot.userAgent,
          path: snapshot.pathname,
          last_seen: new Date().toISOString(),
        },
        { onConflict: 'session_id,user_id' }
      )
  } catch (err) {
    // Best-effort — never let analytics break the page.
    console.warn('[analytics] session capture failed:', err instanceof Error ? err.message : err)
  }
}
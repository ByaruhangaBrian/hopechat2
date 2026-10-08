import { createHash } from 'crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const REDACTION_AGE_MS = 90 * 24 * 60 * 60 * 1000

function secretMatches(supplied: string | null, expected: string): boolean {
  const a = createHash('sha256').update(supplied ?? '').digest()
  const b = createHash('sha256').update(expected).digest()
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

/** Parse an IPv6 string to a 128-bit integer, or null if malformed. */
function parseIpv6(value: string): bigint | null {
  const body = value.split('%')[0].toLowerCase()
  const hasIpv4Tail = body.includes('.')

  const parts = body.split('::')
  if (parts.length > 2) return null
  const left = parts[0] === '' ? [] : parts[0].split(':')
  const right = parts.length === 2 ? (parts[1] === '' ? [] : parts[1].split(':')) : []

  const all = [...left, ...right]
  const maxSegments = hasIpv4Tail ? 7 : 8 // an embedded IPv4 occupies the last 2 hextets
  if (!hasIpv4Tail) {
    if (all.length > maxSegments) return null
    if (parts.length === 1 && all.length !== maxSegments) return null
  }

  const parsed: number[] = []
  for (let i = 0; i < all.length; i++) {
    const isTail = hasIpv4Tail && i === all.length - 1
    if (isTail) {
      const octets = all[i].split('.').map(Number)
      if (octets.length !== 4 || octets.some((o) => !Number.isInteger(o) || o < 0 || o > 255)) return null
      parsed.push((octets[0] << 8) | octets[1])
      parsed.push((octets[2] << 8) | octets[3])
      continue
    }
    const n = parseInt(all[i], 16)
    if (!Number.isFinite(n) || n < 0 || n > 0xffff) return null
    parsed.push(n)
  }

  const missing = parts.length === 2 ? maxSegments - parsed.length : 0
  if (missing < 0) return null

  let bits = BigInt(0)
  for (const n of parsed) bits = (bits << BigInt(16)) | BigInt(n)
  bits <<= BigInt(missing * 16)
  return bits
}

/** Compress an 8-group hextet array into standard IPv6 notation. */
function compressHex(c: number[]): string {
  let bestStart = -1
  let bestLen = 0
  for (let i = 0; i <= c.length; i++) {
    let j = i
    while (j < c.length && c[j] === 0) j++
    if (j - i > bestLen) {
      bestLen = j - i
      bestStart = i
    }
  }
  if (bestLen > 1) {
    const pre = c
      .slice(0, bestStart)
      .map((n) => n.toString(16))
      .join(':')
    const post = c
      .slice(bestStart + bestLen)
      .map((n) => n.toString(16))
      .join(':')
    return `${pre}::${post}`
  }
  return c.map((n) => n.toString(16)).join(':')
}

/**
 * Reduce an IP to its network prefix so the host portion is gone:
 *   IPv4 203.0.113.7   -> 203.0.113.0   (drop the last octet)
 *   IPv6 2001:db8::7   -> 2001:db8::     (keep the first /64)
 * Anything unparseable returns null (do not touch, do not destroy).
 */
function redactIp(value: string | null): string | null {
  if (!value) return null

  const v4 = value.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (v4) {
    const octets = v4.slice(1).map(Number)
    if (octets.some((o) => o > 255)) return null
    return `${octets[0]}.${octets[1]}.${octets[2]}.0`
  }

  if (value.includes(':')) {
    const bits = parseIpv6(value)
    if (bits === null) return null
    const netmask = BigInt('0xffffffffffffffff0000000000000000')
    const masked = bits & netmask
    const groups: number[] = []
    for (let i = 7; i >= 0; i--) groups[7 - i] = Number((masked >> BigInt(i * 16)) & BigInt(0xffff))
    return compressHex(groups)
  }

  return null
}

/**
 * Redact IP addresses older than 90 days on `auth_sessions` and
 * `consent_records`. City/country and the consent rows themselves (plus their
 * versions) are untouched — only the host portion of the IP is dropped.
 * Idempotent: a second run finds nothing left to change (0 rows affected).
 *
 * Guarded by the `x-cron-secret` header matching `RETENTION_CRON_SECRET`,
 * same timing-safe pattern as the other cron routes.
 */
export async function GET(request: Request) {
  const expected = process.env.RETENTION_CRON_SECRET
  if (!expected) {
    return NextResponse.json({ error: 'cron not configured' }, { status: 503 })
  }
  const supplied = request.headers.get('x-cron-secret')
  if (!secretMatches(supplied, expected)) {
    console.error(
      `[cron-auth] retention rejected supplied_len=${supplied?.length ?? 0} expected_len=${expected.length}`
    )
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const cutoff = new Date(Date.now() - REDACTION_AGE_MS).toISOString()

  // auth_sessions: oldest write is last_seen; consent_records uses accepted_at.
  async function redactWhere(table: 'auth_sessions' | 'consent_records', dateCol: string) {
    const { data: rows, error } = await admin
      .from(table)
      .select('id, ip_address')
      .lte(dateCol, cutoff)
      .not('ip_address', 'is', null)

    if (error) throw new Error(`${table}: ${error.message}`)
    if (!rows || rows.length === 0) return 0

    let changed = 0
    for (const row of rows) {
      const redacted = redactIp(row.ip_address as string | null)
      if (redacted === null || redacted === row.ip_address) continue
      const { error: updateErr } = await admin
        .from(table)
        .update({ ip_address: redacted })
        .eq('id', row.id)
        .select()
        .maybeSingle()
      if (updateErr) {
        console.error(`[retention] update ${table} ${row.id}: ${updateErr.message}`)
        continue
      }
      changed++
    }
    return changed
  }

  try {
    const sessions = await redactWhere('auth_sessions', 'last_seen')
    const consents = await redactWhere('consent_records', 'accepted_at')
    return NextResponse.json({ ok: true, redacted: { auth_sessions: sessions, consent_records: consents } })
  } catch (err) {
    console.error('[retention] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Retention run failed' }, { status: 500 })
  }
}
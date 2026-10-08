export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function clampPosInt(raw: string | null, fallback: number, max: number): number {
  const n = raw ? Number.parseInt(raw, 10) : NaN
  if (Number.isNaN(n) || n < 1) return fallback
  return Math.min(n, max)
}

export function isValidUuid(value: string | null | undefined): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

export function computeDurationSeconds(startedAt: string, lastSeenAt: string): number {
  const start = new Date(startedAt).getTime()
  const last = new Date(lastSeenAt).getTime()
  if (Number.isNaN(start) || Number.isNaN(last)) return 0
  return Math.max(0, Math.floor((last - start) / 1000))
}
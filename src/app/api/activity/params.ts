import { EVENT_VOCABULARY } from '@/lib/activity/log'

export const DEFAULT_PAGE_SIZE = 25
export const MAX_PAGE_SIZE = 50

export function clampPage(raw: string | null): number {
  const page = raw ? Number.parseInt(raw, 10) : NaN
  if (Number.isNaN(page) || page < 1) return 1
  return Math.floor(page)
}

export function clampPageSize(raw: string | null): number {
  const n = raw ? Number.parseInt(raw, 10) : NaN
  if (Number.isNaN(n) || n < 1) return DEFAULT_PAGE_SIZE
  return Math.min(n, MAX_PAGE_SIZE)
}

export function validCategory(raw: string | null): string | null {
  if (!raw) return null
  return raw in EVENT_VOCABULARY ? raw : null
}

export function parseIsoDate(raw: string | null): string | null {
  if (!raw) return null
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}
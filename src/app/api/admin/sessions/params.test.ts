import { describe, expect, it } from 'vitest'
import {
  clampPosInt,
  computeDurationSeconds,
  isValidUuid,
} from '@/app/api/admin/sessions/params'

describe('clampPosInt', () => {
  it('returns fallback for missing / non-numeric input', () => {
    expect(clampPosInt(null, 50, 100)).toBe(50)
    expect(clampPosInt('abc', 50, 100)).toBe(50)
    expect(clampPosInt('0', 50, 100)).toBe(50)
    expect(clampPosInt('-3', 50, 100)).toBe(50)
  })

  it('clamps to the max bound', () => {
    expect(clampPosInt('5000', 50, 100)).toBe(100)
  })

  it('keeps in-range values', () => {
    expect(clampPosInt('42', 50, 100)).toBe(42)
  })
})

describe('isValidUuid', () => {
  it('accepts canonical UUIDs', () => {
    expect(isValidUuid('0f6d5a1e-2b3c-4d5e-8f9a-1b2c3d4e5f6a')).toBe(true)
  })

  it('rejects junk', () => {
    expect(isValidUuid(null)).toBe(false)
    expect(isValidUuid(undefined)).toBe(false)
    expect(isValidUuid('not-a-uuid')).toBe(false)
    expect(isValidUuid('0f6d5a1e-2b3c-4d5e-8f9a')).toBe(false)
  })
})

describe('computeDurationSeconds', () => {
  const start = '2026-01-01T10:00:00.000Z'

  it('computes elapsed seconds', () => {
    expect(computeDurationSeconds(start, '2026-01-01T10:05:30.000Z')).toBe(330)
  })

  it('never returns a negative duration (clock skew)', () => {
    expect(computeDurationSeconds('2026-01-01T10:00:00.000Z', '2026-01-01T09:00:00.000Z')).toBe(0)
  })

  it('returns 0 for unparseable timestamps', () => {
    expect(computeDurationSeconds('nope', '2026-01-01T10:00:00.000Z')).toBe(0)
  })
})
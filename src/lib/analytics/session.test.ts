import { describe, expect, it } from 'vitest'
import { parseGeoFloat, shouldCapture, THROTTLE_MS } from '@/lib/analytics/session'

describe('shouldCapture', () => {
  const now = 1_000_000_000_000

  it('captures when there is no prior throttle marker', () => {
    expect(shouldCapture(null, now)).toBe(true)
  })

  it('skips when last seen was recent (throttle window)', () => {
    expect(shouldCapture(now - THROTTLE_MS + 1, now)).toBe(false)
  })

  it('captures exactly at the throttle boundary', () => {
    expect(shouldCapture(now - THROTTLE_MS, now)).toBe(true)
  })

  it('captures when last seen is older than the window', () => {
    expect(shouldCapture(now - THROTTLE_MS * 2, now)).toBe(true)
  })
})

describe('parseGeoFloat', () => {
  it('parses a valid numeric string', () => {
    expect(parseGeoFloat('12.345')).toBe(12.345)
  })

  it('returns null for empty / null input', () => {
    expect(parseGeoFloat(null)).toBeNull()
    expect(parseGeoFloat('')).toBeNull()
  })

  it('returns null for garbage input', () => {
    expect(parseGeoFloat('n/a')).toBeNull()
    expect(parseGeoFloat('abc')).toBeNull()
  })
})
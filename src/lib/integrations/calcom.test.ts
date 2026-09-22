import { describe, expect, it } from 'vitest'
import { buildBookingLink, isPlaintextCalApiKey, parseEventType, parseProfile } from './calcom'

describe('buildBookingLink', () => {
  it('prefers the bookingUrl returned by the API', () => {
    const link = buildBookingLink({ slug: '30min', bookingUrl: 'https://cal.com/jane/30min?duration=60' }, 'jane')
    expect(link).toBe('https://cal.com/jane/30min?duration=60')
  })

  it('constructs a link from username + slug when bookingUrl is missing', () => {
    const link = buildBookingLink({ slug: 'intro-call', bookingUrl: null }, 'jane')
    expect(link).toBe('https://cal.com/jane/intro-call')
  })
})

describe('parseProfile', () => {
  it('maps a /v2/me response', () => {
    const profile = parseProfile({
      id: 7,
      username: 'jane-consulting',
      email: 'jane@example.com',
      name: 'Jane Doe',
      timeZone: 'Africa/Nairobi',
    })
    expect(profile).toEqual({
      id: 7,
      username: 'jane-consulting',
      email: 'jane@example.com',
      name: 'Jane Doe',
      timeZone: 'Africa/Nairobi',
    })
  })

  it('accepts a null username on an account without a handle', () => {
    const profile = parseProfile({ id: 1, username: null, email: 'a@b.com' })
    expect(profile.username).toBeNull()
  })

  it('rejects a non-profile payload', () => {
    expect(() => parseProfile({ status: 'error' })).toThrow(/Unexpected Cal.com profile/)
  })
})

describe('parseEventType', () => {
  it('maps an event type, marking hidden', () => {
    const eventType = parseEventType({
      id: 42,
      title: 'Strategy Session',
      slug: 'strategy-session',
      lengthInMinutes: 30,
      hidden: true,
      description: 'A 30 min call',
      bookingUrl: 'https://cal.com/jane/strategy-session',
    })
    expect(eventType).toEqual({
      id: 42,
      title: 'Strategy Session',
      slug: 'strategy-session',
      lengthInMinutes: 30,
      hidden: true,
      description: 'A 30 min call',
      bookingUrl: 'https://cal.com/jane/strategy-session',
    })
  })

  it('defaults hidden to false', () => {
    const eventType = parseEventType({ id: 1, slug: 'meet', lengthInMinutes: 60 })
    expect(eventType.hidden).toBe(false)
  })

  it('rejects an event type missing an id or slug', () => {
    expect(() => parseEventType({ title: 'nope' })).toThrow(/Unexpected Cal.com event-type/)
  })
})

describe('isPlaintextCalApiKey', () => {
  it('recognises test and live key prefixes', () => {
    expect(isPlaintextCalApiKey('cal_live_abc123')).toBe(true)
    expect(isPlaintextCalApiKey('cal_abc123')).toBe(true)
  })

  it('rejects ciphertext and junk', () => {
    expect(isPlaintextCalApiKey('a1b2c3:d4e5f6:d7e8f9')).toBe(false)
    expect(isPlaintextCalApiKey('')).toBe(false)
  })
})
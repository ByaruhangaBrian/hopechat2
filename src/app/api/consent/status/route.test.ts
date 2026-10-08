import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mockFrom,
  }),
}))

import { GET } from '@/app/api/consent/status/route'
import { POST } from '@/app/api/consent/accept/route'

// A query-builder whose chain methods return the SAME object, so
// `.select().eq().maybeSingle()` resolves on the original row stub.
function chain(overrides: Record<string, unknown> = {}) {
  const base: Record<string, unknown> = {
    eq: () => base,
    order: () => base,
    maybeSingle: async () => Promise.resolve({ data: null, error: null }),
    select: () => base,
    insert: () => base,
    update: () => base,
  }
  return Object.assign(base, overrides)
}

function profileRow(businessId = 'biz-1') {
  return chain({
    maybeSingle: async () => Promise.resolve({ data: { business_id: businessId }, error: null }),
  })
}

function systemSettingsRow(terms: number, privacy: number) {
  return chain({
    maybeSingle: async () =>
      Promise.resolve({
        data: { value: { terms_version: terms, privacy_version: privacy } },
        error: null,
      }),
  })
}

function consentRow(record: Record<string, unknown> | null) {
  return chain({
    maybeSingle: async () => Promise.resolve({ data: record, error: null }),
  })
}

describe('GET /api/consent/status', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockFrom.mockReset()
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns current versions with accepted=false when no record exists', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u-1', email: 'a@b.co' } },
      error: null,
    })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return profileRow()
      if (table === 'system_settings') return systemSettingsRow(1, 1)
      if (table === 'consent_records') return consentRow(null)
      throw new Error(`unexpected table ${table}`)
    })
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ terms_version: 1, privacy_version: 1, accepted: false })
  })

  it('returns accepted=true with the accepted_at when a matching record exists', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u-1', email: 'a@b.co' } },
      error: null,
    })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return profileRow()
      if (table === 'system_settings') return systemSettingsRow(1, 1)
      if (table === 'consent_records') {
        return consentRow({
          accepted_at: '2026-10-08T10:00:00Z',
          terms_version: 1,
          privacy_version: 1,
        })
      }
      throw new Error(`unexpected table ${table}`)
    })
    const res = await GET()
    const body = await res.json()
    expect(body.accepted).toBe(true)
    expect(body.accepted_at).toBe('2026-10-08T10:00:00Z')
  })
})

describe('POST /api/consent/accept', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockFrom.mockReset()
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const res = await POST(
      new Request('http://localhost/api/consent/accept', {
        method: 'POST',
        body: JSON.stringify({ terms_version: 1, privacy_version: 1 }),
      }),
    )
    expect(res.status).toBe(401)
  })

  it('returns 400 when versions are stale', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u-1', email: 'a@b.co' } },
      error: null,
    })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return profileRow()
      if (table === 'system_settings') return systemSettingsRow(2, 1)
      throw new Error(`unexpected table ${table}`)
    })
    const res = await POST(
      new Request('http://localhost/api/consent/accept', {
        method: 'POST',
        body: JSON.stringify({ terms_version: 1, privacy_version: 1 }),
      }),
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.current_terms_version).toBe(2)
  })

  it('writes both business_id and user_id and flips the business to required', async () => {
    let inserted: unknown = null
    let updated: unknown = null
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u-1', email: 'a@b.co' } },
      error: null,
    })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return profileRow()
      if (table === 'system_settings') return systemSettingsRow(1, 1)
      if (table === 'consent_records') {
        return chain({
          insert: (row: unknown) => {
            inserted = row
            return chain()
          },
        })
      }
      if (table === 'businesses') {
        return chain({
          update: (row: unknown) => {
            updated = row
            return chain()
          },
        })
      }
      throw new Error(`unexpected table ${table}`)
    })
    const res = await POST(
      new Request('http://localhost/api/consent/accept', {
        method: 'POST',
        headers: {
          'user-agent': 'vitest',
          'x-forwarded-for': '203.0.113.7, 10.0.0.1',
        },
        body: JSON.stringify({ terms_version: 1, privacy_version: 1 }),
      }),
    )
    expect(res.status).toBe(200)
    expect(inserted).toMatchObject({
      business_id: 'biz-1',
      user_id: 'u-1',
      terms_version: 1,
      privacy_version: 1,
      ip_address: '203.0.113.7',
      user_agent: 'vitest',
    })
    expect(updated).toEqual({ consent_state: 'required' })
  })

  it('returns 200 (not 409) on idempotent re-accept', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u-1', email: 'a@b.co' } },
      error: null,
    })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return profileRow()
      if (table === 'system_settings') return systemSettingsRow(1, 1)
      if (table === 'consent_records') {
        return chain({
          insert: () =>
            chain({
              maybeSingle: async () =>
                Promise.resolve({
                  data: null,
                  error: { code: '23505', message: 'duplicate key' },
                }),
            }),
        })
      }
      if (table === 'businesses') return chain()
      throw new Error(`unexpected table ${table}`)
    })
    const res = await POST(
      new Request('http://localhost/api/consent/accept', {
        method: 'POST',
        body: JSON.stringify({ terms_version: 1, privacy_version: 1 }),
      }),
    )
    expect(res.status).toBe(200)
  })
})
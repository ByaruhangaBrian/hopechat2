import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFrom = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: mockFrom }),
}))

function chain(overrides: Record<string, unknown> = {}) {
  const base: Record<string, unknown> & { maybeSingle?: () => Promise<unknown> } = {
    eq: () => base,
    lte: () => base,
    not: () => base,
    maybeSingle: async () => Promise.resolve({ data: null, error: null }),
    select: () => base,
    update: () => base,
    // Awaiting a query builder (the route awaits `...select().lte().not()`)
    // resolves to the same result as calling `maybeSingle()`.
    then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(base.maybeSingle?.()).then(resolve, reject),
  }
  return Object.assign(base, overrides)
}

import { GET } from '@/app/api/cron/retention/route'

const SECRET = 'retention-secret'

function request(withSecret = true) {
  const headers = new Headers()
  if (withSecret) headers.set('x-cron-secret', SECRET)
  return new Request('http://localhost/api/cron/retention', { headers })
}

describe('GET /api/cron/retention', () => {
  beforeEach(() => {
    mockFrom.mockReset()
    process.env.RETENTION_CRON_SECRET = SECRET
  })

  it('returns 401 without the secret', async () => {
    const res = await GET(request(false))
    expect(res.status).toBe(401)
  })

  it('returns 401 on a wrong secret', async () => {
    const headers = new Headers({ 'x-cron-secret': 'wrong' })
    const res = await GET(new Request('http://localhost/api/cron/retention', { headers }))
    expect(res.status).toBe(401)
  })

  it('returns 503 when the secret env is not configured', async () => {
    delete process.env.RETENTION_CRON_SECRET
    const res = await GET(request())
    expect(res.status).toBe(503)
  })

  it('redacts old auth_sessions and consent_records IPs to their /24 network prefix', async () => {
    const sessions = [{ id: 's-1', ip_address: '203.0.113.7' }]
    const consents = [{ id: 'c-1', ip_address: '203.0.113.7' }]
    let sessionUpdate: unknown = null
    let consentUpdate: unknown = null
    mockFrom.mockImplementation((table: string) => {
      if (table === 'auth_sessions') {
        return chain({
          select: () =>
            chain({
              lte: () =>
                chain({
                  not: () =>
                    chain({
                      maybeSingle: async () => Promise.resolve({ data: sessions, error: null }),
                    }),
                }),
            }),
          update: (row: unknown) => {
            sessionUpdate = row
            return chain({ select: () => chain({ maybeSingle: async () => Promise.resolve({ data: { id: 's-1' }, error: null }) }) })
          },
        })
      }
      if (table === 'consent_records') {
        return chain({
          select: () =>
            chain({
              lte: () =>
                chain({
                  not: () =>
                    chain({
                      maybeSingle: async () => Promise.resolve({ data: consents, error: null }),
                    }),
                }),
            }),
          update: (row: unknown) => {
            consentUpdate = row
            return chain({ select: () => chain({ maybeSingle: async () => Promise.resolve({ data: { id: 'c-1' }, error: null }) }) })
          },
        })
      }
      throw new Error(`unexpected table ${table}`)
    })
    const res = await GET(request())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ ok: true, redacted: { auth_sessions: 1, consent_records: 1 } })
    expect(sessionUpdate).toEqual({ ip_address: '203.0.113.0' })
    expect(consentUpdate).toEqual({ ip_address: '203.0.113.0' })
  })

  it('redacts IPv6 to the /64 network prefix', async () => {
    const sessions = [{ id: 's-1', ip_address: '2001:db8:0:1:1:2:3:4' }]
    let sessionUpdate: unknown = null
    mockFrom.mockImplementation((table: string) => {
      if (table === 'auth_sessions') {
        return chain({
          select: () =>
            chain({
              lte: () =>
                chain({
                  not: () =>
                    chain({
                      maybeSingle: async () => Promise.resolve({ data: sessions, error: null }),
                    }),
                }),
            }),
          update: (row: unknown) => {
            sessionUpdate = row
            return chain({ select: () => chain({ maybeSingle: async () => Promise.resolve({ data: { id: 's-1' }, error: null }) }) })
          },
        })
      }
      return chain({ select: () => chain({ lte: () => chain({ not: () => chain({ maybeSingle: async () => Promise.resolve({ data: [], error: null }) }) }) }) })
    })
    const res = await GET(request())
    const body = await res.json()
    expect(sessionUpdate).toEqual({ ip_address: '2001:db8:0:1::' })
    expect(body.redacted.auth_sessions).toBe(1)
  })

  it('is idempotent — already-redacted rows are not touched on a second run', async () => {
    const sessions = [{ id: 's-1', ip_address: '203.0.113.0' }]
    let sessionUpdate: unknown = null
    mockFrom.mockImplementation((table: string) => {
      if (table === 'auth_sessions') {
        return chain({
          select: () =>
            chain({
              lte: () =>
                chain({
                  not: () =>
                    chain({
                      maybeSingle: async () => Promise.resolve({ data: sessions, error: null }),
                    }),
                }),
            }),
          update: (row: unknown) => {
            sessionUpdate = row
            return chain({ select: () => chain({ maybeSingle: async () => Promise.resolve({ data: { id: 's-1' }, error: null }) }) })
          },
        })
      }
      return chain({ select: () => chain({ lte: () => chain({ not: () => chain({ maybeSingle: async () => Promise.resolve({ data: [], error: null }) }) }) }) })
    })
    const res = await GET(request())
    const body = await res.json()
    expect(sessionUpdate).toBeNull()
    expect(body.redacted).toEqual({ auth_sessions: 0, consent_records: 0 })
  })

  it('ignores malformed values instead of corrupting them', async () => {
    const sessions = [{ id: 's-1', ip_address: 'not-an-ip' }]
    let sessionUpdate: unknown = null
    mockFrom.mockImplementation((table: string) => {
      if (table === 'auth_sessions') {
        return chain({
          select: () =>
            chain({
              lte: () =>
                chain({
                  not: () =>
                    chain({
                      maybeSingle: async () => Promise.resolve({ data: sessions, error: null }),
                    }),
                }),
            }),
          update: (row: unknown) => {
            sessionUpdate = row
            return chain({ select: () => chain({ maybeSingle: async () => Promise.resolve({ data: { id: 's-1' }, error: null }) }) })
          },
        })
      }
      return chain({ select: () => chain({ lte: () => chain({ not: () => chain({ maybeSingle: async () => Promise.resolve({ data: [], error: null }) }) }) }) })
    })
    const res = await GET(request())
    const body = await res.json()
    expect(sessionUpdate).toBeNull()
    expect(body.redacted.auth_sessions).toBe(0)
  })

  it('does not touch rows when no data is returned', async () => {
    mockFrom.mockImplementation(() => {
      return chain({
        select: () =>
          chain({
            lte: () =>
              chain({
                not: () =>
                  chain({
                    maybeSingle: async () => Promise.resolve({ data: [], error: null }),
                  }),
              }),
          }),
      })
    })
    const res = await GET(request())
    const body = await res.json()
    expect(body.redacted).toEqual({ auth_sessions: 0, consent_records: 0 })
  })
})
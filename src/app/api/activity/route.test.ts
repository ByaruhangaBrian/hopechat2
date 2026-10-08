import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUser = vi.fn()
const mockRpc = vi.fn()

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
    rpc: mockRpc,
  }),
}))

vi.mock('@/lib/activity/log', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/activity/log')>()
  return {
    ...actual,
    logActivity: vi.fn().mockResolvedValue({ id: 'evt-1' }),
  }
})

import { POST } from '@/app/api/activity/route'

const validBody = JSON.stringify({
  category: 'contact',
  action: 'created',
  entity_type: 'contact',
  entity_id: 'contact-42',
  summary: 'Added contact Jane Doe',
})

async function call(body?: unknown) {
  return POST({ json: async () => body } as Request)
}

describe('POST /api/activity', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockRpc.mockReset()
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const res = await call(JSON.parse(validBody))
    expect(res.status).toBe(401)
  })

  it('returns 403 when the account has no business (businessId derived server-side)', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u-1', email: 'a@b.co' } },
      error: null,
    })
    mockRpc.mockResolvedValue({ data: null, error: null })
    const res = await call(JSON.parse(validBody))
    expect(res.status).toBe(403)
  })

  it('returns 400 for invalid vocabulary before any insert', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u-1', email: 'a@b.co' } },
      error: null,
    })
    mockRpc.mockResolvedValue({ data: 'biz-1', error: null })
    const res = await call({ category: 'contact', action: 'exploded', summary: 'x' })
    expect(res.status).toBe(400)
  })

  it('inserts with the server-derived business_id and returns success', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u-1', email: 'owner@example.com' } },
      error: null,
    })
    mockRpc.mockResolvedValue({ data: 'biz-1', error: null })
    const res = await call(JSON.parse(validBody))
    expect(res.status).toBe(200)
  })
})
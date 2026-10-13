import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUser = vi.fn()
const mockProfileMaybeSingle = vi.fn()
const mockGetBusinessSettings = vi.fn()
const mockUpdateBusinessSettings = vi.fn()

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
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: mockProfileMaybeSingle }),
      }),
    }),
  }),
}))

vi.mock('@/lib/tests/settings', () => ({
  getBusinessSettings: (...args: unknown[]) => mockGetBusinessSettings(...args),
  updateBusinessSettings: (...args: unknown[]) =>
    mockUpdateBusinessSettings(...args),
}))

import { GET, PUT } from '@/app/api/ai-escalation/route'

const VALID_BODY = {
  enabled: true,
  autoPauseAi: true,
  keywords: ['human', 'refund'],
  tagName: 'Needs human',
}

function put(body: unknown) {
  return PUT(
    new Request('http://localhost/api/ai-escalation', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  )
}

function resolveCaller() {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'u-1' } }, error: null })
  mockProfileMaybeSingle.mockResolvedValue({
    data: { business_id: 'biz-1' },
    error: null,
  })
}

describe('GET /api/ai-escalation', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockProfileMaybeSingle.mockReset()
    mockGetBusinessSettings.mockReset()
    mockUpdateBusinessSettings.mockReset()
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns 404 when the caller has no business', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u-1' } }, error: null })
    mockProfileMaybeSingle.mockResolvedValue({ data: null, error: null })
    const res = await GET()
    expect(res.status).toBe(404)
  })

  it('returns the normalized policy for the caller business', async () => {
    resolveCaller()
    mockGetBusinessSettings.mockResolvedValue({ escalation: VALID_BODY })
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.policy).toEqual(VALID_BODY)
    expect(mockGetBusinessSettings).toHaveBeenCalledWith('biz-1')
  })
})

describe('PUT /api/ai-escalation', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockProfileMaybeSingle.mockReset()
    mockGetBusinessSettings.mockReset()
    mockUpdateBusinessSettings.mockReset()
    resolveCaller()
    mockUpdateBusinessSettings.mockResolvedValue(undefined)
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const res = await put(VALID_BODY)
    expect(res.status).toBe(401)
  })

  it('rejects a non-boolean enabled', async () => {
    const res = await put({ ...VALID_BODY, enabled: 'yes' })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/enabled/)
    expect(mockUpdateBusinessSettings).not.toHaveBeenCalled()
  })

  it('rejects non-string keywords', async () => {
    const res = await put({ ...VALID_BODY, keywords: ['human', 5] })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/keyword/i)
  })

  it('rejects an empty tag name', async () => {
    const res = await put({ ...VALID_BODY, tagName: '   ' })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/tagName/)
  })

  it('normalizes and persists a valid policy via merge-write', async () => {
    const res = await put({ enabled: true, keywords: ['  Human ', 'human'] })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.policy.enabled).toBe(true)
    expect(body.policy.keywords).toEqual(['Human'])
    expect(body.policy.tagName).toBe('Needs human')
    expect(mockUpdateBusinessSettings).toHaveBeenCalledWith('biz-1', {
      escalation: body.policy,
    })
  })
})

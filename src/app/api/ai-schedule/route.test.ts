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

import { GET, PUT } from '@/app/api/ai-schedule/route'

const VALID_BODY = {
  enabled: true,
  timezone: 'UTC',
  days: { mon: { enabled: true, from: '09:00', to: '17:00' } },
}

function put(body: unknown) {
  return PUT(
    new Request('http://localhost/api/ai-schedule', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  )
}

describe('GET /api/ai-schedule', () => {
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

  it('returns the normalized schedule for the caller business', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u-1' } }, error: null })
    mockProfileMaybeSingle.mockResolvedValue({
      data: { business_id: 'biz-1' },
      error: null,
    })
    mockGetBusinessSettings.mockResolvedValue({ ai_schedule: VALID_BODY })
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.schedule).toEqual(VALID_BODY)
    expect(mockGetBusinessSettings).toHaveBeenCalledWith('biz-1')
  })
})

describe('PUT /api/ai-schedule', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockProfileMaybeSingle.mockReset()
    mockGetBusinessSettings.mockReset()
    mockUpdateBusinessSettings.mockReset()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u-1' } }, error: null })
    mockProfileMaybeSingle.mockResolvedValue({
      data: { business_id: 'biz-1' },
      error: null,
    })
    mockUpdateBusinessSettings.mockResolvedValue(undefined)
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const res = await put(VALID_BODY)
    expect(res.status).toBe(401)
  })

  it('rejects an invalid time', async () => {
    const res = await put({
      enabled: true,
      timezone: 'UTC',
      days: { mon: { enabled: true, from: '25:00', to: '17:00' } },
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/from/)
    expect(mockUpdateBusinessSettings).not.toHaveBeenCalled()
  })

  it('rejects an unknown weekday', async () => {
    const res = await put({
      enabled: true,
      timezone: 'UTC',
      days: { funday: { enabled: true, from: '09:00', to: '17:00' } },
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/weekday/i)
  })

  it('rejects an invalid timezone', async () => {
    const res = await put({ ...VALID_BODY, timezone: 'Not/AZone' })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/timezone/)
  })

  it('normalizes and persists a valid schedule via merge-write', async () => {
    const res = await put({ enabled: true, timezone: 'UTC' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.schedule.enabled).toBe(true)
    expect(body.schedule.days.mon).toEqual({
      enabled: true,
      from: '08:00',
      to: '18:00',
    })
    expect(mockUpdateBusinessSettings).toHaveBeenCalledWith('biz-1', {
      ai_schedule: body.schedule,
    })
  })
})

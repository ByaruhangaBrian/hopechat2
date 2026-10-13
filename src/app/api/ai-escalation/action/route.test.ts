import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUser = vi.fn()
const mockProfileMaybeSingle = vi.fn()
const mockGetBusinessSettings = vi.fn()
const mockRemoveReservedTag = vi.fn()
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
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: mockProfileMaybeSingle }),
      }),
    }),
  }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: mockFrom }),
}))

vi.mock('@/lib/tests/settings', () => ({
  getBusinessSettings: (...args: unknown[]) => mockGetBusinessSettings(...args),
}))

vi.mock('@/lib/ai/escalation', () => ({
  removeReservedTag: (...args: unknown[]) => mockRemoveReservedTag(...args),
}))

import { POST } from '@/app/api/ai-escalation/action/route'

/** A thenable, chainable query stub that resolves to `result`. */
function node(result: unknown) {
  const self: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'order', 'limit', 'update', 'delete', 'insert']) {
    self[method] = vi.fn(() => self)
  }
  self.maybeSingle = vi.fn(() => Promise.resolve(result))
  self.single = vi.fn(() => Promise.resolve(result))
  self.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve(result).then(resolve)
  return self
}

function post(body: unknown) {
  return POST(
    new Request('http://localhost/api/ai-escalation/action', {
      method: 'POST',
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

describe('POST /api/ai-escalation/action', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockProfileMaybeSingle.mockReset()
    mockGetBusinessSettings.mockReset()
    mockRemoveReservedTag.mockReset()
    mockFrom.mockReset()
    mockGetBusinessSettings.mockResolvedValue({
      escalation: { enabled: true, autoPauseAi: true, keywords: [], tagName: 'Needs human' },
    })
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const res = await post({ conversationId: 'c-1', action: 'resolve' })
    expect(res.status).toBe(401)
  })

  it('returns 404 when the caller has no business', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u-1' } }, error: null })
    mockProfileMaybeSingle.mockResolvedValue({ data: null, error: null })
    const res = await post({ conversationId: 'c-1', action: 'resolve' })
    expect(res.status).toBe(404)
  })

  it('rejects a missing conversationId', async () => {
    resolveCaller()
    const res = await post({ action: 'resolve' })
    expect(res.status).toBe(400)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('rejects an unknown action', async () => {
    resolveCaller()
    const res = await post({ conversationId: 'c-1', action: 'nope' })
    expect(res.status).toBe(400)
  })

  it('returns 404 when the conversation is not in the business', async () => {
    resolveCaller()
    mockFrom.mockReturnValueOnce(node({ data: null, error: null }))
    const res = await post({ conversationId: 'c-1', action: 'resolve' })
    expect(res.status).toBe(404)
  })

  it('removes the reserved tag on return_to_ai when no other escalation remains', async () => {
    resolveCaller()
    mockFrom
      .mockReturnValueOnce(node({ data: { id: 'c-1', contact_id: 'ct-1', escalated: true }, error: null }))
      .mockReturnValueOnce(node({ error: null }))
      .mockReturnValueOnce(node({ count: 0 }))

    const res = await post({ conversationId: 'c-1', action: 'return_to_ai' })
    expect(res.status).toBe(200)
    expect(mockRemoveReservedTag).toHaveBeenCalledTimes(1)
    const [, args] = mockRemoveReservedTag.mock.calls[0] as [unknown, { tagName: string }]
    expect(args).toMatchObject({ businessId: 'biz-1', contactId: 'ct-1', tagName: 'Needs human' })
  })

  it('keeps the tag when another conversation for the contact is still escalated', async () => {
    resolveCaller()
    mockFrom
      .mockReturnValueOnce(node({ data: { id: 'c-1', contact_id: 'ct-1', escalated: true }, error: null }))
      .mockReturnValueOnce(node({ error: null }))
      .mockReturnValueOnce(node({ count: 1 }))

    const res = await post({ conversationId: 'c-1', action: 'resolve' })
    expect(res.status).toBe(200)
    expect(mockRemoveReservedTag).not.toHaveBeenCalled()
  })
})

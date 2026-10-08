import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockInsert = vi.fn()
vi.mock('@/lib/automations/admin-client', () => ({
  supabaseAdmin: () => ({
    from: () => ({
      insert: mockInsert,
    }),
  }),
}))

import {
  ActivityValidationError,
  EVENT_VOCABULARY,
  isActionAllowed,
  logActivity,
  validateActivityInput,
} from '@/lib/activity/log'

const validInput = {
  businessId: '00000000-0000-4000-8000-000000000000',
  actorUserId: 'user-1',
  actorLabel: 'owner@example.com',
  category: 'contact',
  action: 'created',
  entityType: 'contact',
  entityId: 'contact-42',
  summary: 'Added contact Jane Doe',
  metadata: { source: 'manual' },
}

describe('EVENT_VOCABULARY', () => {
  it('covers the wire points planned for Tasks 7/9/10', () => {
    expect(EVENT_VOCABULARY.auth).toContain('login')
    expect(EVENT_VOCABULARY.auth).toContain('logout')
    expect(EVENT_VOCABULARY.contact).toEqual(['created', 'updated', 'deleted'])
    expect(EVENT_VOCABULARY.pipeline).toContain('stage_moved')
    expect(EVENT_VOCABULARY.broadcast).toContain('sent')
    expect(EVENT_VOCABULARY.settings).toEqual(['updated'])
  })
})

describe('isActionAllowed', () => {
  it('accepts known pairs', () => {
    expect(isActionAllowed('contact', 'updated')).toBe(true)
  })

  it('rejects unknown categories and actions', () => {
    expect(isActionAllowed('nope', 'updated')).toBe(false)
    expect(isActionAllowed('contact', 'exploded')).toBe(false)
  })
})

describe('validateActivityInput', () => {
  it('accepts a valid input', () => {
    expect(validateActivityInput(validInput)).toBeNull()
  })

  it('rejects bad category shapes', () => {
    expect(validateActivityInput({ ...validInput, category: 'Contact' })).toMatch(/category/)
    expect(validateActivityInput({ ...validInput, category: '' })).toMatch(/category/)
  })

  it('rejects an invalid category/action pair', () => {
    expect(validateActivityInput({ ...validInput, action: 'exploded' })).toMatch(/unknown/)
  })

  it('requires a non-empty summary within bounds', () => {
    expect(validateActivityInput({ ...validInput, summary: '   ' })).toMatch(/summary/)
    expect(validateActivityInput({ ...validInput, summary: 'x'.repeat(301) })).toMatch(/summary/)
  })

  it('rejects non-object metadata', () => {
    expect(validateActivityInput({ ...validInput, metadata: ['a'] as never })).toMatch(/metadata/)
  })
})

describe('logActivity', () => {
  beforeEach(() => {
    mockInsert.mockReset()
  })

  it('throws ActivityValidationError for invalid vocabulary (fail fast)', async () => {
    await expect(
      logActivity({ ...validInput, action: 'not_real' })
    ).rejects.toBeInstanceOf(ActivityValidationError)
  })

  it('inserts and returns the id on success', async () => {
    mockInsert.mockReturnValue({
      select: () => ({ single: async () => ({ data: { id: 'evt-1' }, error: null }) }),
    })

    const result = await logActivity(validInput)
    expect(result).toEqual({ id: 'evt-1' })

    const [insertion] = mockInsert.mock.calls[0]
    expect(insertion.business_id).toBe(validInput.businessId)
    expect(insertion.actor_user_id).toBe('user-1')
    expect(insertion.actor_label).toBe('owner@example.com')
    expect(insertion.summary).toBe('Added contact Jane Doe')
    expect(insertion.metadata).toEqual({ source: 'manual' })
  })

  it('resolves null (never throws) when the DB insert fails', async () => {
    mockInsert.mockReturnValue({
      select: () => ({ single: async () => ({ data: null, error: new Error('relation missing') }) }),
    })

    await expect(logActivity(validInput)).resolves.toBeNull()
  })
})
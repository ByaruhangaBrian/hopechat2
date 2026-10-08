import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFrom = vi.fn()

// A query-builder whose chain methods return the SAME object, so
// `.select().eq().maybeSingle()` resolves on the original row stub.
// Records `.eq()` filters so a table served with different rows per
// id value (e.g. system_settings: consent_gate vs legal_versions) works.
function chain(overrides: Record<string, unknown> = {}) {
  const base: Record<string, unknown> & { eqs?: Record<string, string> } = {
    eqs: {},
    eq: (col: string, val: string) => {
      if (base.eqs) base.eqs[col] = `${val}`
      return base
    },
    maybeSingle: async () => Promise.resolve({ data: null, error: null }),
    select: () => base,
  }
  return Object.assign(base, overrides)
}

// Rows per eq(id, X) filter; falls back to `default`.
function byId(rows: Record<string, unknown>, dflt: unknown) {
  return chain({
    maybeSingle: async function (this: unknown) {
      const ctx = this as { eqs?: Record<string, string> }
      const id = ctx.eqs?.id
      return Promise.resolve({ data: id ? rows[id] : dflt, error: null })
    },
  })
}

function row(data: unknown) {
  return chain({
    maybeSingle: async () => Promise.resolve({ data, error: null }),
  })
}

// Sets up table→row stubs left to right so later lookups (business) override
// earlier ones. Each table may be listed once.
function tables(rows: Record<string, unknown>) {
  mockFrom.mockImplementation((table: string) => {
    const r = rows[table]
    if (r === undefined) throw new Error(`unexpected table ${table}`)
    return r
  })
}

import { getConsentGateDecision } from '@/lib/consent/check'

const PROFILE = () => row({ business_id: 'biz-1' })
const NO_PROFILE = () => row(null)
const GATE_NOT_SET = () => byId({ consent_gate: { value: { enforce_from: null } } }, null)
const GATE_PAST = () => byId({ consent_gate: { value: { enforce_from: '2020-01-01T00:00:00Z' } } }, null)
const GATE_FUTURE = () => byId({ consent_gate: { value: { enforce_from: '2999-01-01T00:00:00Z' } } }, null)
const LEGAL = () =>
  byId(
    {
      consent_gate: { value: { enforce_from: '2020-01-01T00:00:00Z' } },
      legal_versions: { value: { terms_version: 2, privacy_version: 3 } },
    },
    null,
  )
const BUSINESS_SOFT = () => row({ consent_state: 'soft' })
const BUSINESS_REQUIRED = () => row({ consent_state: 'required' })
const RECORD = () => row({ id: 'rec-1' })
const NO_RECORD = () => row(null)

describe('getConsentGateDecision', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('returns ok when the user has no business yet', async () => {
    tables({ profiles: NO_PROFILE() })
    await expect(getConsentGateDecision({ from: mockFrom } as never, 'u-1')).resolves.toBe('ok')
  })

  it('returns ok before the cutoff (enforce_from null)', async () => {
    tables({ profiles: PROFILE(), system_settings: GATE_NOT_SET() })
    // No business/legal/consent lookups happen because the gate is off.
    await expect(getConsentGateDecision({ from: mockFrom } as never, 'u-1')).resolves.toBe('ok')
  })

  it('returns ok when the cutoff is still in the future', async () => {
    tables({ profiles: PROFILE(), system_settings: GATE_FUTURE() })
    await expect(getConsentGateDecision({ from: mockFrom } as never, 'u-1')).resolves.toBe('ok')
  })

  it('returns ok when the user has accepted current versions', async () => {
    tables({
      profiles: PROFILE(),
      businesses: BUSINESS_REQUIRED(),
      system_settings: LEGAL(),
      consent_records: RECORD(),
    })
    await expect(getConsentGateDecision({ from: mockFrom } as never, 'u-1')).resolves.toBe('ok')
  })

  it('returns blocked for a required business that has not accepted', async () => {
    tables({
      profiles: PROFILE(),
      businesses: BUSINESS_REQUIRED(),
      system_settings: LEGAL(),
      consent_records: NO_RECORD(),
    })
    await expect(getConsentGateDecision({ from: mockFrom } as never, 'u-1')).resolves.toBe('blocked')
  })

  it('returns soft for a soft business that has not accepted', async () => {
    tables({
      profiles: PROFILE(),
      businesses: BUSINESS_SOFT(),
      system_settings: LEGAL(),
      consent_records: NO_RECORD(),
    })
    await expect(getConsentGateDecision({ from: mockFrom } as never, 'u-1')).resolves.toBe('soft')
  })

  it('fails open to ok when a lookup errors', async () => {
    mockFrom.mockImplementation(() =>
      chain({
        maybeSingle: async () => Promise.resolve({ data: null, error: new Error('boom') }),
      }),
    )
    await expect(getConsentGateDecision({ from: mockFrom } as never, 'u-1')).resolves.toBe('ok')
  })
})
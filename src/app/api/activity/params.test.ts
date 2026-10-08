import { describe, expect, it } from 'vitest'
import {
  clampPage,
  clampPageSize,
  validCategory,
  parseIsoDate,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '@/app/api/activity/params'

describe('clampPage', () => {
  it('defaults to 1 for missing / invalid input', () => {
    expect(clampPage(null)).toBe(1)
    expect(clampPage('abc')).toBe(1)
    expect(clampPage('0')).toBe(1)
    expect(clampPage('-3')).toBe(1)
  })

  it('parses and floors positive integers', () => {
    expect(clampPage('2')).toBe(2)
    expect(clampPage('4.7')).toBe(4)
  })
})

describe('clampPageSize', () => {
  it('defaults to DEFAULT_PAGE_SIZE for missing / invalid input', () => {
    expect(clampPageSize(null)).toBe(DEFAULT_PAGE_SIZE)
    expect(clampPageSize('abc')).toBe(DEFAULT_PAGE_SIZE)
    expect(clampPageSize('0')).toBe(DEFAULT_PAGE_SIZE)
  })

  it('caps at MAX_PAGE_SIZE', () => {
    expect(clampPageSize('9999')).toBe(MAX_PAGE_SIZE)
  })

  it('keeps in-range values', () => {
    expect(clampPageSize('12')).toBe(12)
  })
})

describe('validCategory', () => {
  it('accepts vocabulary categories', () => {
    expect(validCategory('auth')).toBe('auth')
    expect(validCategory('contact')).toBe('contact')
    expect(validCategory('broadcast')).toBe('broadcast')
  })

  it('rejects unknown categories', () => {
    expect(validCategory('admin')).toBeNull()
    expect(validCategory(null)).toBeNull()
    expect(validCategory('')).toBeNull()
  })
})

describe('parseIsoDate', () => {
  it('returns an ISO string for parseable dates', () => {
    expect(parseIsoDate('2026-10-01')).toBe('2026-10-01T00:00:00.000Z')
    expect(parseIsoDate('2026-10-01T12:00:00Z')).toBe('2026-10-01T12:00:00.000Z')
  })

  it('returns null for unparseable dates', () => {
    expect(parseIsoDate('not-a-date')).toBeNull()
    expect(parseIsoDate(null)).toBeNull()
    expect(parseIsoDate('')).toBeNull()
  })
})
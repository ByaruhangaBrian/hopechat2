import { decrypt } from '@/lib/whatsapp/encryption'
import { supabaseAdmin } from '@/lib/automations/admin-client'
import { logHttpEvent } from '@/lib/logs/http-logs'

/**
 * Cal.com scheduling integration — API v2 client.
 *
 * The legacy v1 API was shut down on 2026-04-08, so everything here
 * targets `https://api.cal.com/v2` with `Authorization: Bearer <apiKey>`
 * and a `cal-api-version` header.
 *
 * Credentials are stored per business in `business_integrations`
 * (type = 'calcom'), with the API key encrypted under ENCRYPTION_KEY.
 * `username` is the Cal.com account handle used to derive booking
 * links; on connect we trust the value returned by GET /v2/me.
 */

export interface CalComConfig {
  api_key: string
  username: string
  api_base_url?: string
}

export interface CalProfile {
  id: number
  username: string | null
  email: string
  name: string | null
  timeZone: string
}

export interface CalEventType {
  id: number
  title: string
  slug: string
  lengthInMinutes: number
  hidden: boolean
  description: string | null
  bookingUrl: string | null
}

export const CALCOM_BASE_URL = 'https://api.cal.com/v2'
export const CALCOM_API_VERSION = '2026-06-12'
// Cal.com pins each endpoint's behavior to a specific `cal-api-version`
// release; using the documented value per endpoint avoids drift.
const CAL_VERSION_SLOTS = '2024-09-04'
const CAL_VERSION_BOOKINGS_LIST = '2026-05-01'
const CAL_VERSION_BOOKINGS_CREATE = '2026-02-25'
const CAL_VERSION_SCHEDULES = '2024-06-11'

const TAG = '[calcom]'

export class CalComNotConfiguredError extends Error {
  constructor(message = 'Cal.com integration is not configured. Add your API key in Settings > Integrations.') {
    super(message)
    this.name = 'CalComNotConfiguredError'
  }
}

export class CalComApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'CalComApiError'
    this.status = status
  }
}

function isEncrypted(value: string): boolean {
  return /^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/i.test(value)
}

/**
 * Encrypted secret detection — charge nothing / do nothing when the
 * stored key is plaintext (sanity check for the connect flow).
 */
export function isPlaintextCalApiKey(value: string): boolean {
  return /^cal(_live)?_/i.test(value)
}

export function parseProfile(raw: unknown): CalProfile {
  const d = (raw || {}) as Record<string, any>
  if (typeof d.id !== 'number' || typeof d.email !== 'string') {
    throw new Error('Unexpected Cal.com profile response')
  }
  return {
    id: d.id,
    username: typeof d.username === 'string' ? d.username : null,
    email: d.email,
    name: typeof d.name === 'string' ? d.name : null,
    timeZone: d.timeZone,
  }
}

export function parseEventType(raw: unknown): CalEventType {
  const d = (raw || {}) as Record<string, any>
  if (typeof d.id !== 'number' || typeof d.slug !== 'string') {
    throw new Error('Unexpected Cal.com event-type response')
  }
  return {
    id: d.id,
    title: typeof d.title === 'string' ? d.title : d.slug,
    slug: d.slug,
    lengthInMinutes: typeof d.lengthInMinutes === 'number' ? d.lengthInMinutes : 60,
    hidden: d.hidden === true,
    description: typeof d.description === 'string' ? d.description : null,
    bookingUrl: typeof d.bookingUrl === 'string' ? d.bookingUrl : null,
  }
}

/**
 * Absolute URL a booker can use for an event type. Cal.com returns the
 * canonical `bookingUrl` on the API; fall back to constructing it from
 * the account username + event slug.
 */
export function buildBookingLink(eventType: Pick<CalEventType, 'slug' | 'bookingUrl'>, username: string): string {
  if (eventType.bookingUrl) return eventType.bookingUrl
  return `https://cal.com/${username}/${eventType.slug}`
}

/**
 * Load + decrypt the stored Cal.com config for a business, falling back
 * to the global `calcom_global` system setting and then environment
 * variables (mirrors the Google Sheets loader).
 */
export async function getCalComConfig(businessId: string, opts: { allowEnvFallback?: boolean } = {}): Promise<CalComConfig> {
  const db = supabaseAdmin()

  const { data: integration, error: intErr } = await db
    .from('business_integrations')
    .select('config')
    .eq('business_id', businessId)
    .eq('type', 'calcom')
    .eq('is_enabled', true)
    .maybeSingle()

  if (intErr) {
    console.error(`${TAG} business_integrations query error:`, intErr.message)
  }

  let config = ((integration?.config as unknown as CalComConfig) || {}) as Record<string, any>

  if (!config.api_key || !config.username) {
    const { data: globalRow } = await db
      .from('system_settings')
      .select('value')
      .eq('id', 'calcom_global')
      .maybeSingle()

    const globalAccount = ((globalRow?.value as any)?.default_account || {}) as Record<string, any>
    config = {
      ...config,
      api_key: config.api_key || globalAccount.api_key || undefined,
      username: config.username || globalAccount.username || undefined,
    }
  }

  if ((!config.api_key || !config.username) && opts.allowEnvFallback !== false) {
    config = {
      ...config,
      api_key: config.api_key || process.env.CALCOM_API_KEY || undefined,
      username: config.username || process.env.CALCOM_USERNAME || undefined,
      api_base_url: process.env.CALCOM_BASE_URL,
    }
  }

  if (!config.api_key || !config.username) {
    const missing: string[] = []
    if (!config.api_key) missing.push('api_key')
    if (!config.username) missing.push('username')
    throw new CalComNotConfiguredError(
      `Cal.com integration is not fully configured. Missing: ${missing.join(', ')}`,
    )
  }

  let apiKey = config.api_key as string
  if (isEncrypted(apiKey)) {
    try {
      apiKey = decrypt(apiKey)
    } catch (decryptErr: any) {
      throw new Error(`Failed to decrypt Cal.com API key: ${decryptErr.message}`)
    }
  }

  return {
    api_key: apiKey,
    username: config.username as string,
    api_base_url: typeof config.api_base_url === 'string' ? config.api_base_url : undefined,
  }
}

async function calFetch(
  path: string,
  config: CalComConfig,
  init: RequestInit = {},
  businessId: string,
  calVersion: string = CALCOM_API_VERSION,
): Promise<any> {
  const base = (config.api_base_url?.trim() || CALCOM_BASE_URL).replace(/\/+$/, '')
  let p = path.trim()
  if (base.endsWith('/v2') && p.startsWith('/v2/')) p = p.slice(3)
  const url = `${base}/${p.replace(/^\//, '')}`

  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${config.api_key}`)
  headers.set('cal-api-version', calVersion)
  if (init.body) headers.set('Content-Type', 'application/json')

  let res: Response
  try {
    res = await fetch(url, {
      ...init,
      headers,
      signal: AbortSignal.timeout(15_000),
      cache: 'no-store',
    })
  } catch (err: any) {
    void logHttpEvent({ businessId, direction: 'system', service: 'calcom', endpoint: path, note: `network error: ${err.message}` })
    throw new CalComApiError(`Cal.com request failed: ${err.message}`, 502)
  }

  let body: any = null
  const raw = await res.text()
  try {
    body = raw ? JSON.parse(raw) : null
  } catch {
    body = null
  }

  void logHttpEvent({
    businessId,
    direction: 'system',
    service: 'calcom',
    endpoint: path,
    payload: { method: init.method || 'GET', status: res.status },
    note: `${init.method || 'GET'} ${path} -> ${res.status}`,
  })

  if (!res.ok) {
    const detail =
      body?.error?.message ||
      (body?.error && typeof body.error === 'string' && body.error) ||
      body?.message ||
      res.statusText ||
      'Unknown Cal.com error'
    throw new CalComApiError(`Cal.com API error (${res.status}): ${detail}`, res.status)
  }

  return body
}

/**
 * Validate a connection and return the linked Cal.com profile.
 * The returned `username` is authoritative for building booking links.
 */
export async function testConnection(businessId: string): Promise<CalProfile> {
  const config = await getCalComConfig(businessId)
  const body = await calFetch('/v2/me', config, {}, businessId)
  return parseProfile(body?.data)
}

/**
 * Validate a raw (plaintext, not-yet-stored) API key against Cal.com so the
 * connect flow can reject bad credentials before persisting them. Useful
 * ergonomics: returns the authoritative username for the account.
 */
export async function testConnectionWithKey(
  apiKey: string,
  businessId: string,
  apiBaseUrl?: string,
): Promise<CalProfile> {
  const config: CalComConfig = {
    api_key: apiKey,
    username: '',
    api_base_url: apiBaseUrl,
  }
  const body = await calFetch('/v2/me', config, {}, businessId)
  return parseProfile(body?.data)
}

export async function getEventTypes(businessId: string): Promise<CalEventType[]> {
  const config = await getCalComConfig(businessId)
  const body = await calFetch('/v2/event-types', config, {}, businessId)
  const list = Array.isArray(body?.data) ? body.data : []
  return list.map(parseEventType)
}

export function setEventTypeHidden(businessId: string, eventTypeId: number, hidden: boolean): Promise<CalEventType> {
  return updateEventType(businessId, eventTypeId, { hidden })
}

export async function updateEventType(businessId: string, eventTypeId: number, body: Record<string, unknown>): Promise<CalEventType> {
  const config = await getCalComConfig(businessId)
  const response = await calFetch(
    `/v2/event-types/${eventTypeId}`,
    config,
    { method: 'PATCH', body: JSON.stringify(body) },
    businessId,
  )
  return parseEventType(response?.data)
}

/** One availability window in a Cal.com schedule. Day names are full names ('Monday' … 'Sunday'). */
export interface CalAvailabilityWindow {
  days: string[]
  startTime: string
  endTime: string
}

export interface CalSchedule {
  id: number
  name: string
  timeZone: string
  isDefault: boolean
  availability: CalAvailabilityWindow[]
}

const WEEKDAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

export type CalWeekday = (typeof WEEKDAY_NAMES)[number]

const isWeekdayName = (value: unknown): value is CalWeekday =>
  typeof value === 'string' && (WEEKDAY_NAMES as readonly string[]).includes(value)

/** Parse a v2 ScheduleOutput into a normalized schedule. */
export function parseSchedule(raw: unknown): CalSchedule {
  const d = (raw || {}) as Record<string, any>
  if (typeof d.id !== 'number') {
    throw new Error('Unexpected Cal.com schedule response')
  }
  const availability: CalAvailabilityWindow[] = Array.isArray(d.availability)
    ? d.availability
        .map((a: any) => ({
          days: Array.isArray(a?.days) ? a.days.filter((day: unknown) => isWeekdayName(day)) : [],
          startTime: typeof a?.startTime === 'string' ? a.startTime : '09:00',
          endTime: typeof a?.endTime === 'string' ? a.endTime : '17:00',
        }))
        .filter((a: CalAvailabilityWindow) => a.days.length > 0)
    : []
  return {
    id: d.id,
    name: typeof d.name === 'string' ? d.name : 'Default',
    timeZone: typeof d.timeZone === 'string' ? d.timeZone : 'UTC',
    isDefault: d.isDefault === true,
    availability,
  }
}

/**
 * Load the account's default schedule (falls back to the first schedule).
 * If the link is disconnected we still return an object with empty slots so
 * the UI can show the account has no usable schedule.
 */
export async function getDefaultSchedule(
  businessId: string,
  opts: { fallbackEmpty?: boolean } = {},
): Promise<CalSchedule | null> {
  let config: CalComConfig
  try {
    config = await getCalComConfig(businessId)
  } catch (err) {
    if (opts.fallbackEmpty && err instanceof CalComNotConfiguredError) {
      return {
        id: 0,
        name: 'Default',
        timeZone: '',
        isDefault: true,
        availability: [],
      }
    }
    throw err
  }

  const body = await calFetch('/v2/schedules', config, {}, businessId, CAL_VERSION_SCHEDULES)
  const list = Array.isArray(body?.data) ? body.data : []
  const defaultOrFirst = list.find((s: any) => s?.isDefault === true) || list[0] || null
  if (!defaultOrFirst) {
    if (opts.fallbackEmpty) {
      return {
        id: 0,
        name: 'Default',
        timeZone: '',
        isDefault: true,
        availability: [],
      }
    }
    throw new CalComApiError('Cal.com returned no schedules. Create one on cal.com and retry.', 404)
  }
  return parseSchedule(defaultOrFirst)
}

/**
 * Update a schedule's availability windows. Sends the whole slot set —
 * Cal.com replaces the schedule's availability with the payload sent.
 */
export async function updateSchedule(
  businessId: string,
  scheduleId: number,
  input: { name?: string; timeZone?: string; availability: CalAvailabilityWindow[] },
): Promise<CalSchedule> {
  const config = await getCalComConfig(businessId)
  const body = await calFetch(
    `/v2/schedules/${scheduleId}`,
    config,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
    businessId,
    CAL_VERSION_SCHEDULES,
  )
  return parseSchedule(body?.data)
}

/**
 * Convenience: replace the default schedule's weekly availability. Merges
 * windows sharing the same times across days.
 */
export async function setDefaultWeekAvailability(
  businessId: string,
  windows: Array<{ day: CalWeekday; startTime: string; endTime: string } | null>,
  timeZone?: string,
): Promise<CalSchedule> {
  const schedule = await getDefaultSchedule(businessId)
  if (!schedule || !schedule.id) {
    throw new CalComApiError(
      'No Cal.com schedule to update. Create one on cal.com first.',
      404,
    )
  }

  const byTimes = new Map<string, { startTime: string; endTime: string; days: CalWeekday[] }>()
  for (const entry of windows) {
    if (!entry) continue
    const key = `${entry.startTime}-${entry.endTime}`
    const existing = byTimes.get(key)
    if (existing) {
      existing.days.push(entry.day)
    } else {
      byTimes.set(key, { startTime: entry.startTime, endTime: entry.endTime, days: [entry.day] })
    }
  }

  const availability: CalAvailabilityWindow[] = [...byTimes.values()].map((w) => ({
    days: w.days,
    startTime: w.startTime,
    endTime: w.endTime,
  }))

  return updateSchedule(businessId, schedule.id, {
    timeZone: timeZone || schedule.timeZone || undefined,
    availability,
  })
}

export interface CalAttendee {
  name: string
  email: string
  timeZone: string
  language?: string
}

export interface CalBooking {
  id: number
  uid: string
  title: string
  status: 'booked' | 'rescheduled' | 'cancelled'
  start: string | null
  end: string | null
  eventTypeId: number | null
  eventTypeSlug: string | null
  attendeeName: string | null
  attendeeEmail: string | null
  raw: unknown
}

/** Map a v2 BookingOutput (+ webhook-shaped) payload to a normalized booking. */
export function parseBooking(raw: unknown): CalBooking {
  const d = (raw || {}) as Record<string, any>
  if (typeof d.uid !== 'string' || !d.uid) {
    throw new Error('Unexpected Cal.com booking response (missing uid)')
  }

  const calStatus = typeof d.status === 'string' ? d.status.toLowerCase() : ''
  let status: CalBooking['status'] = 'booked'
  if (calStatus === 'cancelled' || calStatus === 'rejected') status = 'cancelled'
  else if (typeof d.rescheduledFromUid === 'string') status = 'rescheduled'

  const eventType = (d.eventType || {}) as Record<string, unknown>
  const attendees = Array.isArray(d.attendees) ? (d.attendees as Array<Record<string, unknown>>) : []
  const attendee = attendees[0] || {}

  return {
    id: typeof d.id === 'number' ? d.id : 0,
    uid: d.uid,
    title: typeof d.title === 'string' ? d.title : 'Appointment',
    status,
    start: asIsoStr(d.start),
    end: asIsoStr(d.end),
    eventTypeId: typeof eventType.id === 'number' ? eventType.id : typeof d.eventTypeId === 'number' ? d.eventTypeId : null,
    eventTypeSlug: typeof eventType.slug === 'string' ? eventType.slug : null,
    attendeeName: typeof attendee.name === 'string' ? attendee.name : null,
    attendeeEmail: typeof attendee.email === 'string' ? attendee.email : null,
    raw,
  }
}

function asIsoStr(value: unknown): string | null {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null
}

/**
 * List bookings for the authenticated Cal.com account. Omitting `status`
 * walks all statuses from most recent backwards (cursor paginated).
 */
export async function listBookings(
  businessId: string,
  opts: {
    status?: 'upcoming' | 'recurring' | 'past' | 'cancelled' | 'unconfirmed'
    afterStart?: string
    beforeEnd?: string
    limit?: number
  } = {},
): Promise<CalBooking[]> {
  const config = await getCalComConfig(businessId)

  const params = new URLSearchParams()
  if (opts.status) params.set('status', opts.status)
  if (opts.afterStart) params.set('afterStart', opts.afterStart)
  if (opts.beforeEnd) params.set('beforeEnd', opts.beforeEnd)
  params.set('limit', String(Math.min(Math.max(opts.limit ?? 100, 1), 100)))

  const qs = params.toString()
  const body = await calFetch(
    `/v2/bookings${qs ? `?${qs}` : ''}`,
    config,
    {},
    businessId,
    CAL_VERSION_BOOKINGS_LIST,
  )
  const list = Array.isArray(body?.data) ? body.data : []
  return list.map((item: unknown) => parseBooking(item))
}

/** Available start times (UTC ISO strings) for an event type in a range. */
export async function getSlots(
  businessId: string,
  input: { eventTypeId: number; start: string; end: string; timeZone?: string },
): Promise<string[]> {
  const config = await getCalComConfig(businessId)

  const params = new URLSearchParams()
  params.set('eventTypeId', String(input.eventTypeId))
  params.set('start', input.start)
  params.set('end', input.end)
  if (input.timeZone) params.set('timeZone', input.timeZone)

  const body = await calFetch(`/v2/slots?${params.toString()}`, config, {}, businessId, CAL_VERSION_SLOTS)
  const slotsByDay = (body?.data?.slots || {}) as Record<string, Array<Record<string, unknown>>>

  const starts = new Set<string>()
  for (const day of Object.values(slotsByDay)) {
    if (!Array.isArray(day)) continue
    for (const slot of day) {
      if (typeof slot?.start === 'string') starts.add(slot.start)
    }
  }
  return [...starts].sort()
}

/** Create a booking on the customer's behalf (Cal.com API v2). */
export async function createBooking(
  businessId: string,
  input: { eventTypeId: number; start: string; attendee: CalAttendee },
): Promise<CalBooking> {
  const config = await getCalComConfig(businessId)

  const body = await calFetch(
    '/v2/bookings',
    config,
    {
      method: 'POST',
      body: JSON.stringify({
        eventTypeId: input.eventTypeId,
        start: input.start,
        attendee: {
          name: input.attendee.name,
          email: input.attendee.email,
          timeZone: input.attendee.timeZone,
          ...(input.attendee.language ? { language: input.attendee.language } : {}),
        },
      }),
    },
    businessId,
    CAL_VERSION_BOOKINGS_CREATE,
  )
  return parseBooking(body?.data)
}

/** Upsert normalized bookings into `cal_bookings` (same shape the webhook writes). */
export async function upsertCalBookings(businessId: string, bookings: CalBooking[]): Promise<number> {
  if (bookings.length === 0) return 0
  const db = supabaseAdmin()

  const { count, error } = await db
    .from('cal_bookings')
    .upsert(
      bookings.map((b) => ({
        business_id: businessId,
        cal_uid: b.uid,
        cal_booking_id: b.id || null,
        cal_event_type_id: b.eventTypeId,
        event_title: b.title,
        start_time: b.start,
        end_time: b.end,
        attendee_name: b.attendeeName,
        attendee_email: b.attendeeEmail,
        status: b.status,
        raw: b.raw,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'business_id, cal_uid' },
    )

  if (error) {
    throw new Error(`Failed to write Cal.com bookings: ${error.message}`)
  }
  return count ?? bookings.length
}

/** Pull recent bookings from Cal.com and mirror them into `cal_bookings`. */
export async function syncCalBookings(businessId: string): Promise<{ synced: number }> {
  const bookings = await listBookings(businessId)
  const synced = await upsertCalBookings(businessId, bookings)
  return { synced }
}
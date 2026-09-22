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
): Promise<any> {
  const base = (config.api_base_url?.trim() || CALCOM_BASE_URL).replace(/\/+$/, '')
  let p = path.trim()
  if (base.endsWith('/v2') && p.startsWith('/v2/')) p = p.slice(3)
  const url = `${base}/${p.replace(/^\//, '')}`

  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${config.api_key}`)
  headers.set('cal-api-version', CALCOM_API_VERSION)
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
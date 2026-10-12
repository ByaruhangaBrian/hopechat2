export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export interface AiAvailabilityWindow {
  /** Whether this weekday's window applies at all. */
  enabled: boolean
  /** Window start, "HH:mm" (24-hour), inclusive. */
  from: string
  /** Window end, "HH:mm" (24-hour), exclusive. */
  to: string
}

export interface AiSchedule {
  /**
   * Master switch. When false the AI is available at all hours, and every
   * other field is ignored. This is the default so existing businesses keep
   * replying 24/7.
   */
  enabled: boolean
  /** IANA timezone the windows are interpreted in, e.g. "Africa/Kampala". */
  timezone: string
  days: Record<Weekday, AiAvailabilityWindow>
}

export const WEEKDAYS: readonly Weekday[] = [
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'sun',
]

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
}

export const DEFAULT_TIMEZONE = 'Africa/Kampala'
export const DEFAULT_WINDOW_FROM = '08:00'
export const DEFAULT_WINDOW_TO = '18:00'

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

/** True when `value` is a valid 24-hour "HH:mm" string. */
export function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && TIME_PATTERN.test(value)
}

/** True when `value` is a timezone Intl can resolve. */
export function isValidTimezone(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value })
    return true
  } catch {
    return false
  }
}

function minutesOf(time: string): number {
  const [hours, minutes] = time.split(':')
  return Number(hours) * 60 + Number(minutes)
}

function defaultWindow(): AiAvailabilityWindow {
  return {
    enabled: true,
    from: DEFAULT_WINDOW_FROM,
    to: DEFAULT_WINDOW_TO,
  }
}

function normalizeWindow(raw: unknown): AiAvailabilityWindow {
  const source =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    enabled: source.enabled === undefined ? true : source.enabled === true,
    from: isValidTime(source.from) ? source.from : DEFAULT_WINDOW_FROM,
    to: isValidTime(source.to) ? source.to : DEFAULT_WINDOW_TO,
  }
}

export const DEFAULT_AI_SCHEDULE: AiSchedule = {
  enabled: false,
  timezone: DEFAULT_TIMEZONE,
  days: WEEKDAYS.reduce((acc, day) => {
    acc[day] = defaultWindow()
    return acc
  }, {} as Record<Weekday, AiAvailabilityWindow>),
}

/**
 * Coerce arbitrary stored JSON into a well-formed {@link AiSchedule}.
 * Missing or malformed fields fall back to sensible defaults.
 */
export function normalizeAiSchedule(raw: unknown): AiSchedule {
  const source =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const daysSource =
    source.days && typeof source.days === 'object'
      ? (source.days as Record<string, unknown>)
      : {}

  const days = WEEKDAYS.reduce((acc, day) => {
    acc[day] = normalizeWindow(daysSource[day])
    return acc
  }, {} as Record<Weekday, AiAvailabilityWindow>)

  return {
    enabled: source.enabled === true,
    timezone: isValidTimezone(source.timezone)
      ? source.timezone
      : DEFAULT_TIMEZONE,
    days,
  }
}

const WEEKDAY_BY_SHORT: Record<string, Weekday> = {
  mon: 'mon',
  tue: 'tue',
  wed: 'wed',
  thu: 'thu',
  fri: 'fri',
  sat: 'sat',
  sun: 'sun',
}

function zonedNow(now: Date, timezone: string): { day: Weekday; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)

  let weekday = 'mon'
  let hour = 0
  let minute = 0
  for (const part of parts) {
    if (part.type === 'weekday') weekday = part.value.toLowerCase()
    else if (part.type === 'hour') hour = Number(part.value)
    else if (part.type === 'minute') minute = Number(part.value)
  }

  return {
    day: WEEKDAY_BY_SHORT[weekday] ?? 'mon',
    minutes: hour * 60 + minute,
  }
}

/**
 * True when `minutes` falls inside a single day's window. Overnight windows
 * (`from > to`, e.g. 22:00–06:00) count both the evening and early-morning
 * sides of the window. `from === to` is treated as a full-day window.
 */
function windowContains(window: AiAvailabilityWindow, minutes: number): boolean {
  if (!window.enabled) return false
  const from = minutesOf(window.from)
  const to = minutesOf(window.to)
  if (!Number.isFinite(from) || !Number.isFinite(to)) return false
  if (from === to) return true
  if (from < to) return minutes >= from && minutes < to
  return minutes >= from || minutes < to
}

/**
 * Decide whether the AI is allowed to reply right now.
 *
 * Fails **open** (returns true) on unexpected errors so a scheduling bug can
 * never silently stop a business from answering its customers.
 */
export function isWithinAiSchedule(now: Date, schedule: AiSchedule): boolean {
  if (!schedule?.enabled) return true

  try {
    const { day, minutes } = zonedNow(now, schedule.timezone)

    if (windowContains(schedule.days[day], minutes)) return true

    // A window that wraps past midnight also covers the early hours of the
    // *next* day — check the previous day's tail.
    const todayIndex = WEEKDAYS.indexOf(day)
    const previousDay = WEEKDAYS[(todayIndex + WEEKDAYS.length - 1) % WEEKDAYS.length]
    const previous = schedule.days[previousDay]
    if (previous?.enabled) {
      const from = minutesOf(previous.from)
      const to = minutesOf(previous.to)
      if (
        Number.isFinite(from) &&
        Number.isFinite(to) &&
        from > to &&
        minutes < to
      ) {
        return true
      }
    }

    return false
  } catch {
    return true
  }
}

export type AiScheduleValidation =
  | { ok: true; value: AiSchedule }
  | { ok: false; error: string }

/**
 * Strict validator for user-submitted schedules (API boundary). Unlike
 * {@link normalizeAiSchedule} it rejects unknown weekdays and malformed times
 * instead of silently coercing them, then returns a normalized value.
 */
export function validateAiSchedule(raw: unknown): AiScheduleValidation {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Schedule must be an object' }
  }

  const source = raw as Record<string, unknown>

  if (source.enabled !== undefined && typeof source.enabled !== 'boolean') {
    return { ok: false, error: '"enabled" must be a boolean' }
  }

  if (source.timezone !== undefined && !isValidTimezone(source.timezone)) {
    return { ok: false, error: '"timezone" must be a valid IANA timezone' }
  }

  if (source.days !== undefined) {
    if (!source.days || typeof source.days !== 'object') {
      return { ok: false, error: '"days" must be an object' }
    }

    const days = source.days as Record<string, unknown>
    for (const key of Object.keys(days)) {
      if (!(WEEKDAYS as readonly string[]).includes(key)) {
        return { ok: false, error: `Unknown weekday "${key}"` }
      }
      const window = days[key]
      if (!window || typeof window !== 'object') {
        return { ok: false, error: `"${key}" must be an object` }
      }
      const w = window as Record<string, unknown>
      if (w.enabled !== undefined && typeof w.enabled !== 'boolean') {
        return { ok: false, error: `"${key}.enabled" must be a boolean` }
      }
      if (w.from !== undefined && !isValidTime(w.from)) {
        return { ok: false, error: `"${key}.from" must be an HH:mm time` }
      }
      if (w.to !== undefined && !isValidTime(w.to)) {
        return { ok: false, error: `"${key}.to" must be an HH:mm time` }
      }
    }
  }

  return { ok: true, value: normalizeAiSchedule(source) }
}

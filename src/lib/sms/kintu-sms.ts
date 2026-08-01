import { supabaseAdmin } from '@/lib/automations/admin-client'

/**
 * SMS provider settings, stored in the `sms_settings` system setting.
 * Configured by super admins in Admin Settings → SMS.
 */
export interface SmsSettings {
  url: string
  username: string
  password: string
  sender: string
  enabled: boolean
}

const SMS_SETTINGS_ID = 'sms_settings'

/**
 * Read the current SMS provider configuration. Returns null when no
 * configuration row exists yet.
 */
export async function getSmsSettings(): Promise<SmsSettings | null> {
  const db = supabaseAdmin()
  const { data } = await db
    .from('system_settings')
    .select('value')
    .eq('id', SMS_SETTINGS_ID)
    .maybeSingle()

  if (!data?.value) return null

  return {
    url: data.value.url ?? '',
    username: data.value.username ?? '',
    password: data.value.password ?? '',
    sender: data.value.sender ?? '',
    enabled: data.value.enabled ?? true,
  }
}

/**
 * Normalize a phone number into the international format KintuSMS
 * expects (Uganda, 256-prefixed). Handles the two common local shapes:
 *   "0705635395"  (10 digits, trunk 0)  → "256705635395"
 *   "256773928351" (12 digits)          → unchanged
 * Returns null when the number can't be interpreted as a Ugandan line.
 */
export function normalizeUgPhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10 && digits.startsWith('0')) {
    return '256' + digits.slice(1)
  }
  if (digits.length === 12 && digits.startsWith('256')) {
    return digits
  }
  if (digits.length === 9 && digits.startsWith('7')) {
    return '256' + digits
  }
  return null
}

export interface KintuSmsResult {
  ok: boolean
  raw: string
}

/**
 * Send a message to a list of (already normalized) recipients via the
 * configured KintuSMS gateway. Recipients are comma-separated in a
 * single call. Success is signalled by the gateway's `1701` code in the
 * text response.
 */
export async function sendKintuSms(
  settings: SmsSettings,
  recipients: string[],
  message: string,
): Promise<KintuSmsResult> {
  const params = new URLSearchParams({
    user: settings.username,
    password: settings.password,
    sender: settings.sender,
    recipient: recipients.join(','),
    message,
  })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)
  let response: Response
  try {
    response = await fetch(`${settings.url}?${params.toString()}`, {
      method: 'GET',
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }

  const raw = await response.text()
  return { ok: raw.includes('1701'), raw }
}

import crypto from 'node:crypto'
import { supabaseAdmin } from '@/lib/automations/admin-client'

/**
 * Verify the HMAC-SHA256 signature Cal.com attaches to webhook POSTs.
 *
 * Cal.com signs the raw request body with your webhook secret and sends
 * the result in the `X-Cal-Signature-256: sha256=<hex>` header. Without
 * verification, anyone who knows our webhook URL could POST fabricated
 * booking events and drift the `cal_bookings` table arbitrarily.
 */
export async function verifyCalComWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): Promise<boolean> {
  const secret = await resolveCalComWebhookSecret()
  if (!secret) {
    console.error(
      '[calcom webhook] No webhook secret configured (CALCOM_WEBHOOK_SECRET or system setting "calcom_global"). Rejecting request.',
    )
    return false
  }
  return verifyCalComSignature(rawBody, signatureHeader, secret)
}

/** Pure HMAC check — fail closed, constant-time compare. */
export function verifyCalComSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader) return false
  if (!signatureHeader.toLowerCase().startsWith('sha256=')) return false

  const expected =
    'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex')

  const a = Buffer.from(signatureHeader)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

async function resolveCalComWebhookSecret(): Promise<string | null> {
  const fromEnv = process.env.CALCOM_WEBHOOK_SECRET
  if (fromEnv) return fromEnv

  try {
    const { data } = await supabaseAdmin()
      .from('system_settings')
      .select('value')
      .eq('id', 'calcom_global')
      .maybeSingle()
    const value = data?.value as unknown
    if (typeof value !== 'object' || value === null) return null
    const secret = (value as Record<string, unknown>).webhook_secret
    return typeof secret === 'string' && secret ? secret : null
  } catch (err) {
    console.error('[calcom webhook] Failed to read calcom_global webhook secret:', err)
    return null
  }
}
import { NextResponse } from 'next/server'
import { resolveBusinessId } from '@/lib/business-context'
import { encrypt } from '@/lib/whatsapp/encryption'
import {
  CalComApiError,
  getEventTypes,
  testConnectionWithKey,
} from '@/lib/integrations/calcom'
import { getCalcomManager, maskApiKey, NO_CACHE } from './helpers'

export async function GET() {
  try {
    const { admin, effectiveBusinessId, error } = await resolveBusinessId()
    if (error) return error

    const { data: integration } = await admin
      .from('business_integrations')
      .select('config')
      .eq('business_id', effectiveBusinessId)
      .eq('type', 'calcom')
      .maybeSingle()

    const config = (integration?.config || {}) as Record<string, unknown>
    const apiKey = typeof config.api_key === 'string' ? config.api_key : ''
    const username = typeof config.username === 'string' ? config.username : ''
    const configured = Boolean(apiKey && username)

    let event_types: unknown[] | null = null
    if (configured) {
      try {
        event_types = await getEventTypes(effectiveBusinessId)
      } catch (err: unknown) {
        console.error('[calcom] GET event_types error:', err instanceof Error ? err.message : err)
        event_types = null
      }
    }

    return NextResponse.json(
      {
        configured,
        api_key_masked: apiKey ? maskApiKey(apiKey) : null,
        username,
        event_types,
      },
      { headers: NO_CACHE },
    )
  } catch (err) {
    console.error('[calcom] GET failed:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const guard = await getCalcomManager()
    if (guard.error) return guard.error

    const { admin, effectiveBusinessId, error } = await resolveBusinessId()
    if (error) return error

    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

    const apiKeyInput = typeof body.api_key === 'string' ? body.api_key.trim() : ''
    const usernameInput = typeof body.username === 'string' ? body.username.trim() : ''

    if (!apiKeyInput && !usernameInput) {
      return NextResponse.json({ error: 'Provide an API key or a username to update' }, { status: 400 })
    }

    const { data: existing } = await admin
      .from('business_integrations')
      .select('config')
      .eq('business_id', effectiveBusinessId)
      .eq('type', 'calcom')
      .maybeSingle()

    const existingConfig = (existing?.config || {}) as Record<string, unknown>
    const storedKey = typeof existingConfig.api_key === 'string' ? existingConfig.api_key : ''

    if (apiKeyInput && !/^cal(_live)?_/i.test(apiKeyInput)) {
      return NextResponse.json(
        { error: 'That does not look like a Cal.com API key. Keys start with "cal_" (test) or "cal_live_" (live).' },
        { status: 400 },
      )
    }

    // Validate any newly-supplied key before persisting anything.
    let authoritativeUsername = usernameInput || (typeof existingConfig.username === 'string' ? existingConfig.username : '')
    if (apiKeyInput) {
      try {
        const profile = await testConnectionWithKey(
          apiKeyInput,
          effectiveBusinessId,
          typeof existingConfig.api_base_url === 'string' ? existingConfig.api_base_url : undefined,
        )
        if (profile.username) authoritativeUsername = profile.username
      } catch (err) {
        if (err instanceof CalComApiError) {
          return NextResponse.json(
            { error: `Cal.com rejected the API key (${err.status}): ${err.message.replace(/^Cal\.com API error \(\d+\): /, '')}` },
            { status: 400 },
          )
        }
        throw err
      }
    } else if (!storedKey) {
      return NextResponse.json({ error: 'No API key stored yet — provide one to connect Cal.com.' }, { status: 400 })
    }

    const finalKey = apiKeyInput ? encrypt(apiKeyInput) : storedKey
    if (!finalKey || !authoritativeUsername) {
      return NextResponse.json({ error: 'Both an API key and a username are required to connect.' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const { error: upsertErr } = await admin
      .from('business_integrations')
      .upsert(
        {
          business_id: effectiveBusinessId,
          type: 'calcom',
          is_enabled: true,
          config: {
            api_key: finalKey,
            username: authoritativeUsername,
            api_base_url: typeof existingConfig.api_base_url === 'string' ? existingConfig.api_base_url : undefined,
          },
          updated_at: now,
        },
        { onConflict: 'business_id, type' },
      )

    if (upsertErr) {
      console.error('[calcom] POST upsert error:', upsertErr)
      return NextResponse.json({ error: upsertErr.message }, { status: 500 })
    }

    return NextResponse.json(
      {
        success: true,
        configured: true,
        username: authoritativeUsername,
        api_key_masked: maskApiKey(apiKeyInput || storedKey),
      },
      { headers: NO_CACHE },
    )
  } catch (err) {
    console.error('[calcom] POST failed:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const guard = await getCalcomManager()
    if (guard.error) return guard.error

    const { admin, effectiveBusinessId, error } = await resolveBusinessId()
    if (error) return error

    const { error: deleteErr } = await admin
      .from('business_integrations')
      .delete()
      .eq('business_id', effectiveBusinessId)
      .eq('type', 'calcom')

    if (deleteErr) {
      console.error('[calcom] DELETE error:', deleteErr)
      return NextResponse.json({ error: deleteErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { headers: NO_CACHE })
  } catch (err) {
    console.error('[calcom] DELETE failed:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
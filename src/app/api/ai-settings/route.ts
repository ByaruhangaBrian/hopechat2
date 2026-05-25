import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/automations/admin-client'
import { decrypt, encrypt } from '@/lib/whatsapp/encryption'

async function internalGetAiSettings(userId: string) {
  const db = supabaseAdmin()
  const { data, error } = await db
    .from('ai_settings')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return null
  }

  const decryptedApiKey = data.groq_api_key ? decrypt(data.groq_api_key) : ''

  return {
    ...data,
    groq_api_key: decryptedApiKey,
  }
}

async function internalSaveAiSettings(
  userId: string,
  settings: {
    groq_api_key: string
    system_prompt: string
    training_documents: string[]
    is_enabled: boolean
  },
) {
  const db = supabaseAdmin()
  const encryptedKey = settings.groq_api_key ? encrypt(settings.groq_api_key) : ''

  const { data, error } = await db
    .from('ai_settings')
    .upsert(
      {
        user_id: userId,
        ...settings,
        groq_api_key: encryptedKey,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      },
    )
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Failed to save AI settings: ${error?.message}`)
  }

  return data
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('ai_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      console.error('[ai-settings] fetch failed:', error)
      return NextResponse.json({ error: 'Failed to load AI settings' }, { status: 500 })
    }

    return NextResponse.json({
      settings: {
        gemini_api_key: data?.groq_api_key ? '••••••••••••••••••' : '',
        has_api_key: Boolean(data?.groq_api_key),
        system_prompt:
          data?.system_prompt ??
          'You are a helpful customer service AI assistant.',
        training_documents: data?.training_documents ?? [],
        is_enabled: data?.is_enabled ?? false,
      },
    })
  } catch (error) {
    console.error('[ai-settings] GET failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { gemini_api_key, system_prompt, training_documents, is_enabled } = body

    const existingSettings = await internalGetAiSettings(user.id)
    const rawKey = String(gemini_api_key ?? '').trim()
    const keyToSave = rawKey.length > 0 ? rawKey : existingSettings?.groq_api_key ?? ''

    if (Boolean(is_enabled) && !keyToSave) {
      return NextResponse.json(
        { error: 'AI cannot be enabled without a Gemini API key' },
        { status: 400 },
      )
    }

    try {
      await internalSaveAiSettings(user.id, {
        groq_api_key: keyToSave,
        system_prompt:
          system_prompt ??
          'You are a helpful customer service AI assistant.',
        training_documents: Array.isArray(training_documents)
          ? training_documents
          : [],
        is_enabled: Boolean(is_enabled),
      })
    } catch (saveError: any) {
      console.error('[ai-settings] save failed:', saveError)
      return NextResponse.json(
        { error: saveError?.message || 'Failed to save AI settings' },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ai-settings] POST failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

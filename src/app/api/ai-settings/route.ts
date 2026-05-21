import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/whatsapp/encryption'

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
        groq_api_key: data?.groq_api_key ? '••••••••••••••••••' : '',
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

    const { groq_api_key, system_prompt, training_documents, is_enabled } = body

    const { data: existing, error: fetchError } = await supabase
      .from('ai_settings')
      .select('groq_api_key')
      .eq('user_id', user.id)
      .maybeSingle()

    if (fetchError) {
      console.error('[ai-settings] load existing failed:', fetchError)
      return NextResponse.json({ error: 'Failed to update AI settings' }, { status: 500 })
    }

    let keyToSave = existing?.groq_api_key ?? ''
    const rawKey = String(groq_api_key ?? '').trim()
    if (rawKey.length > 0) {
      try {
        keyToSave = encrypt(rawKey)
      } catch (err) {
        console.error('[ai-settings] encrypt failed:', err)
        const msg = err instanceof Error ? err.message : String(err)
        return NextResponse.json(
          { error: `Failed to encrypt Groq API key: ${msg}` },
          { status: 500 },
        )
      }
    }

    if (Boolean(is_enabled) && !keyToSave) {
      return NextResponse.json(
        { error: 'AI cannot be enabled without a Groq API key' },
        { status: 400 },
      )
    }

    const { data: saved, error: saveError } = await supabase
      .from('ai_settings')
      .upsert(
        {
          user_id: user.id,
          groq_api_key: keyToSave,
          system_prompt:
            system_prompt ??
            'You are a helpful customer service AI assistant.',
          training_documents: Array.isArray(training_documents)
            ? training_documents
            : [],
          is_enabled: Boolean(is_enabled),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
      .select()
      .maybeSingle()

    if (saveError) {
      console.error('[ai-settings] save failed:', saveError)
      return NextResponse.json({ error: 'Failed to save AI settings' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ai-settings] POST failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

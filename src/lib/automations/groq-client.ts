import type { AiSettings } from '@/types'
import { supabaseAdmin } from './admin-client'
import { decrypt, encrypt } from '@/lib/whatsapp/encryption'

interface GroqResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

/**
 * Get the AI settings for a user
 */
export async function getAiSettings(userId: string): Promise<AiSettings | null> {
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
  } as AiSettings
}

/**
 * Generate AI response using Groq API with conversation context
 */
export async function generateAiResponse(
  userId: string,
  userMessage: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<string> {
  const aiSettings = await getAiSettings(userId)

  if (!aiSettings || !aiSettings.is_enabled) {
    throw new Error('AI is not enabled for this user')
  }

  const apiKey = aiSettings.groq_api_key
  if (!apiKey) {
    throw new Error('No Groq API key configured')
  }

  // Build messages array with conversation history and training context
  const messages: Message[] = []

  // Add system prompt with training documents context
  let systemPrompt = aiSettings.system_prompt
  if (aiSettings.training_documents && aiSettings.training_documents.length > 0) {
    systemPrompt += `\n\nTraining context:\n${aiSettings.training_documents.join('\n\n')}`
  }
  messages.push({
    role: 'system',
    content: systemPrompt,
  })

  // Add conversation history if provided
  if (conversationHistory && conversationHistory.length > 0) {
    // Only keep last 10 messages for context window efficiency
    const recentHistory = conversationHistory.slice(-10)
    messages.push(...recentHistory)
  }

  // Add current user message
  messages.push({
    role: 'user',
    content: userMessage,
  })

  // Allow selecting model via environment variable for fast remediation
  const preferredModel = process.env.GROQ_MODEL || 'mixtral-8x7b-32768'
  const fallbackModel = process.env.GROQ_FALLBACK_MODEL

  async function fetchWithModel(model: string) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1024,
        top_p: 1,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Groq API error: ${response.status} - ${errorText}`)
    }

    const data = (await response.json()) as GroqResponse

    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from Groq API')
    }

    return data.choices[0].message.content
  }

  try {
    return await fetchWithModel(preferredModel)
  } catch (err: any) {
    console.error(`[ai] generation failed with model ${preferredModel}:`, err)
    // If the error is a decommissioned-model error, attempt fallback if configured
    if (err?.message?.includes('model_decommissioned') && fallbackModel) {
      try {
        console.info(`[ai] retrying generation with fallback model ${fallbackModel}`)
        return await fetchWithModel(fallbackModel)
      } catch (err2) {
        console.error(`[ai] fallback generation also failed with model ${fallbackModel}:`, err2)
        throw err2
      }
    }

    // Surface a clearer remediation message for operators
    if (err?.message?.includes('model_decommissioned')) {
      throw new Error(
        `${err.message}. Set GROQ_MODEL or GROQ_FALLBACK_MODEL to a supported model and retry.`,
      )
    }

    throw err
  }
}

/**
 * Save AI settings for a user
 */
export async function saveAiSettings(
  userId: string,
  settings: Omit<AiSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
): Promise<AiSettings> {
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

  return data as AiSettings
}

/**
 * Add training document to AI settings
 */
export async function addTrainingDocument(userId: string, document: string): Promise<AiSettings> {
  const aiSettings = await getAiSettings(userId)
  const documents = [...(aiSettings?.training_documents ?? []), document]

  return saveAiSettings(userId, {
    groq_api_key: aiSettings?.groq_api_key ?? '',
    system_prompt: aiSettings?.system_prompt ?? 'You are a helpful customer service AI assistant.',
    training_documents: documents,
    is_enabled: aiSettings?.is_enabled ?? false,
  })
}

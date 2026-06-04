import { supabaseAdmin } from '../automations/admin-client';
import { decrypt } from './encryption';

interface AiConfig {
  system_prompt: string;
  training_documents: string[];
  knowledge_items: { title: string; content: string }[];
  is_enabled: boolean;
  api_key: string;
  expires_at: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const aiConfigCache = new Map<string, AiConfig>();

export async function getBusinessAiConfig(userId: string): Promise<Omit<AiConfig, 'expires_at'> | null> {
  const now = Date.now();
  const cached = aiConfigCache.get(userId);

  if (cached && cached.expires_at > now) {
    return cached;
  }

  const db = supabaseAdmin();

  // 1. Fetch AI settings
  const { data: settings, error: settingsError } = await db
    .from('ai_settings')
    .select('system_prompt, training_documents, is_enabled, groq_api_key, business_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (settingsError || !settings) {
    return null;
  }

  // 2. Fetch active knowledge items
  const { data: knowledge, error: knowledgeError } = await db
    .from('business_knowledge')
    .select('title, content')
    .eq('business_id', settings.business_id)
    .eq('is_active', true)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

  if (knowledgeError) {
    console.error('[ai-config-cache] Failed to fetch knowledge items:', knowledgeError);
  }

  const config = {
    system_prompt: settings.system_prompt,
    training_documents: settings.training_documents || [],
    knowledge_items: knowledge || [],
    is_enabled: settings.is_enabled,
    api_key: settings.groq_api_key ? decrypt(settings.groq_api_key) : '',
  };

  aiConfigCache.set(userId, {
    ...config,
    expires_at: now + CACHE_TTL_MS,
  });

  return config;
}

export function invalidateAiConfigCache(userId: string) {
  aiConfigCache.delete(userId);
}

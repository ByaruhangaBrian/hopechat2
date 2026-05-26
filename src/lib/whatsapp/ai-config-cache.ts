import { supabaseAdmin } from '../automations/admin-client';
import { decrypt } from './encryption';

interface AiConfig {
  system_prompt: string;
  training_documents: string[];
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

  const { data, error } = await supabaseAdmin()
    .from('ai_settings')
    .select('system_prompt, training_documents, is_enabled, groq_api_key')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const config = {
    system_prompt: data.system_prompt,
    training_documents: data.training_documents || [],
    is_enabled: data.is_enabled,
    api_key: data.groq_api_key ? decrypt(data.groq_api_key) : '',
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

import { GoogleGenAI } from '@google/genai'
import { supabaseAdmin } from '@/lib/automations/admin-client'
import { createHash } from 'crypto'

// ── Types ────────────────────────────────────────────────────────

interface CacheParams {
  /** The full system instruction text (system_prompt + training_docs + knowledge + rules + sheets config) */
  systemInstruction: string
  toolsConfig?: string
  apiKey: string
}

interface CacheEntry {
  name: string
  fingerprint: string
  expiresAt: number
}

// ── Constants ────────────────────────────────────────────────────

const MODEL = 'gemini-2.5-flash'
const CACHE_TTL_SECONDS = 3600
const CACHE_EXTEND_THRESHOLD_MS = 5 * 60 * 1000
const SETTING_TOGGLE_KEY = 'gemini_context_caching'

// In-memory registry — survives hot reloads, cleared on full server restart.
// Persisted cache names in ai_settings.cache_name survive restarts.
const cacheRegistry = new Map<string, CacheEntry>()

// ── Helpers ───────────────────────────────────────────────────────

function fingerprint(payload: string): string {
  return createHash('md5').update(payload).digest('hex').slice(0, 12)
}

// ── Public API ────────────────────────────────────────────────────

/** Check whether the superadmin has enabled caching (free-tier safe: default OFF). */
export async function isCachingEnabled(): Promise<boolean> {
  try {
    const db = supabaseAdmin()
    const { data } = await db
      .from('system_settings')
      .select('value')
      .eq('id', SETTING_TOGGLE_KEY)
      .maybeSingle()
    // value is JSONB — { "enabled": true } or just `true`
    const v = data?.value
    return v === true || v?.enabled === true
  } catch (err) {
    console.error('[gemini-cache] Failed to read caching toggle:', err)
    return false
  }
}

/**
 * Return a cache name for the given business's system instruction payload.
 * - Toggle OFF → returns null (no caching, free-tier safe)
 * - Local Map hit + fingerprint match → returns existing name (extends TTL if expiring soon)
 * - DB persistance hit + fingerprint match → verifies with Gemini API, returns name
 * - Miss → creates new cache via `ai.caches.create()`, persists to DB
 * - 403/400 errors → returns null (billing not enabled)
 */
async function resolveKey(apiKey: string): Promise<string> {
  if (apiKey) return apiKey;
  try {
    const { data } = await supabaseAdmin()
      .from('system_settings')
      .select('value')
      .eq('id', 'platform_credentials')
      .maybeSingle();
    return data?.value?.gemini_global_key || process.env.GEMINI_API_KEY || '';
  } catch {
    return process.env.GEMINI_API_KEY || '';
  }
}

export async function getOrSetCache(
  businessId: string,
  params: CacheParams,
): Promise<string | null> {
  if (!(await isCachingEnabled())) return null

  params.apiKey = await resolveKey(params.apiKey);

  const fp = fingerprint(params.systemInstruction + (params.toolsConfig ?? ''))
  const local = cacheRegistry.get(businessId)

  // ── Local Map hit ──────────────────────────────────────────
  if (local) {
    if (local.fingerprint !== fp) {
      // Content changed — stale cache
      await deleteCache(businessId)
    } else {
      if (Date.now() > local.expiresAt - CACHE_EXTEND_THRESHOLD_MS) {
        await extendCacheTtl(local.name, params.apiKey).catch(() => {})
      }
      return local.name
    }
  }

  // ── DB persistence hit (survives server restart) ───────────
  const persisted = await loadCacheFromDb(businessId)
  if (persisted && persisted.fingerprint === fp) {
    const valid = await verifyCacheExists(persisted.name, params.apiKey)
    if (valid) {
      cacheRegistry.set(businessId, {
        name: persisted.name,
        fingerprint: fp,
        expiresAt: Date.now() + CACHE_TTL_SECONDS * 1000,
      })
      return persisted.name
    }
  }

  // ── Create new cache ───────────────────────────────────────
  return await createCache(businessId, fp, params)
}

/** Delete a cache from Gemini API + Map + DB. */
export async function deleteCache(businessId: string): Promise<void> {
  const local = cacheRegistry.get(businessId)
  cacheRegistry.delete(businessId)

  // Clear DB reference
  try {
    const db = supabaseAdmin()
    await db
      .from('ai_settings')
      .update({ cache_name: null, cache_fingerprint: null })
      .eq('business_id', businessId)
  } catch (err) {
    console.error('[gemini-cache] Failed to clear DB cache ref:', err)
  }

  if (!local?.name) return
  try {
    const apiKey = await resolveKey('')
    if (apiKey) {
      const ai = new GoogleGenAI({ apiKey })
      await ai.caches.delete({ name: local.name })
    }
  } catch (err: any) {
    if (err?.status !== 403 && err?.status !== 404) {
      console.error('[gemini-cache] Failed to delete remote cache:', err)
    }
  }
}

// ── Internal ──────────────────────────────────────────────────────

async function loadCacheFromDb(
  businessId: string,
): Promise<{ name: string; fingerprint: string } | null> {
  try {
    const db = supabaseAdmin()
    const { data } = await db
      .from('ai_settings')
      .select('cache_name, cache_fingerprint')
      .eq('business_id', businessId)
      .maybeSingle()
    if (data?.cache_name && data?.cache_fingerprint) {
      return { name: data.cache_name, fingerprint: data.cache_fingerprint }
    }
  } catch {
    // silent — DB may not have column yet pre-migration
  }
  return null
}

async function verifyCacheExists(name: string, apiKey: string): Promise<boolean> {
  try {
    const ai = new GoogleGenAI({ apiKey })
    await ai.caches.get({ name })
    return true
  } catch (err: any) {
    if (err?.status === 404 || err?.status === 403) return false
    console.error('[gemini-cache] verifyCacheExists error:', err)
    return false
  }
}

async function createCache(
  businessId: string,
  fp: string,
  params: CacheParams,
): Promise<string | null> {
  const displayName = `hopechat_${businessId.slice(0, 8)}_${fp}`

  try {
    const ai = new GoogleGenAI({ apiKey: params.apiKey })

    const cache = await ai.caches.create({
      model: `models/${MODEL}`,
      config: {
        displayName,
        // The cached contents are PREPENDED to every request that uses this cache.
        // We store the full system instruction text here as a user message prefix.
        // The systemInstruction field holds the AI's role definition.
        contents: {
          role: 'user',
          parts: [{ text: params.systemInstruction }],
        },
        systemInstruction: 'You are a helpful customer service AI assistant.',
        ttl: `${CACHE_TTL_SECONDS}s`,
      },
    })

    if (!cache.name) throw new Error('Cache creation returned no name')

    const entry: CacheEntry = {
      name: cache.name,
      fingerprint: fp,
      expiresAt: Date.now() + CACHE_TTL_SECONDS * 1000,
    }

    cacheRegistry.set(businessId, entry)

    // Persist reference to survive restarts
    try {
      const db = supabaseAdmin()
      await db
        .from('ai_settings')
        .update({ cache_name: cache.name, cache_fingerprint: fp })
        .eq('business_id', businessId)
    } catch {
      // best-effort
    }

    console.log(`[gemini-cache] Created cache ${cache.name} for business ${businessId.slice(0, 8)}`)
    return cache.name
  } catch (err: any) {
    if (err?.status === 403 || err?.status === 400) {
      console.warn('[gemini-cache] Cache creation failed — billing not enabled (free tier). Falling back to uncached.')
    } else {
      console.error('[gemini-cache] Cache creation error:', err)
    }
    return null
  }
}

async function extendCacheTtl(name: string, apiKey: string): Promise<void> {
  try {
    const ai = new GoogleGenAI({ apiKey })
    await ai.caches.update({ name, config: { ttl: `${CACHE_TTL_SECONDS}s` } })
  } catch (err: any) {
    if (err?.status !== 404 && err?.status !== 403) {
      console.error('[gemini-cache] TTL extend failed:', err)
    }
  }
}

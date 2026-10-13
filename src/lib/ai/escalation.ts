import type { SupabaseClient } from '@supabase/supabase-js'

export type EscalationReason = 'ai_marker' | 'keyword'

export interface EscalationPolicy {
  /** Master switch. When false the AI never auto-escalates. */
  enabled: boolean
  /** When true, also set `human_takeover` so the AI stops replying. */
  autoPauseAi: boolean
  /** Word-boundary, case-insensitive trigger phrases. */
  keywords: string[]
  /** Name of the reserved per-business contact tag to apply. */
  tagName: string
}

/** Marker the model is instructed to append when it wants a human. */
export const ESCALATION_MARKER = '[ESCALATE]'

export const DEFAULT_ESCALATION_TAG_NAME = 'Needs human'

export const DEFAULT_ESCALATION_KEYWORDS: readonly string[] = [
  'human',
  'agent',
  'representative',
  'manager',
  'supervisor',
  'support',
  'talk to someone',
  'speak to a person',
  'real person',
  'refund',
  'angry',
  'complaint',
]

export const DEFAULT_ESCALATION_POLICY: EscalationPolicy = {
  enabled: true,
  autoPauseAi: true,
  keywords: [...DEFAULT_ESCALATION_KEYWORDS],
  tagName: DEFAULT_ESCALATION_TAG_NAME,
}

const MAX_TAG_NAME = 40

export type EscalationPolicyValidation =
  | { ok: true; value: EscalationPolicy }
  | { ok: false; error: string }

/**
 * Strict validator for user-submitted escalation policies (API boundary).
 * Unlike {@link normalizeEscalationPolicy} it rejects malformed fields instead
 * of silently coercing them, then returns a normalized value.
 */
export function validateEscalationPolicy(raw: unknown): EscalationPolicyValidation {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Escalation policy must be an object' }
  }

  const source = raw as Record<string, unknown>

  if (source.enabled !== undefined && typeof source.enabled !== 'boolean') {
    return { ok: false, error: '"enabled" must be a boolean' }
  }
  if (source.autoPauseAi !== undefined && typeof source.autoPauseAi !== 'boolean') {
    return { ok: false, error: '"autoPauseAi" must be a boolean' }
  }

  if (source.tagName !== undefined && typeof source.tagName !== 'string') {
    return { ok: false, error: '"tagName" must be a string' }
  }
  if (typeof source.tagName === 'string' && source.tagName.trim() === '') {
    return { ok: false, error: '"tagName" cannot be empty' }
  }

  if (source.keywords !== undefined) {
    if (!Array.isArray(source.keywords)) {
      return { ok: false, error: '"keywords" must be an array of strings' }
    }
    for (const keyword of source.keywords) {
      if (typeof keyword !== 'string') {
        return { ok: false, error: 'every keyword must be a string' }
      }
    }
  }

  return { ok: true, value: normalizeEscalationPolicy(source) }
}

export interface EscalationInput {
  /** The model's reply for this turn (may contain the marker). */
  aiText?: string | null
  /** The customer's most recent inbound message. */
  lastUserMessage?: string | null
  /** Overrides the default keyword list; an explicit `[]` disables keyword matching. */
  keywords?: readonly string[]
}

export interface EscalationResult {
  escalated: boolean
  reason: EscalationReason | null
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function keywordPattern(keyword: string): RegExp {
  const escaped = escapeRegex(keyword)
  const startsWithWord = /^[a-z0-9]/i.test(keyword)
  const endsWithWord = /[a-z0-9]$/i.test(keyword)
  const pattern = `${startsWithWord ? '\\b' : ''}${escaped}${endsWithWord ? '\\b' : ''}`
  return new RegExp(pattern, 'i')
}

function matchesAnyKeyword(message: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) => keywordPattern(keyword).test(message))
}

/**
 * Decide whether a single AI turn should escalate a conversation.
 *
 * The `[ESCALATE]` marker is the primary signal (the model was told to emit
 * it). Keyword matching is the backstop for cases the model overlooks. Pure
 * and dependency-free so it is trivially unit-testable.
 */
export function detectEscalation(input: EscalationInput): EscalationResult {
  const aiText = typeof input.aiText === 'string' ? input.aiText : ''
  if (aiText.includes(ESCALATION_MARKER)) {
    return { escalated: true, reason: 'ai_marker' }
  }

  const message = typeof input.lastUserMessage === 'string' ? input.lastUserMessage : ''
  const keywords = input.keywords ?? DEFAULT_ESCALATION_KEYWORDS
  if (message.trim() !== '' && keywords.length > 0 && matchesAnyKeyword(message, keywords)) {
    return { escalated: true, reason: 'keyword' }
  }

  return { escalated: false, reason: null }
}

/** Remove the escalation marker from customer-facing text. */
export function stripEscalationMarker(text: string): string {
  return text.split(ESCALATION_MARKER).join('').trim()
}

function normalizeKeywords(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [...DEFAULT_ESCALATION_KEYWORDS]

  const seen = new Set<string>()
  const keywords: string[] = []
  for (const item of raw) {
    if (typeof item !== 'string') continue
    const keyword = item.trim()
    if (keyword === '') continue
    const key = keyword.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    keywords.push(keyword)
  }
  return keywords
}

/**
 * Coerce arbitrary stored JSON into a well-formed {@link EscalationPolicy}.
 * Missing or malformed fields fall back to sensible defaults.
 */
export function normalizeEscalationPolicy(raw: unknown): EscalationPolicy {
  const source =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}

  const tagName =
    typeof source.tagName === 'string' && source.tagName.trim() !== ''
      ? source.tagName.trim().slice(0, MAX_TAG_NAME)
      : DEFAULT_ESCALATION_TAG_NAME

  return {
    enabled: source.enabled === undefined ? DEFAULT_ESCALATION_POLICY.enabled : source.enabled === true,
    autoPauseAi:
      source.autoPauseAi === undefined
        ? DEFAULT_ESCALATION_POLICY.autoPauseAi
        : source.autoPauseAi === true,
    keywords: normalizeKeywords(source.keywords),
    tagName,
  }
}

/** Colour used for the auto-provisioned reserved tag. */
export const ESCALATION_TAG_COLOR = '#ef4444'

export interface RecordEscalationParams {
  conversationId: string
  businessId: string
  policy: EscalationPolicy
  /** Overrides; when omitted the conversation row is used. */
  contactId?: string | null
  userId?: string | null
}

interface ConversationRow {
  escalated: boolean | null
  contact_id: string | null
  user_id: string | null
  unread_count: number | null
}

/**
 * Persist an escalation for a conversation, idempotently.
 *
 * Returns `true` only when the call newly escalates. When the conversation is
 * already escalated it is a no-op (`false`), so a replay cannot duplicate the
 * tag or re-notify. Tagging is best-effort and never blocks the flag.
 *
 * Intended for the service-role client (the AI worker), which bypasses RLS.
 */
export async function recordEscalation(
  db: SupabaseClient,
  params: RecordEscalationParams,
): Promise<boolean> {
  const { conversationId, businessId, policy } = params

  const { data, error } = await db
    .from('conversations')
    .select('id, escalated, contact_id, user_id, unread_count')
    .eq('id', conversationId)
    .single()

  if (error || !data) return false

  const conversation = data as unknown as ConversationRow
  if (conversation.escalated) return false

  const update: Record<string, unknown> = {
    escalated: true,
    // Ensure the sidebar shows the conversation as needing attention.
    unread_count: Math.max(conversation.unread_count ?? 0, 1),
  }
  if (policy.autoPauseAi) update.human_takeover = true

  const { error: updateError } = await db
    .from('conversations')
    .update(update)
    .eq('id', conversationId)

  if (updateError) return false

  const contactId = params.contactId ?? conversation.contact_id
  if (contactId) {
    await applyReservedTag(db, {
      businessId,
      contactId,
      userId: params.userId ?? conversation.user_id,
      tagName: policy.tagName,
    })
  }

  return true
}

/**
 * Find (or create) the reserved escalation tag for a business and attach it to
 * a contact. Non-fatal on failure: escalation visibility is driven by
 * `conversations.escalated`, so a tagging hiccup must not break the flow.
 */
async function applyReservedTag(
  db: SupabaseClient,
  input: { businessId: string; contactId: string; userId: string | null; tagName: string },
): Promise<void> {
  const { businessId, contactId, userId, tagName } = input

  try {
    const { data: existing } = await db
      .from('tags')
      .select('id')
      .eq('business_id', businessId)
      .eq('name', tagName)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    let tagId = (existing as { id: string } | null)?.id

    if (!tagId) {
      const { data: created, error } = await db
        .from('tags')
        .insert({
          business_id: businessId,
          user_id: userId,
          name: tagName,
          color: ESCALATION_TAG_COLOR,
        })
        .select('id')
        .single()

      if (error || !created) return
      tagId = (created as { id: string }).id
    }

    await db.from('contact_tags').upsert(
      { contact_id: contactId, tag_id: tagId },
      { onConflict: 'contact_id,tag_id', ignoreDuplicates: true },
    )
  } catch {
    // Best-effort tagging.
  }
}

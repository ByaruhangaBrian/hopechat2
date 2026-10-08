import { supabaseAdmin } from '@/lib/automations/admin-client'

export const EVENT_VOCABULARY: Record<string, readonly string[]> = {
  auth: ['login', 'logout'],
  contact: ['created', 'updated', 'deleted'],
  pipeline: ['created', 'updated', 'deleted', 'stage_moved'],
  broadcast: ['created', 'updated', 'deleted', 'sent', 'scheduled', 'canceled', 'paused', 'resumed'],
  automation: ['created', 'updated', 'deleted', 'enabled', 'disabled'],
  settings: ['updated'],
}

export interface ActivityInput {
  businessId: string
  actorUserId?: string | null
  actorLabel?: string | null
  category: string
  action: string
  entityType?: string | null
  entityId?: string | null
  summary: string
  metadata?: Record<string, unknown>
}

const MAX_SUMMARY = 300
const MAX_ENTITY_TYPE = 50
const MAX_ENTITY_ID = 120
const MAX_METADATA_KEYS = 25

export class ActivityValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ActivityValidationError'
  }
}

export function isActionAllowed(category: string, action: string): boolean {
  const actions = EVENT_VOCABULARY[category]
  return Array.isArray(actions) && actions.includes(action)
}

/**
 * Returns an error message for an invalid input, or null when the input is
 * valid. Shared by the API route (rejects with 400) and `logActivity`
 * (defensive validation before insert).
 */
export function validateActivityInput(input: ActivityInput): string | null {
  if (!input.category || !/^[a-z][a-z0-9_]{0,29}$/.test(input.category)) {
    return 'category must match ^[a-z][a-z0-9_]*$'
  }
  if (!input.action || !/^[a-z][a-z0-9_]{0,29}$/.test(input.action)) {
    return 'action must match ^[a-z][a-z0-9_]*$'
  }
  if (!isActionAllowed(input.category, input.action)) {
    return `unknown (category, action) pair: (${input.category}, ${input.action})`
  }
  if (typeof input.summary !== 'string' || input.summary.trim() === '') {
    return 'summary is required'
  }
  if (input.summary.length > MAX_SUMMARY) {
    return `summary exceeds ${MAX_SUMMARY} characters`
  }
  if (input.entityType !== undefined && input.entityType !== null && input.entityType.length > MAX_ENTITY_TYPE) {
    return `entity_type exceeds ${MAX_ENTITY_TYPE} characters`
  }
  if (input.entityId !== undefined && input.entityId !== null && String(input.entityId).length > MAX_ENTITY_ID) {
    return `entity_id exceeds ${MAX_ENTITY_ID} characters`
  }
  if (input.metadata !== undefined && input.metadata !== null) {
    if (typeof input.metadata !== 'object' || Array.isArray(input.metadata)) {
      return 'metadata must be a JSON object'
    }
    if (Object.keys(input.metadata).length > MAX_METADATA_KEYS) {
      return `metadata exceeds ${MAX_METADATA_KEYS} keys`
    }
  }
  return null
}

/**
 * Persists a tenant-visible activity event via the service role.
 *
 * - Validates the (category, action) vocabulary and field constraints,
 *   throwing `ActivityValidationError` on programmer error (fails fast in
 *   dev/tests).
 * - Swallows database failures so a broken analytics pipe can never break a
 *   page render or a save action. Returns the inserted id, or null on failure.
 */
export async function logActivity(input: ActivityInput): Promise<{ id: string } | null> {
  const validateError = validateActivityInput(input)
  if (validateError) {
    throw new ActivityValidationError(validateError)
  }

  try {
    const { data, error } = await supabaseAdmin()
      .from('activity_events')
      .insert({
        business_id: input.businessId,
        actor_user_id: input.actorUserId ?? null,
        actor_label: input.actorLabel ?? null,
        category: input.category,
        action: input.action,
        entity_type: input.entityType ?? null,
        entity_id: input.entityId !== undefined ? String(input.entityId) : null,
        summary: input.summary.trim(),
        metadata: input.metadata ?? {},
      })
      .select('id')
      .single()

    if (error) {
      throw error
    }
    return { id: data?.id }
  } catch (err) {
    console.warn('[activity] failed to log event:', err instanceof Error ? err.message : err)
    return null
  }
}
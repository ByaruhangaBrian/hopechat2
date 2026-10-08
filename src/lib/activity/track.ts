export interface TrackPayload {
  category: string
  action: string
  entity_type?: string | null
  entity_id?: string | null
  summary: string
  metadata?: Record<string, unknown>
}

/**
 * Fire-and-forget activity tracker for the browser.
 *
 * Never sends `ip_address` (the endpoint physically has no such parameter),
 * and never throws — a failed event must not disturb the user's action.
 * Pass `{ await: true }` when the caller needs confirmation (e.g. logout).
 */
export function track(payload: TrackPayload, opts?: { await?: boolean }): Promise<void> | void {
  const body: TrackPayload = {
    category: payload.category,
    action: payload.action,
    summary: payload.summary,
  }
  if (payload.entity_type) body.entity_type = payload.entity_type
  if (payload.entity_id !== undefined && payload.entity_id !== null) {
    body.entity_id = String(payload.entity_id)
  }
  if (payload.metadata) body.metadata = payload.metadata

  const request = fetch('/api/activity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch((err: unknown) => {
    console.warn('[activity] client track failed:', err instanceof Error ? err.message : err)
  })

  if (opts?.await) {
    return request.then(() => undefined)
  }
  void request
}
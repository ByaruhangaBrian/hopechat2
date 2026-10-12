# Implementation Plan: Business-Level AI Availability Schedule

## Overview

Let a business restrict **when the AI assistant is allowed to reply** — by day of
week and time-of-day, in one business-level timezone. When the current time is
**outside** the configured window, the AI stays silent and the conversation is
left for a human (no auto-reply, no fallback message, no error).

Scope decisions (locked):
- **Business-level** schedule (one config per business), not per-automation-step.
- **Out-of-hours = do nothing** (human follows up).
- **Gates both AI reply paths**:
  1. Native inbound auto-reply — `whatsapp_ai_jobs` → `executeAiJob`
     (`src/lib/whatsapp/ai-worker.ts:248`).
  2. `assign_to_ai` automation step — `src/lib/automations/engine.ts:682`.

Non-goals: per-step overrides, per-contact/per-channel schedules, holiday
calendars, "away auto-responder" messaging. (Revisit later if requested.)

## Data Model

No migration. Schedule lives inside the existing `business_settings.value` JSONB
(table created in `supabase/migrations/057_business_session_settings.sql`; RLS
scoped per business, already read server-side via `getBusinessSettings()`).

```ts
type Weekday = 'mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun'

interface AiAvailabilityWindow { enabled: boolean; from: string; to: string } // "HH:mm"

interface AiSchedule {
  enabled: boolean                 // master switch; false => always available
  timezone: string                 // IANA, e.g. "Africa/Kampala"
  days: Record<Weekday, AiAvailabilityWindow>
}
```

- `enabled:false` (default) → AI is available at all hours (backward compatible).
- A day is "in hours" when `day.enabled` and, in `timezone`,
  `from <= HH:mm < to`. Overnight windows (`from > to`, e.g. 22:00–06:00) wrap
  past midnight.
- Default timezone `Africa/Kampala`.

## Enforcement Points

Gate **only** at reply time (not enqueue): the debounced job runs seconds after
enqueue, so reading the schedule once at execution is correct and avoids the
message being dropped if the window opens moments later.

1. `executeAiJob` (native) — after the existing guardrails
   (`ai-worker.ts:258`), load `getBusinessSettings(job.business_id)`; if outside
   the window, log and `return` (skip). No credit usage.
2. `assign_to_ai` (engine) — after the `ai_settings.is_enabled` check
   (`engine.ts:711`), same check; outside the window `return 'Outside AI
   availability window; left for a human'` (must **not** throw, or the
   automation is marked failed).

## Files

- NEW `src/lib/ai/schedule.ts` — types + `DEFAULT_AI_SCHEDULE`,
  `normalizeAiSchedule`, `isValidTime`, `isWithinAiSchedule(now, schedule)`.
- NEW `src/lib/ai/schedule.test.ts` — unit tests.
- `src/lib/tests/settings.ts` — add `ai_schedule` to `BusinessSettings` +parse;
  add `updateBusinessSettings(businessId, patch)` merge helper.
- `src/lib/whatsapp/ai-worker.ts` — gate `executeAiJob`.
- `src/lib/automations/engine.ts` — gate `assign_to_ai`.
- NEW `src/app/api/ai-schedule/route.ts` — `GET`/`PUT` with merge-write.
- NEW `src/app/api/ai-schedule/route.test.ts` — validation + merge tests.
- NEW `src/components/ai/ai-schedule.tsx` — "AI availability" card.
- `src/app/(dashboard)/ai/page.tsx` — render `<AiSchedule />`.
- `src/components/settings/test-settings.tsx` — **fix existing clobber**:
  it upserts the whole `value` object (lines 51-60), which would delete
  `ai_schedule`; change to a read-modify-write merge.
- `src/app/page.tsx` — landing parity (AGENTS.md) + `docs/` copy.

## Phases

### Phase 1 — Foundation
- **T1** `schedule.ts` util + types (pure).
- **T2** `schedule.test.ts` unit tests.
- **T3** extend `getBusinessSettings` + `updateBusinessSettings` merge helper.

### Phase 2 — Enforcement (checkpoint)
- **T4** gate native `executeAiJob`.
- **T5** gate `assign_to_ai` step.
- **T6 (checkpoint)** typecheck + unit tests + lint + manual scenario reasoning.

### Phase 3 — Configuration UI + API
- **T7** `/api/ai-schedule` route (validate + merge-write).
- **T8** route tests.
- **T9** `AiSchedule` card on `/ai`.
- **T10** fix `test-settings.tsx` clobber.

### Phase 4 — Parity, docs, deploy
- **T11** landing-page + docs copy.
- **T12** final verification + staged deploy (staging→prod). No migration.

## Verification Strategy

- **Unit** (vitest, `npm test`): `isWithinAiSchedule` edges — disabled master,
  disabled day, before `from`, at `from` (inclusive), at `to` (exclusive),
  overnight wrap, timezone conversion, malformed input. Route: rejects bad
  times/unknown days, preserves other `value` keys on write.
- **Static**: `npm run typecheck`, `npm run lint`, `npm run build`.
- **Manual (staging)**: enable schedule, set today's window to a past hour →
  send an inbound WhatsApp message → confirm message saved, **no** AI reply, no
  error, no job left "processing"; then set window around now → confirm AI
  replies. Repeat via a `assign_to_ai` automation step (confirm step status =
  skipped/done, not failed).
- **Backward-compat**: businesses with no schedule row keep replying 24/7.

## Risks / Mitigations

- **JSONB clobber** (two writers share `value`) → all writers read-modify-write;
  fix `test-settings.tsx` (T10).
- **Timezone correctness** → rely on `Intl.DateTimeFormat` with `timeZone`;
  unit-test a non-UTC zone.
- **Overnight windows** → explicit wrap handling + tests.
- **Extra worker query** → one `business_settings` read per job; negligible.

## Estimated Effort

~2 days.

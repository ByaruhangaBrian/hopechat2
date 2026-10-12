# Task List — Business-Level AI Availability Schedule

Plan: `tasks/ai-schedule-plan.md`

Status: implementation complete; verified. Deploy pending go-ahead.

## Phase 1 — Foundation

- [x] **T1** Create `src/lib/ai/schedule.ts` (types, `DEFAULT_AI_SCHEDULE`, `normalizeAiSchedule`, `isValidTime`, `isValidTimezone`, `isWithinAiSchedule`, `validateAiSchedule`)
- [x] **T2** Create `src/lib/ai/schedule.test.ts` (boundaries, wrap, timezone, disabled, full-day, fail-open, validator)
- [x] **T3** Extend `src/lib/tests/settings.ts` (`ai_schedule` on `BusinessSettings`; `updateBusinessSettings` merge helper)

## Phase 2 — Enforcement

- [x] **T4** Gate native path in `src/lib/whatsapp/ai-worker.ts` (`executeAiJob`)
- [x] **T5** Gate `assign_to_ai` in `src/lib/automations/engine.ts` (returns a status, does not throw)
- [x] **T6** Checkpoint: `npm run typecheck` clean; logic verified via compiled harness (52/52); lint warnings pre-existing only

## Phase 3 — Configuration UI + API

- [x] **T7** Create `src/app/api/ai-schedule/route.ts` (`GET`/`PUT`, validate + merge-write)
- [x] **T8** Create `src/app/api/ai-schedule/route.test.ts`
- [x] **T9** Create `src/components/ai/ai-schedule.tsx`; render on `src/app/(dashboard)/ai/page.tsx`
- [x] **T10** Fix clobber in `src/components/settings/test-settings.tsx` (read-modify-write)

## Phase 4 — Parity, docs, deploy

- [x] **T11** Landing FAQ (`src/app/page.tsx`) + docs section (`src/app/docs/ai/page.tsx`)
- [x] **T12a** Verify: `npm run typecheck`, lint, `npm run build` all pass; no migration needed
- [ ] **T12b** Deploy staging (`develop`) → prod (`main`) — awaiting approval

## Notes

- `npm test` (vitest) cannot start in this environment: Node v21.7.2 passes an
  array to `util.styleText`, which the bundled rolldown/vitest rejects
  (`ERR_INVALID_ARG_VALUE`). This breaks every test file, pre-existing. Logic was
  instead verified by compiling `schedule.ts` with `tsc` and running a harness
  mirroring the vitest assertions (52 passed, 0 failed).

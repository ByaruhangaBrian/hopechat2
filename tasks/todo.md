# Task List — Cal.com Scheduling / Bookings Integration

Legend: `[ ]` pending, `[x]` done. Each task is independently verifiable.
Commands: typecheck `npm run typecheck`, build `npm run build`, lint `npm run lint`.
(The vitest runner is broken on this machine — write tests but verify via typecheck/build/manual unless the runner works.)

Confirmed decisions: API key + username auth; credentials in Settings → Integrations;
management on a new `/bookings` menu item; toggle event types + share (copy) links;
sharing = copy into AI prompt / chat (no send route in v1).

## Checklist
- [x] Human approved the plan and decisions (API key auth, /bookings menu, toggle+share, copy-to-prompt).
- [x] Every task has acceptance criteria + a verification step.
- [x] Task dependencies ordered (see plan dependency graph).
- [x] No task touches more than ~5 files.
- [x] Checkpoints exist between phases.

## Phase 0 — Foundation

- [ ] **Task 1: DB migration `060_calcom_scheduling.sql`**
  - `cal_bookings` table, indexes, updated_at trigger, RLS per-op + explicit `TO service_role` full-access policy, system_settings fallback seed.
  - Verify: typecheck/build; migration reviewed.
- [ ] **Task 2: Cal.com API lib `src/lib/integrations/calcom.ts` + tests**
  - Encrypted config loader, `fetchEventTypes`, `patchEventType`, `buildBookingLink`, `EventType` type; colocated `calcom.test.ts`.
  - Verify: typecheck/build; lib harness if vitest broken.

### Checkpoint: Foundation
- [ ] Migration clean; typecheck + build pass.

## Phase 1 — Connect & Navigate

- [ ] **Task 3: Config API `src/app/api/integrations/calcom/route.ts`**
  - GET status (+ event types when configured); POST upsert (encrypt keys, test connection); DELETE clears.
  - Verify: API exercised against a test Cal.com key; typecheck/build.
- [ ] **Task 4: Settings connect UI `src/components/settings/calcom-form.tsx` + hub**
  - Connect pane only (masked secrets, Save & Test, Disconnect); flip Calendly stub card → Cal.com with "management lives on Bookings page" hint.
  - Verify: connect + disconnect real account; typecheck/build.
- [ ] **Task 5: `bookings` permission + sidebar + `/bookings` page shell**
  - `permissions.ts` `bookings` key (definitions, FULL_ACCESS, AGENT_DEFAULT false, config perms); sidebar nav + `permissionByPath`; `pathGates` in dashboard-shell; `/bookings` page skeleton with permission clamp.
  - Verify: sidebar shows Bookings; unpermissioned users bounced; typecheck/build.

### Checkpoint: Connect & Navigate
- [ ] Connect real account from Settings; `/bookings` reachable; permission gating works.

## Phase 2 — Manage & Share

- [ ] **Task 6: Event-type toggle API `src/app/api/integrations/calcom/event-types/[id]/route.ts`**
  - PATCH `{ disabled }` (+ optional `length`) via Cal.com; 4xx with Cal.com error detail.
  - Verify: PATCH toggles on real account; typecheck/build.
- [ ] **Task 7: `/bookings` manage UI**
  - Event-type list (title, duration, toggle w/ optimistic rollback), booking link + Copy button, AI-prompt hint, no-integration → Settings link.
  - Verify: toggle reflects on Cal.com; copy works; build passes.

### Checkpoint: Manage Flow
- [ ] Toggle reflects on Cal.com; copy link works to paste into AI prompt/chat.

## Phase 3 — Track Bookings

- [ ] **Task 8: Cal.com webhook**
  - `src/lib/calcom/webhook-signature.ts` + test (HMAC-SHA256, fail closed, constant-time); `src/app/api/calcom/webhook/route.ts` (verify, upsert bookings, logHttpEvent, 200 on ack).
  - Verify: replayed real webhook inserts/updates; bad sig rejected; build passes.
- [ ] **Task 9: Bookings list API + `/bookings` panel**
  - `src/app/api/calcom/bookings/route.ts` (booked/rescheduled/cancelled); recent-bookings panel (attendee, event, time, status pill).
  - Verify: created/rescheduled/cancelled render correctly; build passes.

### Checkpoint: Shipped Slice
- [ ] A booking via a shared link appears in-app; reschedule/cancel dedupes.

## Phase 4 — Parity & Polish

- [ ] **Task 10: Landing page parity (AGENTS.md)**
  - `src/app/page.tsx`: feature card for appointment booking, matching FAQ entry, Cal.com under Integrations chips/footer.
  - Verify: landing copy present + consistent; build passes.
- [ ] **Task 11: Hardening pass**
  - RLS/service-role review, rate limits, no secrets in client, dark/light contrast, reduced-motion; final lint/typecheck/build.
  - Verify: repo gates clean.

### Checkpoint: Complete
- [ ] All acceptance criteria met; human reviews before merge.
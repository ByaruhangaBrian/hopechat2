# Task List — AI-Driven Test Offers With Confirmation

Legend: `[ ]` pending, `[x]` done. Each task is independently verifiable.
Commands: typecheck `npm run typecheck`, build `npm run build`, lint `npm run lint`, tests `npm test`.

---

## Task 1: Runtime staging & confirm handling in the tests runtime
**Description:** Add AI-offer support to `src/lib/tests/runtime.ts`. (a) Export
`stageTestOffer({ businessId, contactId, conversationId, testId })` that
validates the test (active + belongs to the business), rejects when the contact
already has an active test session and when a timed exam was already attempted
(`isAttemptBlocked`), then upserts the `user_sessions` row with
`session_data: { module:'test', status:'active', stage:'confirm', test_id,... }`.
(b) In `handleTestReply`, after the CAS claim and the inactivity-timeout block, handle `stage==='confirm'`: button `test:confirm`
or a normalized Yes-ish text → reload the test, re-check the attempt gate, call
`beginSession(contactId, test)` and return `{ handled:true }`; button
`test:cancel` or a normalized No-ish reply → delete the `user_sessions` row and
return `{ handled:false }` (AI resumes); anything else → re-ask the confirmation
question (nudge pattern) and return `{ handled:true }`. Add `'confirm'` to the
`stage` union. Confirmation text matching lives in small pure helpers so they are
unit-testable.

**Acceptance criteria:**
- [ ] `stageTestOffer` upserts a `stage:'confirm'` session; rejects already-in-test and already-attempted with distinct `ok:false` reasons
- [ ] Confirm (button or typed yes) starts the real test via `beginSession`; `handled` stays true
- [ ] Decline (button or typed no) deletes the offer row and returns `handled:false`
- [ ] Unrecognized reply re-asks the confirmation and stays `handled:true`

**Verification:**
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] New unit test (vitest) for confirm/decline text normalization passes: `npm test`
- [ ] Manual: offer staged → tap Start → test runs to completion; tap Not Now → no session row remains

**Dependencies:** None

**Files likely touched:**
- `src/lib/tests/runtime.ts`
- `src/lib/tests/confirm.test.ts` (new)

**Estimated scope:** Medium (2-3 files)

---

## Task 2: Gemini `start_test` tool in gemini-client
**Description:** In `src/lib/automations/gemini-client.ts`, add an opt-in
`tools?: Array<'search_business_data' | 'start_test'>` option to
`GeminiCallOptions`. When `start_test` is enabled, include a `start_test`
function declaration (`test_id`, `test_title`) and, in the function-call branch,
handle it by loading the test, verifying business ownership, calling
`stageTestOffer` from Task 1 (using `options.metadata.contact_id` /
`conversation_id`), and returning a `functionResponse` that either directs the
model to confirm with the customer ("offer pending — ask them to confirm") or
tells it the test can't be offered (already in a test / already attempted once)
so it doesn't push. Default behavior (no `tools` option) stays exactly as today.

**Acceptance criteria:**
- [ ] `tools` option defaults to today's behavior; both existing call sites compile unchanged
- [ ] Enabling `start_test` adds the declaration; the handler calls `stageTestOffer` and never starts a test itself
- [ ] Tool response text routes the model to confirm-first or to back off

**Verification:**
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] Manual/log check: model chooses test → functionCall logged → offer row appears with correct test_id

**Dependencies:** Task 1

**Files likely touched:**
- `src/lib/automations/gemini-client.ts`

**Estimated scope:** Small (1 file)

---

## Task 3: AI worker — intent context + confirmation buttons
**Description:** In `src/lib/whatsapp/ai-worker.ts` `executeAiJob`: (a) read the
per-business switch via `getBusinessSettings` (default on); only when enabled,
query the business's active tests and append an `AVAILABLE TESTS` block to
`systemInstruction` (same pattern as spreadsheets at lines 381-388), instructing
the model to call `start_test` when the customer expresses intent to take a
test/quiz/exam/assessment and to ask which one if ambiguous — always obtain
confirmation first; (b) pass `tools: ['search_business_data', 'start_test']` to
`generateGeminiResponse` only when the switch is on; (c) after credits are
consumed and the reply text is ready, check the contact's `user_sessions` row: if
`stage==='confirm'`, send the confirmation text as a WhatsApp buttons payload via
`engineSendInteractive` (items `test:confirm` → label `Start`, `test:cancel` →
label `Not Now`, button labels ≤20 chars) instead of plain text, and keep the
text send as the fallback path when no offer is pending.

**Acceptance criteria:**
- [ ] Tests appear in the AI context only when the business switch is on; the prompt tells the model to offer on intent and confirm first
- [ ] `start_test` tool enabled only at this call site and only when the switch is on (`engine.ts` unchanged)
- [ ] Pending confirm state ⇒ reply sent as interactive buttons; otherwise plain text exactly as today
- [ ] Timed tests the contact already finished are excluded/not offered
- [ ] Credits unchanged: exactly 1 `ai_chat` credit for the confirmation reply; 0 AI credits consumed DURING the test (`handledByTest` short-circuit); 1 `test_attempt` credit at test completion

**Verification:**
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] Manual end-to-end via a test phone number: hint at a test → AI asks + buttons appear → Start runs the test → Done/Start-over as today; verify credit log shows 1 ai_chat + 1 test_attempt and no AI cost mid-test

**Dependencies:** Tasks 1, 2

**Files likely touched:**
- `src/lib/whatsapp/ai-worker.ts`

**Estimated scope:** Medium (1-2 files)

---

### Checkpoint: Core flow (after Tasks 1-3)
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] `npm test` passes
- [ ] Manual WhatsApp flow: offer → confirm → test runs; offer → decline → AI continues; repeated offer of an already-taken timed exam never appears
- [ ] Credit log: 1 `ai_chat` on the confirmation, 1 `test_attempt` on completion, no AI cost during the test
- [ ] Human reviews before Phase 2

---

## Task 4: Per-business enable switch for the AI↔tests integration
**Description:** Add `enable_ai_test_offers` to the business settings surface so
the integration can be switched on/off per business. In
`src/lib/tests/settings.ts`: extend `BusinessSettings` and
`getBusinessSettings` to read `enable_ai_test_offers` (default: `true`). In
`src/components/settings/test-settings.tsx`: add a `Switch` (import from
`@/components/ui/switch`, used as in `ai-config.tsx`) persisted in the same
`business_settings.value` upsert as `session_timeout_hours` (card copy explains
what the switch does). This is the single source of truth read by `executeAiJob`
(Task 3) — no other gating paths.

**Acceptance criteria:**
- [ ] Switch appears in Test Settings; toggling + Save persists `enable_ai_test_offers` in `business_settings.value`
- [ ] Default when no setting exists: enabled (feature on for existing businesses with active tests)
- [ ] Off ⇒ Task 3 omits AVAILABLE TESTS block and `start_test` tool for that business; deterministic keyword/entry-test automations unchanged

**Verification:**
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] Manual: switch off → AI never offers tests (hint at a test → normal AI chat), existing keyword-automation test still starts; switch back on → offers resume

**Dependencies:** Task 3 (consumes the toggle)

**Files likely touched:**
- `src/lib/tests/settings.ts`
- `src/components/settings/test-settings.tsx`

**Estimated scope:** Small (2 files)

---

## Task 5: Landing page + docs copy (parity)
**Description:** AGENTS.md requires landing-page parity for new capabilities and
the docs live next to the app. Update `src/app/page.tsx` (Features/FAQ or Tests
copy) to mention that the AI assistant can offer the business's tests on demand
with a confirmation (and is switchable in Test Settings), and update
`src/app/docs/tests/page.tsx` to document the AI-driven flow alongside the
existing keyword/entry-test paths.

**Acceptance criteria:**
- [ ] Landing page mentions AI-offered tests with confirmation
- [ ] Docs tests page documents the AI-offered flow and the enable/disable switch

**Verification:**
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] Manual: landing + docs render the new copy

**Dependencies:** Tasks 1-4 (feature shipped)

**Files likely touched:**
- `src/app/page.tsx`
- `src/app/docs/tests/page.tsx`

**Estimated scope:** Small (2 files)

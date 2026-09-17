# Implementation Plan: AI-Driven Test Offers With Confirmation

## Overview

Today a business's WhatsApp "tests" module and its AI assistant are two separate
configs: the AI knows nothing about the business's tests, so offering a test
requires a *separate* automation (an entry-test screening or a `dispatch_test`
step configured in the builder canvas). This plan makes the standalone AI the
single place tests are offered: the model is told which tests a business has,
and when a customer *seems* to want to take one, the AI calls a `start_test`
Gemini tool instead of answering. The tool does NOT start the test — it stages a
pending offer in `user_sessions` — and the AI's own reply becomes the
confirmation question, sent as WhatsApp buttons (`Start` / `Not Now`). The
customer's next reply is consumed by the existing test-session runtime: confirm →
`beginSession` runs the exact same test path as today (intro fields, questions,
grading, credits, timed-exam once-per-phone guard); decline → the offer row is
cleared and the AI keeps chatting normally.

**A per-business switch enables/disables the whole integration.** The switch
lives with the existing tests settings (admin UI → Tests & Practice Settings).
Off ⇒ the AI never sees the business's tests and never calls `start_test`;
existing keyword/entry-test automations keep working untouched.

**Credit accounting is unchanged.** The AI reply that asks the confirmation
question costs 1 `ai_chat` credit up front (`ai-worker.ts:446`, today's AI
pricing). Running the test then costs 1 `test_attempt` credit on completion
(`runtime.ts:777`, today's test pricing). During the test the AI is never called:
`handledByTest=true` short-circuits AI job scheduling (`ai-worker.ts:107-113`),
so no AI cost is incurred mid-test. Total for a confirmed attempt = 1 AI + 1
test credit; a declined offer costs only the 1 AI reply. Credit code itself is
not touched.

No DB migrations. No new automation step. The `dispatch_test` / entry-test
configs keep working unchanged (the AI path and the deterministic path are
already mutually exclusive via `handledByTest`); businesses simply no longer need
a duplicate keyword automation to offer tests.

## Architecture Decisions

- **Trigger = Gemini tool call (`start_test`).** The current Gemini function
  calling loop (`src/lib/automations/gemini-client.ts:132-222`) already exists
  for `search_business_data` and runs one function-call round-trip then a final
  text response. We add a second function declaration, `start_test`, and let the
  model decide when intent is present. Tooling stays opt-in per call via a new
  `GeminiCallOptions.tools` option, defaulting to today's behavior so the
  automation-engine path (`engine.ts:803` `assign_to_ai`) is unaffected. Only the
  standalone assistant call site (`ai-worker.ts:428`) enables it.
- **Confirm-first, always.** A `start_test` call only stages an offer; the test
  is never started on the tool call. This is the user's core requirement
  ("a confirmation question when user seems to want to use the test module") and
  prevents accidental starts during unrelated conversation.
- **Pending state lives in `user_sessions`, not a new table.** Reuse the
  existing session row and claim machinery (`runtime.ts` CAS on
  `last_interaction_at`). Add the value `'confirm'` to the session `stage`
  union (currently `'intro' | 'question'`). No schema change: `session_data` is
  JSONB. The offer row is short-lived: confirm → `beginSession` overwrites it;
  decline → row deleted so no future message is intercepted.
- **Buttons, not typed YES/NO.** The test runtime already sends WhatsApp buttons
  via `engineSendInteractive` (`meta-send.ts:59`). The AI worker appends the
  same style of buttons (`test:confirm` / `test:cancel`) after the model's
  confirmation text. `handleTestReply` recognizes those ids; a typed "yes"/"no"
  reply is normalized as a fallback for customers who don't tap.
- **All test gates are inherited for free.** The confirm path lands in
  `beginSession` (same as `dispatch_test` today), so timed-exam
  once-per-phone, inactivity timeout, per-attempt credit, start message, intro
  fields, and routing all behave identically. `stageTestOffer` pre-checks the
  two cheap disqualifiers (`isAttemptBlocked`, already-active session) so the
  model can be told "don't offer" rather than offering an unstartable test.
- **Test inventory is injected via the system prompt.** In `executeAiJob`, active
  tests for the business (`title`, `description`, `mode`, `duration_minutes`,
  `is_entry`) are listed the same way spreadsheets are today
  (`ai-worker.ts:381-388`), with instructions to call `start_test` when the
  customer expresses intent. This block and the tool are gated on the per-business
  switch.
- **Per-business enable switch.** New key `enable_ai_test_offers` in
  `business_settings.value` (JSON — no schema change), surfaced as a Switch in
  the existing Test Settings card (`src/components/settings/test-settings.tsx`)
  alongside the inactivity timeout. Default: **on** when no setting exists and the
  business has active tests (existing businesses get the feature without
  configuration). Off ⇒ `executeAiJob` omits the AVAILABLE TESTS block and does
  not hand the `start_test` tool to the model; deterministic test paths are
  unaffected.
- **Credit model is untouched (explicit).** No changes to `credits/index.ts`.
  AI: `ai_chat` consumed when the confirmation reply is generated/sent.
  Test: `test_attempt` consumed on attempt completion via `persistAttempt`. AI is
  never invoked during the test (`handledByTest` short-circuit), so test time
  costs no AI credits.
- **Landing-page parity (AGENTS.md).** "AI can offer your tests on demand" is a
  new capability of the tests feature → the marketing landing page (`src/app/page.tsx`)
  and the docs tests page (`src/app/docs/tests/page.tsx`) get matching copy.

## Dependency Graph

```
Tests runtime: stageTestOffer + confirm handling (T1)   ◄── foundation
    │
    ├── Gemini tool declaration + handler (T2)   ◄── calls runtime.ts T1
    │         │
    │         └── AI worker: intent prompt + tool enable + buttons send (T3)
    │                   │
    │                   └── Per-business switch (T4)  ◄── gates T3's prompt/tool
    │                             │
    │                             └── Docs + landing copy (T5)
Typecheck/build/tests checkpoint after T1-T3.
```

## Task List

### Phase 1: Test-session confirm flow
- [x] Task 1: Runtime staging & confirm handling in `src/lib/tests/runtime.ts`
- [x] Task 2: Gemini `start_test` tool in `src/lib/automations/gemini-client.ts`
- [x] Task 3: AI worker intent context + confirmation buttons in `src/lib/whatsapp/ai-worker.ts`

### Checkpoint: Core flow
- [x] `npm run typecheck` passes
- [x] `npm run build` passes
- [ ] End-to-end: customer hints at a test → AI asks "start?" with buttons → tap Start runs the test; tap Not Now leaves AI chatting; "already attempted" timed test is never offered (needs live WhatsApp / Gemini test run)

### Phase 2: Admin switch & parity
- [x] Task 4 (required): per-business `enable_ai_test_offers` switch in `business_settings` + Test Settings admin UI; gates AI context/tool in Task 3
- [x] Task 5: Landing page + docs copy
- [ ] Checkpoint: full spec review with human

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Model calls `start_test` mid-unrelated conversation and spams offers | Med | Confirm-first design + prompt instruction to only offer on clear intent; `stageTestOffer` is idempotent and replaces, not duplicates, the pending row |
| Buttons + AI text double-send or AI talks over the just-started test | Med | `handledByTest=true` short-circuits AI scheduling (existing `ai-worker.ts:111`); `stageTestOffer` rejects when an active test session exists |
| Pending offer survives forever and intercepts later messages | Low | Offer cleared on decline; unrecognized reply re-asks (nudge pattern); handled before the inactivity-timeout block so stale offers get the "session closed" message like other idle sessions |
| Timing: AI job is debounced 5s; user replies before offer staged | Low | Offer is only readable after the AI reply is sent; a confirm tap without an existing row short-circuits as unhandled and chats normally |
| Tool availability leaks into `assign_to_ai` engine path | Low | `tools` is opt-in per call; only `ai-worker.ts:428` enables `start_test` |
| Credits double-charged (AI charged twice, or AI charged during the test) | Med | Zero changes to credit code; `ai_chat` charged once for the confirmation reply (existing `ai-worker.ts:446` path, skipped when `handledByTest`); `test_attempt` charged once at completion (`runtime.ts:777`). Verified via test-session run-through |
| Switch off still offers tests | Low | Same `getBusinessSettings` source of truth read in `executeAiJob` gates both the AVAILABLE TESTS prompt block and the `start_test` tool; defaults on only when active tests exist |

## Open Questions

- Should the confirmation buttons also be offered for practice (free) tests, or
  only timed/paying ones? Current plan: always confirm (matches user request).
- Should `dispatch_test` automations + entry-test screening be soft-deprecated in
  docs later, or kept as the deterministic fallback? Current plan: keep, document
  both paths.
# Implementation Plan: AI Escalation & Human Handoff

## Overview

Today the AI sets `conversations.escalated = true` when it detects anger/refund/
"human" intent or the model emits an `[ESCALATE]` marker
(`src/lib/whatsapp/ai-worker.ts:526-540`) — but the flag is a dead end: **nothing
in the inbox reads it, no tag is applied, no agent is notified, and it can never
be cleared**. The docs and landing page already *promise* a "Bot" tag + inbox
notification that do not exist (`docs/ai:78-84`, `docs/faq:36`, `src/app/page.tsx:101`).

This feature makes escalation a first-class, agent-actionable signal: when the AI
can't answer **or** the customer asks for a human, the conversation is flagged,
the contact is tagged, the team sees it in-app, and an agent can take over or
return the conversation to the AI.

## Current State (verified)

| Capability | Status | Where |
|---|---|---|
| `conversations.escalated` flag | Written, never read, never reset | `014_advanced_ai_flow.sql:8`; `ai-worker.ts:528` |
| `conversations.human_takeover` | Set only by the inbox AI switch | `ai-worker.ts:259`, `message-thread.tsx:622` |
| Conversation list filters | Status only (open/pending/closed) | `conversation-list.tsx:31-36,151-175` |
| Escalation badge / banner | None | — |
| Conversation-level tags | Do not exist (contacts only) | `001_initial_schema.sql:58-79` |
| Agent notifications | None (only super-admin `admin_alerts`) | `admin-alerts.ts`; `use-total-unread.ts` |
| `Conversation` TS type | Omits `escalated`/`paused` | `src/types/index.ts:63-79` |

## Architecture Decisions

- **Source of truth = existing `conversations.escalated` boolean.** No new
  column. Add a partial index for list filtering (optional). We also set
  `human_takeover = true` on escalation (when auto-pause is on) so the existing
  guardrail stops AI *and* the inbox AI switch shows "off".
- **Tagging = reserved per-business contact tag** (default name `Needs human`),
  applied via existing `contact_tags`. Auto-provision the tag on first use.
  Conversation visibility comes from the `escalated` flag, not a tag (there is no
  `conversation_tags` table, and we won't add one).
- **Detection = pure, unit-tested helper.** Keep the prompt `[ESCALATE]`
  convention but broaden keyword matching (word-boundary), centralized in
  `detectEscalation()`.
- **Notifications = in-app only** this pass (conversation badge + "Needs
  attention" filter + existing sidebar unread). No new notifications table, no
  email.
- **Reset path** = agent actions "Take over" (pause AI) and "Resolve" / "Return
  to AI" (clear `escalated`, resume AI).
- **Policy is configurable** via `business_settings.value.escalation` (reusing
  `updateBusinessSettings()` merge helper from the AI-schedule feature), so
  keyword lists and auto-pause can be tuned per business without code changes.
- **Landing/doc parity** (AGENTS.md): the existing promise in `page.tsx` /
  `docs/*` must be reconciled with the shipped behaviour.

## Dependency Graph

```
Types + pure detectEscalation()          (Task 1)
        │
        └── recordEscalation() server helper + ai-worker integration   (Task 2)
                    │
                    ├── Inbox list: badge + "Needs attention" filter    (Task 3)
                    │           │
                    │           └── Thread banner + Take over/Resolve   (Task 4)
                    │
                    └── Escalation policy setting + AI Hub card         (Task 5)
                                │
                                └── Reserved tag provisioning/guard      (Task 6)
                                            │
                                            └── Landing + docs copy      (Task 7)
```

## Task List

### Phase 1 — Detection & recording (foundation)

## Task 1: Escalation detection utility

**Description:** Add a pure, dependency-free helper that decides whether a turn
should escalate, so the rule is testable and reused by the worker and the engine.

**Acceptance criteria:**
- [ ] `DEFAULT_ESCALATION_KEYWORDS` exported (human, agent, representative, manager, support, "talk to someone", "speak to a person", refund, angry, complaint).
- [ ] `detectEscalation({ aiText, lastUserMessage, keywords })` returns `{ escalated, reason: 'ai_marker' | 'keyword' | null }`.
- [ ] `[ESCALATE]` in `aiText` → `ai_marker`; word-boundary keyword match (case-insensitive) in `lastUserMessage` → `keyword`; otherwise no escalation.
- [ ] `EscalationPolicy` type: `{ enabled, autoPauseAi, keywords, tagName }` with defaults.

**Verification:** focused unit tests (`schedule.test.ts` pattern); typecheck.

**Dependencies:** None.
**Files:** `src/lib/ai/escalation.ts`, `src/lib/ai/escalation.test.ts`
**Scope:** Small (2 files)

## Task 2: Record escalation + wire into the AI worker

**Description:** Persist an escalation idempotently and stop the AI, applying the
reserved tag and bumping unread so the team notices.

**Acceptance criteria:**
- [ ] `recordEscalation(db, { conversationId, businessId, contactId, policy })` returns `true` only when it newly escalates (no-op if already `escalated`).
- [ ] When escalation fires: set `escalated = true`; when `policy.autoPauseAi` also set `human_takeover = true`; ensure the reserved tag exists for the business and upsert it into `contact_tags`; bump `unread_count`; write an `http_logs` event (`note: 'escalation_triggered'`).
- [ ] `ai-worker.ts` replaces the inline block at `:526-540` with a call to `detectEscalation()` + `recordEscalation()`, using the business's policy.
- [ ] `[ESCALATE]` is still stripped from the customer-facing text.
- [ ] (Optional) migration `066` adds a partial index `(business_id) WHERE escalated`.

**Verification:** unit tests for the idempotency/branch logic (mock db); typecheck;
lint; if migration added, apply to staging + prod via the Management API and verify.
**Dependencies:** Task 1.
**Files:** `src/lib/whatsapp/ai-worker.ts`, `src/lib/ai/escalation.ts` (server fn), `supabase/migrations/066_*` (optional)
**Scope:** Medium (2-3 files)

### Checkpoint: After Tasks 1-2
- [ ] Focused tests pass; typecheck + build clean
- [ ] Manual: a keyword message / `[ESCALATE]` sets `escalated` + tag + unread in DB
- [ ] Review with human before UI work

### Phase 2 — Inbox surfacing (agent can see & take over)

## Task 3: Conversation type, list badge & "Needs attention" filter

**Description:** Surface escalated conversations so an agent can find them fast.

**Acceptance criteria:**
- [ ] `Conversation` type gains `escalated?`, `paused?`, `assigned_to?`.
- [ ] `conversation-list.tsx`: an "Escalated"/"Needs attention" filter option plus a visible badge on escalated rows.
- [ ] Realtime merge carries the new fields (no code change needed beyond the type).

**Verification:** typecheck; lint; manual on staging — escalated conversation shows badge + is filterable.
**Dependencies:** Task 2.
**Files:** `src/types/index.ts`, `src/components/inbox/conversation-list.tsx`
**Scope:** Medium (2 files)

## Task 4: Thread escalation banner + Take over / Resolve / Return to AI

**Description:** Give agents one-click control over an escalated conversation.

**Acceptance criteria:**
- [ ] `message-thread.tsx` shows an escalation banner when `conversation.escalated`.
- [ ] "Take over" sets `human_takeover = true` (pauses AI, clears `escalated`); "Return to AI" clears `escalated` + sets `human_takeover = false`; "Resolve" clears `escalated` and leaves AI state unchanged.
- [ ] Handlers wired through `src/app/(dashboard)/inbox/page.tsx` so list + thread stay in sync.
- [ ] Actions are accessible (labelled buttons, not colour-only).

**Verification:** typecheck; lint; manual end-to-end on staging: AI escalates → banner appears → Take over → AI stays off → Return to AI → AI resumes.
**Dependencies:** Task 3.
**Files:** `src/components/inbox/message-thread.tsx`, `src/app/(dashboard)/inbox/page.tsx`
**Scope:** Medium (2 files)

### Checkpoint: After Tasks 3-4
- [ ] End-to-end escalation → visible → takeover → reset works on staging
- [ ] Review with human before policy/parity work

### Phase 3 — Policy, reserved tag, parity

## Task 5: Escalation policy setting + AI Hub card

**Description:** Let businesses tune escalation (on/off, auto-pause, keywords,
tag name) without code changes.

**Acceptance criteria:**
- [ ] `business_settings.value.escalation` read by `getBusinessSettings()` (defaults when absent) and written via `updateBusinessSettings()`.
- [ ] New "Escalation" card in the AI Hub (enable toggle, auto-pause toggle, comma-separated keywords, tag name) — mirrors the AI-availability card pattern.
- [ ] Save goes through a validated route (reuse the `/api/ai-schedule` pattern).

**Verification:** typecheck; lint; manual: change keywords on staging → new keyword triggers escalation.
**Dependencies:** Task 2.
**Files:** `src/lib/tests/settings.ts`, `src/lib/ai/escalation.ts`, `src/components/ai/ai-escalation.tsx`, `src/app/api/ai-escalation/route.ts` (+ test), `src/app/(dashboard)/ai/page.tsx`
**Scope:** Medium (5 files)

## Task 6: Reserved tag provisioning & delete guard

**Description:** Ensure the reserved tag exists and can't be accidentally removed.

**Acceptance criteria:**
- [ ] Reserved tag auto-created per business on first escalation (done in Task 2); no duplicates.
- [ ] `tag-manager.tsx` prevents editing/deleting the reserved escalation tag (or clearly labels it "system").
- [ ] Deleting the reserved tag doesn't orphan escalations (they still surface via `escalated`).

**Verification:** typecheck; lint; manual on staging.
**Dependencies:** Task 2.
**Files:** `src/components/settings/tag-manager.tsx` (+ helper)
**Scope:** Small (1-2 files)

## Task 7: Landing + docs parity

**Description:** Reconcile the existing "Bot tag + inbox notification" promise
with the shipped behaviour.

**Acceptance criteria:**
- [ ] `src/app/page.tsx`: FAQ/feature copy describes tagging + "needs attention" inbox (AGENTS.md landing-parity rule).
- [ ] `src/app/docs/ai/page.tsx` "When the AI replies" section matches the real tag name + reset actions.
- [ ] `src/app/docs/faq/page.tsx` escalation answer corrected.

**Verification:** typecheck; lint; manual copy review.
**Dependencies:** Tasks 3-6.
**Files:** `src/app/page.tsx`, `src/app/docs/ai/page.tsx`, `src/app/docs/faq/page.tsx`
**Scope:** Small (3 files)

### Checkpoint: Complete
- [ ] All acceptance criteria met
- [ ] typecheck + lint + build clean
- [ ] Staging verified end-to-end; then prod
- [ ] Ready for review

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Keyword false positives ("human" in normal text) | Med | Word-boundary matching, `[ESCALATE]` primary signal, keywords configurable/disable-able |
| Auto-pausing AI hurts responsiveness | Med | `autoPauseAi` toggle (default on); agent "Return to AI" resets instantly |
| Repeated escalation on every message | Low | `recordEscalation` idempotent on `escalated` |
| Reserved tag spam / duplicates | Low | Upsert on `(contact_id, tag_id)`; tag looked up by `(business_id, name)` |
| Docs promise behaviour we don't ship | Low | Task 7 reconciles copy; landing-parity rule enforced |

## Open Questions (need human input)

1. On escalation, should the AI **auto-pause** immediately (recommended, default on) or keep replying until an agent acts?
2. Reserved tag name — **"Needs human"** ok, or prefer the docs' wording ("Bot")?
3. Should an escalated conversation also flip `status` to `pending`?
4. Email notification to the team in addition to in-app — now, or defer?
5. Is a partial index migration worth it now, or defer until volume demands it?

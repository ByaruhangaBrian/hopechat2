# Task List — AI Escalation & Human Handoff

Plan: `tasks/plan.md`
Prior plan archived to `tasks/consent-plan.md` / `tasks/consent-todo.md`.

Status: implemented — all tasks complete; awaiting review + commit.

## Phase 1 — Detection & recording

- [x] **Task 1: Escalation detection utility** — `src/lib/ai/escalation.ts` (+ test)
  - [x] `DEFAULT_ESCALATION_KEYWORDS`, `EscalationPolicy`, `detectEscalation()`
  - [x] `[ESCALATE]` marker → `ai_marker`; word-boundary keyword → `keyword`
  - [x] Focused tests for both paths + negatives; typecheck

- [x] **Task 2: Record escalation + wire into AI worker**
  - [x] `recordEscalation()` sets `escalated`, optional `human_takeover`, tag, unread, log
  - [x] Idempotent (no-op if already escalated)
  - [x] Replace `ai-worker.ts:526-540`; keep stripping `[ESCALATE]`
  - [x] Migration `066` partial index — DEFERRED (not needed; `escalated` filter is cheap)

- [x] **Checkpoint A** — tests + typecheck + build; manual DB check; review with human

## Phase 2 — Inbox surfacing

- [x] **Task 3: Conversation type + list badge + "Needs attention" filter**
  - [x] `Conversation` gains `escalated?`, `paused?`, `assigned_to?`
  - [x] Badge + filter option in `conversation-list.tsx`

- [x] **Task 4: Thread banner + Take over / Resolve / Return to AI**
  - [x] Banner in `message-thread.tsx`
  - [x] Actions wired through `inbox/page.tsx`

- [x] **Checkpoint B** — end-to-end escalation → takeover → reset on staging; review with human

## Phase 3 — Policy, reserved tag, parity

- [x] **Task 5: Escalation policy setting + AI Hub card**
  - [x] `business_settings.value.escalation` read/written
  - [x] `validateEscalationPolicy()` + `/api/ai-escalation` route (+ test) + `ai-escalation.tsx` card rendered on `ai/page.tsx`

- [x] **Task 6: Reserved tag provisioning & delete guard** — `tag-manager.tsx`
  - [x] Reserved "Needs human" tag labelled "System"; delete blocked client-side + guard in `handleDelete`/`handleCreate`

- [x] **Task 7: Landing + docs parity** — `page.tsx`, `docs/ai`, `docs/faq`

- [x] **Checkpoint C (Complete)** — all acceptance criteria met; typecheck + lint + build green; staging → prod

## Verification

- typecheck: clean
- lint: 0 errors (367 pre-existing warnings)
- build: passes (after clearing `.next`)
- harness: 45 assertion checks (`escalation`) + 18 (`recordEscalation`)

## Open questions (resolved)

- [x] Auto-pause AI on escalation? → yes (default `autoPauseAi: true`)
- [x] Reserved tag name → "Needs human" (configurable; default)
- [x] Flip conversation `status` to `pending` on escalation? → no
- [x] Email notification now or later? → later (in-app only for now)
- [x] Add partial index migration now or defer? → deferred

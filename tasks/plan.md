# Implementation Plan: School Test/Practice Module (replaces Interactive Menus & Assessments)

## Overview

Replace the multi-level `workflow_nodes` node-builder ("Interactive Menus & Assessments") with a focused **Tests & Practice** module for WhatsApp. The admin configures a module and picks its **mode**: *Practice* (no time pressure, correct answer revealed after each question) or *Test* (a timed exam with `duration_minutes`, scored only at the end), plus an **Active** toggle to publish/unpublish it. A student triggered via an automation step (or a message) walks through: configurable intro questions (class, subject, …) → practice questions **one at a time** → final score with a "start over" option. Questions can be added one-by-one or **bulk-imported from a provided/downloadable CSV template**. The flat two-table model (test + questions) eliminates the cascade-delete bugs of the old tree, and optimistic UI updates remove the "new nodes take long to show" problem.

Decisions (confirmed with user):
- **Replace** the current node-builder entirely (old tables stay but become unused; not dropped this iteration).
- **Runtime flow:** intro questions → one-at-a-time practice questions → final score + restart.
- **Bulk add:** downloadable CSV template + upload/parse/import.
- **Keep automation dispatch:** the `dispatch_workflow_node` step becomes `dispatch_test`, targeting a test instead of a tree node.

## Architecture Decisions

- **Two flat tables** (`tests`, `test_questions`) with `test_questions.test_id ... ON DELETE CASCADE`. Deleting a test or question is a single statement — no recursive cascade logic, so deletion is instant and cannot over-delete (fixes the delete bug).
- **Mode per test: Practice or Timed Test.** `tests.mode IN ('practice','test')`, `tests.duration_minutes INT NULL`, and `tests.is_active BOOLEAN` (the Active publish toggle). Practice mode reveals correct/incorrect after each answer; Test mode hides results until the end and shows time used + pass/fail against `pass_mark`.
- **Time limit is enforced server-side at submit time** (compare `now()` vs `session started_at + duration_minutes`): a late answer is rejected with "Time's up — your final score is X". No client timers, no cron dependency. An optional scheduled "time is up" push can be added later via the existing automation cron.
- **The send/answer loop is deterministic server-side — NOT Meta Flow JSON and NOT AI.** We use the existing mechanism already in the codebase: send WhatsApp interactive **buttons** through the Business Cloud API (`meta-send.ts`/`meta-api.ts`), the customer's tap arrives as a webhook callback to our app, and our backend grades the answer and sends the next question. Grading is exact string/number matching, so an LLM is neither used nor appropriate.
- **Sessions reuse `user_sessions`**: continue existing table from migration 052; running state lives in `session_data` (module: `test`, `test_id`, stage `intro`/`question`, index, `intro_answers`, `score`, `answered`, `started_at`). `quiz_score` column mirrors the running score for easy debugging.
- **Intro questions are configurable JSONB** on the test (`[{ key, label, type: 'choice'|'text', options: [] }]`) — teacher defines which profile questions to ask and their options.
- **Practice questions are multiple choice** with `options jsonb [{key,label}]`, `correct_answer` (option key), `points`, `position`. Auto-graded. Open/text practice questions are out of scope to keep the runtime simple.
- **Automation step renamed to `dispatch_test`** with config `{ test_id }`; a data migration rewrites existing `dispatch_workflow_node` rows. The automation builder dropdown lists tests (fetched with `no-store` + on tab focus).
- **No browser caching anywhere** in the new module: all GET handlers send `Cache-Control: no-store`; all client fetches use `cache: "no-store"`. Combined with optimistic state updates, creates/deletes render instantly.
- **Reuse the WhatsApp send wrappers** (`meta-send.ts`, `meta-api.ts`) for interactive buttons/list messages and limit validation.
- **Old code is removed, not left half-wired**: `node-builder.tsx`, `/api/workflow-nodes/*`, and the old `src/lib/workflow-nodes/runtime.ts` are deleted and replaced so there are no dangling references.
- **Migration numbering:** next Supabase migration is `053`. RLS reuses `get_user_business_id()` / `is_admin_view_all()` helpers (already proven in 052).

## Dependency Graph

```
Migration 053 (tests + test_questions + RLS + step rename)   ← T1
   ├── Types (Test, TestQuestion, DispatchTestStepConfig)    ← T2
   │     ├── Tests API routes                                ← T3a, T3b
   │     └── Runtime + Automation (engine/validate/builder)  ← T4, T5
   └── UI (TestBuilder, questions, bulk import)              ← T6, T7, T8
Cleanup + landing page + verification                         ← T9
```

Implementation order is bottom-up: schema → types → APIs → runtime/automation → UI → cleanup.

## Task List

### Phase 1: Foundation (Schema + Types + APIs)

- [ ] **Task 1:** Migration `053_school_test_module.sql` — `tests` (with `mode`, `duration_minutes`, `is_active`, `pass_mark`) + `test_questions` tables, indexes, RLS, `ON DELETE CASCADE`, and a data migration renaming `automation_steps.step_type='dispatch_workflow_node'` → `'dispatch_test'` with `step_config = jsonb_build_object('test_id', step_config->>'node_id')`.
- [ ] **Task 2:** Types — add `Test`, `TestQuestion`, `IntroField`; replace `DispatchWorkflowNodeStepConfig` with `DispatchTestStepConfig { test_id }`; update `AutomationStepType` union and `AutomationStepConfig`.
- [ ] **Task 3a:** `GET/POST /api/tests` + `GET/PATCH/DELETE /api/tests/[id]` (with `question_count`, questions ordered by position, `no-store` headers, business scoping + impersonation).
- [ ] **Task 3b:** `POST /api/tests/[id]/questions` (single or bulk rows) + `PATCH/DELETE /api/tests/[id]/questions/[qid]`.

### Checkpoint: Foundation
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] Migration applied; API CRUD verified manually (create test, add 3 questions, fetch, delete one question, delete test removes all)

### Phase 2: Runtime + Automation

- [ ] **Task 4:** New `src/lib/tests/runtime.ts` — `startTest(contactId, testId)` and `handleTestReply(contactId, text)` implementing intro → questions → final score → restart; **practice vs timed-test behavior** (practice reveals answers inline; test enforces the deadline server-side and reports time used + pass/fail); update the webhook call site to use it.
- [ ] **Task 5:** Automation integration — engine dispatch case calls `startTest`; `validate.ts` requires `test_id`; builder: STEP_META/ADDABLE_STEPS/blankConfig/previewFor + StepEditor dropdown lists tests (no-store + focus refetch); update `validate.test.ts`.

### Checkpoint: Core Path
- [ ] `npx tsc --noEmit` passes; `npm run build` passes
- [ ] Simulation walkthrough of one full test session in code review (vitest is blocked in this environment — see Risks)

### Phase 3: UI

- [ ] **Task 6:** `TestBuilder` — list view (cards with question counts, **mode badge**, Active toggle, delete) + editor for title, description, start message, **mode selector (Practice / Timed Test with `duration_minutes` input)**, **configurable intro fields** (add/remove/reorder; label + type choice/text + options), pass mark, shuffle. Optimistic updates, no-store.
- [ ] **Task 7:** Questions management — add single question, edit, delete (immediate), reorder up/down.
- [ ] **Task 8:** Bulk import — `src/lib/csv.ts` (parse + generate), **Download Template** button (CSV: question, option_a…option_e, correct_answer, points), file upload → parse → validate → preview count → bulk POST → optimistic list update.

### Checkpoint: UI Complete
- [ ] Create a test with intro fields + questions; import a template CSV; delete a question and a whole test — all reflect instantly without manual refresh

### Phase 4: Cleanup + Polish

- [ ] **Task 9:** Remove `node-builder.tsx`, `/api/workflow-nodes/*`, old `workflow-nodes` runtime + tests; sidebar label → "Tests & Practice"; landing page section + FAQ updated (per AGENTS.md parity rule); final `tsc`/lint/build.

### Checkpoint: Complete
- [ ] No references to `workflow_nodes`/`node_options`/old runtime remain in `src/`
- [ ] All acceptance criteria met; ready for review

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Supabase migration must be applied before the app ships | High | Migration is the first task; user runs `supabase db push` / migration runner; API calls fail loudly until applied |
| Vitest cannot run in this environment (Node 21.7.2 + rolldown `ERR_INVALID_ARG_VALUE ... ['underline','gray']`; Node 22.11.0 + `onLog` config error) — pre-existing toolchain issue | Med | Rely on `tsc`, eslint, `npm run build`, and manual/UI verification; runtime logic kept small and reviewed |
| WhatsApp interactive limits (≤3 buttons, ≤10 list items, label lengths) | Med | Reuse existing `meta-send.ts`/`meta-api.ts` validation; enforce in UI + POST |
| Existing `dispatch_workflow_node` automation rows become legacy | Low | Data migration rewrites them to `dispatch_test`; orphaned `node_id` values naturally become unset tests to re-pick |
| RLS helpers missing in new migration's context | Low | Reuse `get_user_business_id()` / `is_admin_view_all()` exactly as migration 052 does |
| Old `workflow_nodes`/`node_options` tables left unused | Low | Kept (not dropped) to avoid data loss this iteration; no code reads them after Task 9 |

## Open Questions

- Should the old `workflow_nodes` / `node_options` tables be **dropped** in a later migration, or kept forever? (Default: keep, deprecate.)
- Route URL: keep `/dashboard/menus` as the Tests & Practice home, or move to `/tests`? (Default: keep `/dashboard/menus` to avoid breaking nav/breadcrumbs.)
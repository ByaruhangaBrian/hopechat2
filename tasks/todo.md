# Task List — School Test/Practice Module

Legend: `[ ]` pending, `[x]` done. Each task is independently verifiable.

---

## Task 1: Migration 053 (schema + step rename)
**Description:** Create `tests` (with `mode`, `duration_minutes`, `is_active`, `pass_mark`) and `test_questions` with `ON DELETE CASCADE`, RLS mirroring migration 052, indexes, and rewrite existing `dispatch_workflow_node` automation steps to `dispatch_test`.

**Acceptance criteria:**
- [x] `tests` table has `mode CHECK (mode IN ('practice','test'))`, nullable `duration_minutes`, `is_active BOOLEAN DEFAULT true`, `pass_mark INT`
- [x] `tests` and `test_questions` tables exist with RLS policies using `get_user_business_id()` / `is_admin_view_all()`
- [x] Deleting a test cascades to its questions (FK `test_questions.test_id ... ON DELETE CASCADE`)
- [x] `automation_steps` rows with `step_type='dispatch_workflow_node'` are rewritten to `step_type='dispatch_test'` with `step_config = jsonb_build_object('test_id', step_config->>'node_id')`

**Verification:**
- [ ] Migration runs cleanly against Supabase
- [ ] SQL sanity: `SELECT COUNT(*) FROM test_questions WHERE test_id NOT IN (SELECT id FROM tests)` returns 0 after a cascade delete

**Dependencies:** None

**Files:**
- `supabase/migrations/053_school_test_module.sql`

**Estimated scope:** Medium (1-2 files)

---

## Task 2: Types
**Description:** Add `Test`, `TestQuestion`, `IntroField` types and replace the automation step config to reference a test.

**Acceptance criteria:**
- [x] `DispatchTestStepConfig { test_id: string }` replaces `DispatchWorkflowNodeStepConfig`; `AutomationStepType` union uses `dispatch_test`
- [x] `AutomationStepConfig` union updated; no remaining references to `DispatchWorkflowNodeStepConfig`

**Verification:**
- [x] `npx tsc --noEmit` passes

**Dependencies:** Task 1

**Files:**
- `src/types/index.ts`

**Estimated scope:** Small (1 file)

---

## Task 3a: Tests API (list + create + single)
**Description:** `GET/POST /api/tests` and `GET/PATCH/DELETE /api/tests/[id]`, business-scoped, `no-store` headers, auth via cookie session (same pattern as workflow-nodes API incl. impersonation).

**Acceptance criteria:**
- [x] `GET /api/tests` returns tests with `question_count`, ordered by `created_at desc`
- [x] `POST /api/tests` creates a test; `GET/PATCH/DELETE /api/tests/[id]` work for the owning business only
- [x] `DELETE` removes the test and all its questions (verified via follow-up GET)
- [x] Responses include `Cache-Control: no-store`

**Verification:**
- [x] `npx tsc --noEmit` passes
- [ ] Manual API check (authenticated): create → add questions → delete test → list shows it gone

**Dependencies:** Task 1, Task 2

**Files:**
- `src/app/api/tests/route.ts`
- `src/app/api/tests/[id]/route.ts`

**Estimated scope:** Medium (2 files)

---

## Task 3b: Questions API (single + bulk)
**Description:** `POST /api/tests/[id]/questions` accepts a single question or an array (bulk import); `PATCH/DELETE /api/tests/[id]/questions/[qid]` for editing/deleting one.

**Acceptance criteria:**
- [x] Bulk `POST` inserts many rows in one call under the owning test
- [x] `DELETE` removes one question instantly; `PATCH` updates fields and position
- [x] Name-length/option-count validation mirrors WhatsApp limits; responses are `no-store`

**Verification:**
- [x] `npx tsc --noEmit` passes
- [ ] Manual: bulk-insert 5 rows, delete one, verify order after PATCH

**Dependencies:** Task 3a

**Files:**
- `src/app/api/tests/[id]/questions/route.ts`
- `src/app/api/tests/[id]/questions/[qid]/route.ts`

**Estimated scope:** Small (2 files)

---

## Checkpoint: Foundation (after Tasks 1-3)
- [x] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] Manual end-to-end API walkthrough passes
- [ ] Review with human before proceeding

---

## Task 4: Test runtime
**Description:** New `src/lib/tests/runtime.ts` with `startTest(contactId, testId)` and `handleTestReply(contactId, text)`: intro questions → practice questions one at a time → final score + restart buttons; session lives in `user_sessions.session_data`. Update the webhook call site from the old `handleNodeInteraction`/`dispatchWorkflowNode`.

**Acceptance criteria:**
- [x] A new session starts at the first intro question; each reply advances one step
- [x] After the last intro question the first practice question is sent
- [x] Practice answers are graded (option key vs `correct_answer`), score accumulated
- [x] After the last question a score summary is sent with "Start Over" / "Done" options
- [x] `Start Over` resets the session and re-sends intro Q1; answers persist across separate WhatsApp messages
- [x] **Mode behavior:** `practice` reveals correct/incorrect after each answer; `test` shows results only at the end, enforces the deadline server-side (late reply → "Time's up", final score), and reports time used + pass/fail vs `pass_mark`; inactive tests cannot be started
- [x] No reference to the old `workflow-nodes` runtime remains

**Verification:**
- [x] `npx tsc --noEmit` passes
- [ ] Code-review a full simulated session (vitest blocked in this env)

**Dependencies:** Task 2, Task 3

**Files:**
- `src/lib/tests/runtime.ts`
- `src/lib/whatsapp/ai-worker.ts`
- `src/lib/workflow-nodes/runtime.ts` (deleted)
- `src/lib/workflow-nodes/runtime.test.ts` (deleted)

**Estimated scope:** Large (3-5 files) — split into start/advance/score if needed

---

## Task 5: Automation integration
**Description:** Engine dispatch case calls `startTest`; `validate.ts` requires `test_id`; builder lists tests in the step dropdown (no-store + focus refetch); update `validate.test.ts`.

**Acceptance criteria:**
- [x] `STEP_META`/`ADDABLE_STEPS`/`blankConfig`/`previewFor` use `dispatch_test` ("Start Test / Practice")
- [x] StepEditor dropdown shows tests by title (not tree nodes); empty state when none exist
- [x] `engine.ts` `dispatch_test` case calls `startTest` and fails the step on error
- [x] `validate.ts` flags a missing `test_id`

**Verification:**
- [x] `npx tsc --noEmit` passes
- [ ] `npx eslint` on changed files passes
- [ ] `npm run build` passes

**Dependencies:** Task 4

**Files:**
- `src/lib/automations/engine.ts`
- `src/lib/automations/validate.ts` + `validate.test.ts`
- `src/components/automations/automation-builder.tsx`

**Estimated scope:** Medium (3 files)

---

## Checkpoint: Core Path (after Tasks 4-5)
- [x] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] Full session trace reviewed (intro → questions → score → restart)
- [ ] Review with human before proceeding

---

## Task 6: TestBuilder — tests list + editor + intro fields
**Description:** New `TestBuilder` component rendering on `/dashboard/menus`: test cards list (title, question count, **mode badge**, **Active toggle**, edit, delete) and an editor for title, description, start message, **mode selector (Practice / Timed Test with duration input)**, pass mark, shuffle toggle, and the **configurable intro fields** manager (add/remove/reorder; each with label, type `choice`/`text`, and options for choice type).

**Acceptance criteria:**
- [x] New test creation appears in the list instantly (optimistic, no manual refresh)
- [x] Deleting a test removes it instantly (single DELETE, FK cascade)
- [x] **Mode selection:** admin picks Practice or Timed Test; Timed Test requires a `duration_minutes` value; mode + duration persist on save and show as a badge on the card
- [x] **Active toggle** publishes/unpublishes instantly (inactive tests show a "Paused" state and cannot be dispatched)
- [x] Intro fields are fully configurable (label + type + options per field) and persist on save
- [x] All fetches use `cache: "no-store"`

**Verification:**
- [x] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] Manual: create test, configure 3 intro fields, reload — data intact

**Dependencies:** Task 3a

**Files:**
- `src/components/tests/test-builder.tsx`
- `src/app/(dashboard)/dashboard/menus/page.tsx`

**Estimated scope:** Medium (2-4 files)

---

## Task 7: Questions management
**Description:** Per-test questions panel: add one question (question text, options A-E, correct answer, points), edit inline, delete immediately, reorder up/down.

**Acceptance criteria:**
- [x] Adding/editing/deleting a question reflects instantly (optimistic + `no-store` re-sync)
- [x] Correct-answer selection and points persist; reorder updates positions

**Verification:**
- [x] `npx tsc --noEmit` passes
- [ ] Manual: add 3 questions, delete one, reorder — list stays accurate after reload

**Dependencies:** Task 6, Task 3b

**Files:**
- `src/components/tests/test-builder.tsx` (QuestionsEditor inline)

**Estimated scope:** Medium (1-2 files)

---

## Task 8: Bulk import (template + upload)
**Description:** `src/lib/csv.ts` (parse + generate). "Download Template" produces a CSV (question, option_a, option_b, option_c, option_d, option_e, correct_answer, points) with a filled example row. Upload parses, validates rows, shows a preview count, and bulk-POSTs to the questions API.

**Acceptance criteria:**
- [x] Template downloads with header row + one example row
- [x] Valid CSV imports in one call and the list updates instantly
- [x] Rows with missing question text or invalid correct_answer are reported (not silently dropped)

**Verification:**
- [x] `npx tsc --noEmit` passes
- [ ] Manual: download template, fill 10 rows, upload → all 10 appear immediately

**Dependencies:** Task 3b, Task 7

**Files:**
- `src/lib/csv.ts`
- `src/components/tests/test-builder.tsx` (ImportDialog inline)

**Estimated scope:** Medium (2 files)

---

## Checkpoint: UI Complete (after Tasks 6-8)
- [x] Create test + intro fields + questions; import template; delete question and test — all instant
- [ ] Review with human before proceeding

---

## Task 9: Cleanup + polish
**Description:** Remove `node-builder.tsx`, `/api/workflow-nodes/*`; sidebar label → "Tests & Practice"; landing page Features/FAQ updated (AGENTS.md parity); final verification.

**Acceptance criteria:**
- [ ] No references to `workflow_nodes`/`node_options` or the old runtime in `src/`
- [ ] Sidebar shows "Tests & Practice" linking to `/dashboard/menus`
- [ ] Landing page promotes Tests & Practice (and automation dispatch) instead of Interactive Menus

**Verification:**
- [ ] `npx tsc --noEmit` passes; `npx eslint` clean (no new warnings)
- [ ] `npm run build` passes
- [ ] `git grep -i "workflow_node\|node-builder"` returns nothing in `src/`

**Dependencies:** All prior tasks

**Files:**
- `src/components/menus/node-builder.tsx` (delete)
- `src/app/api/workflow-nodes/*` (delete)
- `src/components/layout/sidebar.tsx`
- `src/app/page.tsx`

**Estimated scope:** Medium (3-5 files)

---

## Final Checkpoint
- [ ] All acceptance criteria met
- [ ] `npx tsc --noEmit`, `npx eslint`, `npm run build` all pass
- [ ] Manual flows verified (create/edit/delete test, bulk import, runtime session trace)
- [ ] Ready for human review
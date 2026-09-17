# Task List — Google Sheets Lookup Credit Charges

Legend: `[ ]` pending, `[x]` done. Each task is independently verifiable.
Commands: typecheck `npm run typecheck`, build `npm run build`, lint `npm run lint`.
(The vitest runner is broken on this machine (rolldown/Node `styleText`) — verify logic via node harness + typecheck/build.)

---

## Task 1: `spreadsheet_lookup` credit action in the credits lib
**Description:** In `src/lib/credits/index.ts` add the new action end-to-end:
`'spreadsheet_lookup'` to the `CreditAction` union, a `spreadsheet_lookup:
CreditCostEntry` to `CreditCosts`, a default entry in `DEFAULT_COSTS`
(`{ credits: 1, label: 'Google Sheets Lookup' }`), and a merge in
`getCreditCosts` so a missing/old DB row falls back to the default. Nothing else
changes — `checkCredits` / `consumeCredits` / ledger write are reused as-is.

**Acceptance criteria:**
- [ ] `getCreditCost('spreadsheet_lookup')` resolves from defaults when the DB row lacks the key, and from the stored value when present

**Verification:**
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] Node harness: `getCreditCost('spreadsheet_lookup') === 1` against a temp row and against no row

**Dependencies:** None

**Files likely touched:**
- `src/lib/credits/index.ts`

**Estimated scope:** XS (1 file)

---

## Task 2: Migration `058_sheet_lookup_credits.sql`
**Description:** New migration, mirroring the drop/recreate pattern in
`044_sms_broadcasts.sql`. (a) Drop + recreate `credit_usage_logs_action_check`
with the full allowed set **including the previously-missing `test_attempt`**
(fixes the latent gap where test ledger inserts silently fail today) and the new
`spreadsheet_lookup`. (b) Seed the default cost:
`UPDATE system_settings SET value = value || '{"spreadsheet_lookup": {"credits": 1, "label": "Google Sheets Lookup"}}'::jsonb WHERE id = 'credit_costs' AND NOT (value ? 'spreadsheet_lookup');`
(merge only — never clobbers admin-edited costs).

**Acceptance criteria:**
- [ ] Constraint allows `('ai_chat','interactive_form','bulk_broadcast','sms','test_attempt','spreadsheet_lookup')`
- [ ] `credit_costs` keeps existing keys and gains `spreadsheet_lookup` once

**Verification:**
- [ ] DB step: run against the live Supabase project, then `SELECT * FROM credit_usage_logs` inserts with `test_attempt` / `spreadsheet_lookup` both succeed

**Dependencies:** None (independent of code tasks)

**Files likely touched:**
- `supabase/migrations/058_sheet_lookup_credits.sql` (new)

**Estimated scope:** XS (1 file, 1 DB apply)

---

## Task 3: Admin Settings credit-cost editor row
**Description:** In `src/app/admin/settings/page.tsx`: add `spreadsheet_lookup`
to the `creditCosts` state initializer (default 1 / "Google Sheets Lookup") and
to the fetch merge in the `useEffect` (fallback like the other keys); add a
grid cell in the Credit System Configuration section alongside the
`test_attempt` card with an `Input[type=number]` updating only that key, and a
caption "per Google Sheets data lookup". The save handler already upserts the
whole `creditCosts` object — no change needed there.

**Acceptance criteria:**
- [ ] Admin panel renders the new cost field, loads stored/fallback value, and Save persists it under `credit_costs.spreadsheet_lookup`

**Verification:**
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] Manual: set 0 in admin → subsequent sheet lookups no longer deduct (optionally disable); set 5 → deducts 5

**Dependencies:** Task 1

**Files likely touched:**
- `src/app/admin/settings/page.tsx`

**Estimated scope:** S (1 file)

---

## Task 4: AI call site — `searchSheets` `apiCalled` + gate/consume
**Description:** Two changes.
(a) `src/lib/integrations/google-sheets.ts`: change `searchSheets` to return
`{ text: string; apiCalled: boolean }`. `apiCalled = false` for both
no-API early returns ("No spreadsheets configured…" and "Spreadsheet X not
found"); set it true immediately before any `values.get` attempt in
`searchSingleSheet` (including when that call later errors — Google still
billed it). `searchSingleSheet` needs to report its own `apiCalled` back.
(b) `src/lib/automations/gemini-client.ts`: in the `search_business_data`
handler, `checkCredits(businessId, 'spreadsheet_lookup')` first; on gate
failure return result text telling the model the business has insufficient
credits (do NOT query). Otherwise `const { text, apiCalled } = await
searchSheets(...)`; when `apiCalled`, `consumeCredits(businessId,
'spreadsheet_lookup', { referenceId: options.metadata?.conversation_id,
contactId: options.metadata?.contact_id, description:'AI Google Sheets lookup',
metadata: { spreadsheet: spreadsheetName, query } })` (non-fatal on failure),
then use `text` as the functionResponse as today.

**Acceptance criteria:**
- [ ] `searchSheets` contract change typed; sole consumer updated; no other callers (verifiable by build)
- [ ] Gate fails ⇒ no Sheets API call, AI told credits are insufficient
- [ ] Real query ⇒ exactly one `spreadsheet_lookup` credit deducted, logged with conversation/contact refs
- [ ] No-spreadsheet / sheet-not-found early returns ⇒ zero credits deducted

**Verification:**
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] Node harness: mocked sheets client — "ok" path returns `{text, apiCalled:true}` and deducts 1; missing-config path returns `apiCalled:false` and deducts 0
- [ ] Manual WhatsApp: ask the assistant e.g. "what's my balance in the sheet" → credit log shows 1 `spreadsheet_lookup`

**Dependencies:** Task 1

**Files likely touched:**
- `src/lib/integrations/google-sheets.ts`
- `src/lib/automations/gemini-client.ts`

**Estimated scope:** M (2 files)

---

## Task 5: Automation call site — `lookup_spreadsheet` gate/consume
**Description:** (a) In `src/lib/integrations/google-sheets.ts`, make the
pre-API "No spreadsheets configured for this business" throw a distinct
`export class SheetsNotConfiguredError extends Error` (keeping the message).
(b) In `src/lib/automations/engine.ts` `lookup_spreadsheet` case: before
`lookupRow`, `checkCredits(args.businessId, 'spreadsheet_lookup')` and `throw
new Error(...)` on failure (same style as the `assign_to_ai` credit gate).
Then wrap `lookupRow`: on a normal return (row found or null — API answered)
`consumeCredits(..., 'spreadsheet_lookup', { userId: args.automation.user_id,
referenceId, contactId, description: 'lookup_spreadsheet step', metadata:
{ sheet_name, search_column, search_value } })`; in `catch`, if the error is
NOT a `SheetsNotConfiguredError` (the API call was billed by Google even though
it errored), consume the same credit **then rethrow**; on
`SheetsNotConfiguredError` charge nothing and rethrow. If a consume itself fails,
throw so the flow fails explicitly.

**Acceptance criteria:**
- [ ] Step completes (row found or not-found) ⇒ exactly one `spreadsheet_lookup` credit deducted
- [ ] API-level throw (e.g. column not found) ⇒ credit deducted, step still fails
- [ ] Pre-API config throw (`SheetsNotConfiguredError`) ⇒ no deduction, step fails
- [ ] Insufficient credits ⇒ step fails before any Sheets API call, with a clear message

**Verification:**
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] Node harness: mocked-sheets `lookupRow` — found/not-found/column-error all consume exactly 1; not-configured consumes 0
- [ ] Manual: run a flow with a `lookup_spreadsheet` step → ledger shows the lookup credit alongside the `interactive_form` credit

**Dependencies:** Task 1

**Files likely touched:**
- `src/lib/integrations/google-sheets.ts`
- `src/lib/automations/engine.ts`

**Estimated scope:** S (2 files)

---

### Checkpoint: Core charging (after Tasks 1, 3, 4, 5)
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] Migration 058 applied to the DB; `test_attempt` + `spreadsheet_lookup` ledger inserts succeed
- [ ] Manual: AI data query = 1 `ai_chat` + 1 `spreadsheet_lookup`; lookup-spreadsheet step = 1 `spreadsheet_lookup` (+ `interactive_form` if in a flow); 0-credit business never triggers a Sheets query; no-spreadsheet early-return never deducts
- [ ] Human reviews before Phase 3

---

## Task 6: Docs + landing + billing-display copy (parity)
**Description:** AGENTS.md requires landing/docs parity, and the human confirmed
the dashboard billing screens must show the new action. (a)
`src/app/docs/billing/page.tsx` under "What are credits?" add a bullet:
`Google Sheets data lookup — 1 credit per spreadsheet query (only when the AI or an automation actually reads your spreadsheet).`
(b) `src/app/page.tsx`: add one line to the Tests-related FAQ (or the Pricing
note) stating that AI-driven spreadsheet lookups consume one credit per query.
(c) `src/components/settings/billing-plan.tsx` `ACTION_LABELS` and
`src/app/admin/credits/page.tsx` action map: add
`spreadsheet_lookup: { label: 'Google Sheets Lookup', ... }` and also add the
currently-missing `test_attempt: { label: 'Test Attempt', ... }` so both stop
falling back to raw action names in the Credit Usage table.

**Acceptance criteria:**
- [ ] Docs billing lists the new credit action
- [ ] Landing page mentions spreadsheet lookups consume credits
- [ ] Dashboard Billing Credit Usage and Admin credits view show "Google Sheets Lookup" and "Test Attempt" labels instead of raw action names

**Verification:**
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] Manual: docs + landing render the new copy; ledger rows render friendly labels

**Dependencies:** Tasks 1-5 (feature shipped)

**Files likely touched:**
- `src/app/docs/billing/page.tsx`
- `src/app/page.tsx`
- `src/components/settings/billing-plan.tsx`
- `src/app/admin/credits/page.tsx`

**Estimated scope:** S (4 files)

---

## Decisions recorded (human answers, round 1)
1. Default cost = **1 credit per Google Sheets lookup**.
2. Show `spreadsheet_lookup` on the dashboard Billing screen **and** the admin
   credits view (also restore the missing `test_attempt` label).
3. **Charge on API-error results for BOTH call sites** — AI path charges on any
   `searchSheets` result where the API ran; the engine step charges on
   API-level `lookupRow` throws (only the pure pre-API
   `SheetsNotConfiguredError` is exempt).
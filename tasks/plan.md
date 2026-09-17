# Implementation Plan: Google Sheets Lookup Credit Charges

## Overview

Today Google Sheets is a **free** integration: every time a business's data is
queried through the Sheets API — via the AI's `search_business_data` tool or a
`lookup_spreadsheet` automation step — no credits are deducted. But each of
those calls is real *paid* Google Cloud usage (Sheets API + OAuth are billed to
whatever GCP project hosts the service account). This plan adds a new credit
action, **`spreadsheet_lookup`**, deducted once per successful Sheets API query,
mirroring how `ai_chat` / `test_attempt` are already metered.

Scope is deliberately tight: grep confirms exactly **two** call sites invoke the
Sheets API —
`searchSheets` from `src/lib/automations/gemini-client.ts:225` (AI tool) and
`lookupRow` from `src/lib/automations/engine.ts:936` (`lookup_spreadsheet` step).
`getBusinessSpreadsheets` and `searchSingleSheet` are private helpers, and there
is **no** `appendRow`/`syncFromSheet` path anywhere in the codebase.

## Architecture Decisions

- **New credit action `spreadsheet_lookup`, default cost 1.** Added to the
  `CreditAction` union, the `CreditCosts` interface, `DEFAULT_COSTS`, and the
  `getCreditCosts` merge. Configurable by the super admin under Admin →
  Settings → Credit System Configuration (Task 3). No new DB table: the
  `credit_costs` row in `system_settings` is already a JSONB value that the admin
  UI upserts whole.
- **Gate *before* the API call, consume *after* success.** Paid-API billing
  rule: never let a Sheets query run for a business that can't pay for it, and
  never charge when the API didn't actually run.
  - `checkCredits(businessId, 'spreadsheet_lookup')` before calling,
    short-circuiting the call when credits are low (the AI is told "insufficient
    credits" instead of querying for free).
  - `consumeCredits(businessId, 'spreadsheet_lookup', { ... })` after a genuine,
    successful API response. Existing atomic-guarded deduction + `credit_usage_logs`
    ledger write are reused untouched.
- **`searchSheets` reports whether the API was actually invoked.** It has two
  early-return paths that make *zero* API calls ("No spreadsheets configured",
  and "Spreadsheet X not found"); those must not charge. Change its return type
  to `{ text: string; apiCalled: boolean }` — the function already has only one
  consumer (`gemini-client.ts`), so this is an internal, safe interface change.
  `apiCalled` becomes true the moment a `values.get` is attempted by
  `searchSingleSheet` (success or caught error — the API was billed either way).
- **`lookupRow` charges on any normal return AND on API-level errors.**
  A normal return (row found *or* null) means the API answered — charge. A
  throw after the API (e.g. "Column not found") also means Google billed the
  `values.get` — charge, then rethrow. The only exempt throw is the pre-API
  "No spreadsheets configured" case, which becomes a distinct
  `SheetsNotConfiguredError` so the engine can tell a real API call from a pure
  config error (per user Q3 decision: charge on student-facing get errors,
  never on zero-API-call paths).
- **Dashboard + admin billing UIs show the new action.** `ACTION_LABELS` in
  `src/components/settings/billing-plan.tsx` and the admin credits page action
  map get a `spreadsheet_lookup` entry (with the already-missing `test_attempt`
  added too — both currently fall back to raw action names in the UI).
- **Both paths use the existing ledger fields**: `referenceId` =
  conversation_id, `contactId` from context, `metadata` with sheet/query detail.
  `user_id` is null from `gemini-client` (it has no user context), matching
  today's pattern.
- **Stacking with existing charges is intended.** An AI reply that queries a
  spreadsheet now costs `ai_chat` (1) + `spreadsheet_lookup` (1); a
  `lookup_spreadsheet` step inside an interactive form flow costs
  `interactive_form` + `spreadsheet_lookup`. That is the point: the paid Google
  call is metered regardless of which feature triggered it. Failed or
  zero-result searches where no API call happened are free.
- **Migration 058 extends the `credit_usage_logs.action` CHECK.** Currently the
  constraint (last set in `044_sms_broadcasts.sql`) allows only
  `('ai_chat','interactive_form','bulk_broadcast','sms')`. This is a **latent
  bug**: the shipped tests feature consumes `test_attempt`, whose ledger inserts
  are silently rejected by the CHECK today. 058 drops + recreates the constraint
  to include `test_attempt` (fix) and `spreadsheet_lookup` (new), and seeds the
  default `spreadsheet_lookup` cost into `system_settings` when absent (merging,
  never clobbering admin-edited values).

## Dependency Graph

```
Credit lib: spreadsheet_lookup action + defaults (T1)   ◄── foundation
    │
    ├── Admin settings: cost editor row (T3)
    ├── AI call site: searchSheets apiCalled + gate/consume (T4)
    ├── Automation call site: lookup_spreadsheet gate/consume (T5)
    └── Docs + landing copy (T6)
Migration 058 (T2)   ◄── independent of code; applied to auth on the DB
Checkpoint after T1, T3-T5: typecheck/build + engine/run short-circuit verify
```

## Task List

### Phase 1: Foundation
- [ ] Task 1: `spreadsheet_lookup` action in `src/lib/credits/index.ts` (union type + defaults + `getCreditCosts` merge)
- [ ] Task 2: migration `supabase/migrations/058_sheet_lookup_credits.sql` (CHECK constraint incl. `test_attempt` + `spreadsheet_lookup`; seed default cost) — apply to the DB

### Phase 2: Charging call sites
- [ ] Task 3: Admin Settings → Credit System Configuration UI row for `spreadsheet_lookup`
- [ ] Task 4: `google-sheets.ts` `searchSheets` → `{ text, apiCalled }`; `gemini-client.ts` gate-then-consume around the `search_business_data` handler
- [ ] Task 5: `engine.ts` `lookup_spreadsheet` gate-then-consume, incl. consume on API-level throws (not on `SheetsNotConfiguredError`)

### Checkpoint: Core charging
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] Manual: AI data query deducts 1 `spreadsheet_lookup` credit while reply deducts `ai_chat`; automation `lookup_spreadsheet` deducts 1 (row found, not-found, and column-error all charge; misconfigured/no-spreadsheet never charges); business with 0 credits gets no spreadsheet query

### Phase 3: Parity
- [ ] Task 6: docs `billing` page bullet + landing page pricing/FAQ line + `billing-plan.tsx` / admin credits page action labels (`spreadsheet_lookup` + `test_attempt`)
- [ ] Checkpoint: full spec review with human; then push (approved commit)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `searchSheets` return-shape change breaks its consumer | Med | Single consumer confirmed by grep; TypeScript surfaces the break; bumped in the same commit as T4 |
| Over-charging spreadsheets: setup/preview or retry loops count as billable | Med | Charge strictly on "API actually answered" (`apiCalled`); no-charge for no-spreadsheet/not-found early returns to reduce noise |
| Double charge within one user action | Low | Each Sheets API call is billed once by whichever path invoked it; AI + step never both run for one message because the engine handles the reply once |
| Admin-set costs lost | Low | Migration merges (`NOT value ? 'spreadsheet_lookup'`), never overwrites the whole JSONB |
| `test_attempt` constraint drift on prod (if 058 not applied) | Low | 058 is a required, separate DB step; the ledger failure is silent-and-recoverable (balance still correct) |

## Open Questions

- **Default cost = 1 credit per Sheets lookup** — confirmed 1 credit by the human.
- **Dashboard Billing screen shows `spreadsheet_lookup`** — confirmed; also fix
  the invisible `test_attempt` label while editing the action maps.
- **Charge on API-error results** — confirmed for both sites (AI path charges
  when `apiCalled` even on error text; engine step charges on API-level throws,
  excluding the pre-API `SheetsNotConfiguredError`).
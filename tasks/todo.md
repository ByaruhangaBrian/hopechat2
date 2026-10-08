# Task List — Tenant Activity, Superadmin Sessions, T&C Consent

Legend: `[ ]` pending, `[x]` done. Commands: `npm run typecheck`, `npm run lint`,
`npm run build`, `npm test`. Migration runner: `node scripts/run-migrations.mjs`.
Per-file lint if full lint crashes: `npx eslint <file>`.

Plan: `tasks/plan.md`. The previous staging plan is archived untouched at
`tasks/staging-plan.md` / `tasks/staging-todo.md`.

## Meta checklist

- [ ] Human approved this plan (4 scope decisions confirmed this session).
- [ ] Every task has acceptance criteria + a verification step.
- [ ] Dependencies ordered (see plan dependency graph).
- [ ] No task touches more than ~5 files.
- [ ] Checkpoints exist between phases.

---

## Phase 1 — Foundation

### Task 1: Confirm Next 16 proxy API from shipped docs
- **Description:** Read `node_modules/next/dist/docs/` (AGENTS.md requirement)
  for the request/proxy entry point. Establish: exported function signature
  (is there a second `event` arg exposing `waitUntil`?), `config.matcher`
  semantics, which request headers are actually available, cookie API, and
  response-header mutation rules. Record findings as a short section in
  `tasks/plan.md` under Architecture Decisions.
- **Acceptance:**
  - [x] `waitUntil` availability for fire-and-forget DB writes is confirmed
        from docs — `event: NextFetchEvent` with `event.waitUntil()` is the
        documented proxy background-work pattern
  - [x] Matcher syntax for the existing pattern in `src/proxy.ts` confirmed
  - [x] Header/cookie mutation rules recorded; cookies are synchronous on
        `NextRequest` (no `await request.cookies`)
  - [x] Deprecation notices heeded — `middleware` → `proxy` in v16; proxy
        defaults to the Node.js runtime; `runtime` config in proxy throws
  - [x] Findings written to `tasks/plan.md` (Proxy API findings section)
- **Verification:** Findings section written; no code changed. **DONE** 2026-10-08.
- **Dependencies:** None (first task; gates Task 3).
- **Files likely touched:** `tasks/plan.md` only.
- **Estimated scope:** XS (research only).

### Task 2: Migration `062_activity_consent.sql`
- **Description:** Create `activity_events`, `auth_sessions`, `consent_records`;
  add `businesses.consent_state`; seed `legal_versions` and `consent_gate` into
  `system_settings`; enable RLS and add policies. Follow the RLS triad from
  `supabase/migrations/042_credit_usage_logs.sql` and the superadmin gate
  pattern from `supabase/migrations/051_onboarding_funnels.sql:16-18`.
  **No `$$` function bodies and no `;` inside string literals** —
  `scripts/run-migrations.mjs` splits on `;` naively.
- **Acceptance:**
  - [x] `activity_events` exists with `(business_id, created_at DESC)` and
        `(created_at DESC)` indexes, and **no IP/geo column**
  - [x] `auth_sessions` exists with `(business_id, last_seen DESC)` and
        `(last_seen DESC)` indexes; has a superadmin SELECT policy and a
        service-role full policy, and **no tenant-facing SELECT policy**
  - [x] `consent_records` has a unique index on
        `(user_id, terms_version, privacy_version)` plus
        `(business_id, created_at DESC)`
  - [x] `businesses.consent_state` added with
        `CHECK IN ('soft','required') DEFAULT 'required'`
  - [x] `system_settings` rows `legal_versions` and `consent_gate` seeded
        (names/values match plan.md schema section)
  - [x] RLS enabled on all three new tables; policies match the triad
  - [x] Migration contains no `$$` blocks
- **Verification:** Run `node scripts/run-migrations.mjs`, then a PostgREST
  column probe — `PATCH /rest/v1/<table>?id=<nonexistent-id>` with a null on
  each new column: **204 = column exists, 400 `PGRST204` = missing**. Probe all
  new columns. "Ran without error" is explicitly **not** accepted as evidence
  (migration 014 was silently skipped in prod this way).
  **STATUS: DONE 2026-10-08.** Applied to **staging and production** by the
  human (Supabase Dashboard SQL editor). Note: the naive runner cannot apply
  anything here — prod has no `pg_exec` (RPC returns 404) and the runner
  swallows that error class, so it would silently no-op. Prod probed after
  apply (all checks pass):
  - `businesses.consent_state`, `activity_events`, `auth_sessions`
    (`ip_address`), `consent_records` all PRESENT via PostgREST
  - `system_settings.legal_versions` = v1 (both pages), `consent_gate` =
    `{"enforce_from": null}` (correct; Task 16 sets it)
  - Both prod businesses (`HopeChat`, `Infinity WIFI`) read
    `consent_state = 'required'` — the DB default; note prod has **2**
    businesses, not the 6 assumed earlier (Task 16 must enumerate rows, not
    hardcode 6)
  - Anon REST on `contacts`/`messages` still HTTP 404 (blocked) after this
    migration
  - **061 was NOT included in the human apply (only 062). Still pending on
    both envs** — see follow-up note below.
- **Dependencies:** None (parallel with Task 1).
- **Files likely touched:** `supabase/migrations/062_activity_consent.sql`
  (new), `supabase/migrate.sql` (append if it lists migrations).
- **Estimated scope:** M (1 file + DB apply + probe).

### Task 3: Session capture in `src/proxy.ts`
- **Description:** On authenticated non-static requests, capture geo/IP/UA/path
  and upsert `auth_sessions`. New helper `src/lib/analytics/session.ts` keeps
  `src/proxy.ts` thin. Set an `hc_sid` cookie (UUID, httpOnly, 1 year,
  sameSite=lax) when absent; throttle writes to once per session per 60s using
  an `hc_last_seen` cookie or `sessionStart` timestamp.
- **Acceptance:**
  - [x] Reads `x-forwarded-for`, `x-vercel-ip-city`, `x-vercel-ip-country`,
        `x-vercel-ip-country-region`, `x-vercel-ip-latitude`,
        `x-vercel-ip-longitude`, `user-agent`, path — all tolerant of
        `undefined` (local dev has no geo headers)
  - [x] `hc_sid` issued only when absent; does not re-issue every request
  - [x] Insert/upsert fires at most once per 60s per session
  - [x] Insert is fire-and-forget and **cannot** reject the page response —
        wrapped in try/catch, no `await` on the request-critical path
  - [x] Skipped entirely when there is no authenticated user
  - [x] `session_start` set on first write, `last_seen` updated thereafter
- **Local checks (passed):** `tsc --noEmit` ✓; full vitest suite 134/134 ✓
  (7 new for `session.test.ts`); `eslint` 0 errors on touched files ✓.
- **Deploy check (pending):** `npm run build` **cannot run on this machine**
  (Turbopack OOM — only ~2.4 GB RAM free; crashes during build init before
  touching code; pre-existing, not caused by this change). Verification via
  staging deploy is the user side of Checkpoint "Foundation".
- **Verification:** Deploy to staging; load an authenticated page; confirm an
  `auth_sessions` row with real city/country; compare p95 page latency before
  and after; force a DB failure (bad key) and confirm the page still renders.
  (Deploy check for both Tasks 3+4 deferred to Checkpoint "Foundation".)
- **Dependencies:** 1 (API), 2 (table).
- **Files likely touched:** `src/proxy.ts`, `src/lib/analytics/session.ts` (new).
- **Estimated scope:** M (2 files).

### Checkpoint: Foundation
- [ ] Migration applied **and column-probed**.
- [ ] Deployed page load produces an `auth_sessions` row with real geo.
- [ ] Page latency unchanged; forced capture failure never breaks a page.

---

## Phase 2 — Superadmin sessions view

### Task 4: `GET /api/admin/sessions`
- **Description:** Paginated, filtered session list. Reuse the superadmin gate
  already in `src/app/api/admin/impersonation-log/route.ts` — but prefer the
  `is_superadmin()` SQL helper (validated by RLS) over the manual
  `app_metadata` check, since `061_harden_admin_helper_functions.sql` exists for
  exactly this.
- **Acceptance:**
  - [x] 401 unauthenticated; **403** authenticated non-superadmin
        (gate = `supabase.rpc('is_superadmin')` on the user's own client —
        RLS-validated, prefers 061-style SQL helper over bare `app_metadata`)
  - [x] Filters: `business_id` (strict UUID validation), date range
        (`from`/`to` on `session_start`), free-text `q` on
        city/country/user_agent + `user` filter on `profiles.email`
  - [x] Returns ip, city, country, region, lat/long, UA, path,
        session_start, last_seen, duration (+ business name, email for UI)
  - [x] Paginated (default 50, max 100, offset capped at 10k; exact `count`)
  - [x] Never returns rows for a tenant JWT even if `business_id` is omitted
        — tenant gate returns false and route 403s before any query
- **Local checks (passed):** `tsc --noEmit` ✓; unit tests for `params.ts`
  8/8 ✓ (clamp/uuid/duration); full suite 142/142 ✓; `eslint` 0 errors ✓.
- **Verification:** `npm test` covers the gate helpers; **manual REST call as
  superadmin (200) and as a tenant user (403)** deferred to staging deploy
  (Checkpoint "Foundation") — build cannot run locally (see Task 3 note).
- **Dependencies:** 2, 3.
- **Files likely touched:** `src/app/api/admin/sessions/route.ts` (new),
  `src/app/api/admin/sessions/route.test.ts` (new).
- **Estimated scope:** S (1–2 files).

### Task 5: `/admin/activity` page + admin sidebar entry
- **Description:** Superadmin sessions table with filters. Nav entry in
  `src/components/layout/admin-sidebar.tsx` alongside existing admin items.
- **Acceptance:**
  - [x] Table shows business, user, location (city/country), UA, started,
        last seen, duration
  - [x] Business filter + date filter + search work against Task 4's API
  - [x] Loading, empty, and error states present
  - [x] Route returns 403/redirect for non-superadmin (API gate is
        `is_superadmin()` RLS-validated in Task 4; admin layout redirects)
  - [x] Admin sidebar has a visible entry, label consistent with siblings
        ("User Sessions", `MonitorSmartphone`, under Impersonation Logs)
- **Verification:** `npm run typecheck` ✓ (0 errors); `eslint` on new files ✓
  (0 errors, incl. `exhaustive-deps` satisfied via `useCallback`); full suite
  142/142 ✓. **`next build` and live visit depend on the deployed
  Foundation checkpoint** (build OOMs locally — see Task 3 note).
- **Dependencies:** 4.
- **Files likely touched:** `src/app/admin/activity/page.tsx` (new),
  `src/components/layout/admin-sidebar.tsx`,
  a sessions table component (new, colocated).
- **Estimated scope:** M (≤4 files).

### Checkpoint: Superadmin location visibility
- [ ] Filter by business works; city/country/IP visible per session.
- [ ] Non-superadmin gets **403 from the API**, not merely a hidden link.

---

## Phase 3 — Tenant activity

### Task 6: Activity capture helper + `POST /api/activity` + tests
- **Description:** Define the event vocabulary first — this unblocks Tasks 7,
  9, 10. Server helper `src/lib/activity/log.ts` (service-role insert,
  never throws). Client wrapper `src/lib/activity/track.ts`. Route
  `src/app/api/activity/route.ts` derives `business_id` and actor from the
  authenticated session.
- **Acceptance:**
  - [x] `POST /api/activity` returns **401** when unauthenticated
        (covered in route.test.ts)
  - [x] `business_id` / `actor_user_id` derived **server-side**
        (`rpc('get_user_business_id')` + `auth.getUser()`); body carries only
        `category`, `action`, `entity_type`, `entity_id`, `summary`, `metadata`
  - [x] **`ip_address` is not a parameter of the endpoint** — geo physically
        unobtainable through this path (no such field exists in body/response)
  - [x] Cross-tenant spoof attempt (body claims another business) is ignored —
        server value wins (business_id never read from the body)
  - [x] `logActivity()` swallows DB errors; never throws into a page render
        (returns `null` on insert failure — tested)
  - [x] Event vocabulary (allowed `category` + `action` pairs) defined and
        validated — invalid pairs rejected (400 in route, `ActivityValidationError`
        thrown by `logActivity`, tested)
  - [x] Vitest unit tests cover: success path, invalid category/action,
        unauthenticated, and error-swallowing (15 new tests green)
- **Local checks:** `tsc --noEmit` ✓; `eslint` ✓ (0 errors); full suite
  **157/157** ✓. `next build` deferred to deploy (OOM — see Task 3 note).
- **Verification:** `npm test` green; `npm run typecheck` green.
- **Dependencies:** 2.
- **Files likely touched:** `src/lib/activity/log.ts` (new),
  `src/lib/activity/track.ts` (new), `src/app/api/activity/route.ts` (new),
  `src/lib/activity/log.test.ts` (new).
- **Estimated scope:** M (4 files).

### Task 7: Wire capture into auth and contacts
- **Description:** Record login and logout, and contact
  create/update/delete. Sign-in happens client-side
  (`src/app/(auth)/password-form.tsx:54`, `src/app/(auth)/page.tsx:27`); sign-out
  at `src/hooks/use-auth.tsx:254`.
- **Acceptance:**
  - [ ] Login records an event with a human-readable summary
  - [ ] Logout records an event (fire-and-forget — must not delay sign-out)
  - [ ] Contact create / update / delete each record an event naming the contact
  - [ ] Summaries readable by a non-technical tenant
        (e.g. "Updated contact Jane Doe"), not raw JSON
  - [ ] No capture call added to a hot loop (e.g. bulk import)
- **Verification:** `npm run typecheck && npm run build`; manually sign in/out
  and edit a contact on staging; confirm 3 `activity_events` rows with correct
  summaries for that tenant only.
- **Dependencies:** 6.
- **Files likely touched:** `src/app/(auth)/password-form.tsx`,
  `src/hooks/use-auth.tsx`, contact mutation sites, possibly one small wrapper.
- **Estimated scope:** S (≤5 files).

### Task 8: `GET /api/activity` + `/activity` page + sidebar entry
- **Description:** Tenant-facing feed. **No IP, no city, no country, no UA**
  anywhere in the response — enforced by column selection, not filtering.
  RLS already restricts to the caller's business.
- **Acceptance:**
  - [ ] Returns only the caller's business rows (verified by direct REST call
        with a tenant JWT for a *different* business → 0 rows)
  - [ ] Response payload contains no `ip_address`, `city`, `country`,
        `latitude`, `longitude`, or `user_agent` key
  - [ ] Paginated; filters by category and date
  - [ ] `/activity` page renders feed with loading/empty/error states
  - [ ] Sidebar entry in `src/components/layout/sidebar.tsx`, label consistent
        with siblings
  - [ ] Server-side guard: non-authenticated → redirect to login
- **Verification:** `npm run typecheck && npm run build`; REST probe as tenant
  A for tenant B's data → `[]`; grep the API response JSON for `ip_` → absent.
- **Dependencies:** 6 (API contract), 7 (events must exist to display).
- **Files likely touched:** `src/app/api/activity/route.ts` (extend),
  `src/app/(dashboard)/activity/page.tsx` (new),
  `src/components/layout/sidebar.tsx`.
- **Estimated scope:** M (≤4 files).

### Checkpoint: Tenant activity parity
- [ ] Tenant sees own activity with **no** IP/geo keys in the payload.
- [ ] Cross-tenant REST probe returns `[]`.
- [ ] Superadmin sees the same events rolled up.

### Task 9: Wire capture into broadcasts
- **Description:** Record broadcast create, send/start, and completion — with
  counts in the summary.
- **Acceptance:**
  - [ ] Create, send, and completion each produce an event
  - [ ] Summary includes recipient count where known
  - [ ] Bulk send produces **one** event, not one per recipient
  - [ ] `npm run typecheck` green
- **Verification:** Send a small test broadcast on staging; confirm exactly the
  expected number of rows (no per-recipient fanout).
- **Dependencies:** 6.
- **Files likely touched:** broadcast create/send call sites (to confirm at
  implementation), `src/app/(dashboard)/broadcasts/*`.
- **Estimated scope:** S.

### Task 10: Wire capture into automations and settings
- **Description:** Record automation create/enable/disable and key settings
  changes (business profile, integrations connected/disconnected).
- **Acceptance:**
  - [ ] Automation create / enable / disable recorded
  - [ ] Settings changes recorded with a field-level summary
  - [ ] **Secrets never in summaries or metadata** (API keys, tokens, webhook
        secrets) — assert this in review
  - [ ] `npm run typecheck && npm run build` green
- **Verification:** Toggle an automation and change a setting on staging; grep
  the written `metadata` for `key|token|secret` → no hits.
- **Dependencies:** 6.
- **Files likely touched:** automation save/toggle call sites,
  settings save call sites.
- **Estimated scope:** S.

---

## Phase 4 — Terms & consent

### Task 11: `/terms` and `/privacy` pages + repair footer links
- **Description:** Draft baseline Terms of Service and Privacy Policy covering
  data actually processed: contacts, messages, IP/geo, AI provider sharing
  (Gemini), WhatsApp/Meta data, Pesapal payments, Cal.com bookings, SMS.
  Version stamp each. Fix the dead `href="#"` links at `src/app/page.tsx`
  (Privacy 1112, Terms 1113, and their duplicates at 1122/1123). The fifth
  dead link — **Refund Policy at 1114** — points at **`/terms#refunds`**
  (approved decision; add a refunds section to the Terms page).
- **Acceptance:**
  - [ ] `/terms` and `/privacy` render, are publicly reachable, are indexed
        (`robots` allowed), and show a visible version + last-updated date
  - [ ] Versions match what will be written into
        `system_settings.legal_versions`
  - [ ] All four Terms/Privacy links on `src/app/page.tsx` point at `/terms`
        and `/privacy`
  - [ ] Refund Policy link points at `/terms#refunds` and the anchor exists
  - [ ] Pages read acceptably on mobile
  - [ ] Copy explicitly flagged as **needing human/counsel review** — do not
        present as legal advice
- **Verification:** `npm run build`; click all four Terms/Privacy links →
  land on the real pages; click Refund Policy → lands on `/terms#refunds`;
  grep `src/app/page.tsx` for `href="#"` → zero hits.
- **Dependencies:** None (independent of Phases 1–3 — can start immediately).
- **Files likely touched:** `src/app/terms/page.tsx` (new),
  `src/app/privacy/page.tsx` (new), `src/app/page.tsx`.
- **Estimated scope:** M (3 files, copy-heavy).

### Task 12: `GET /api/consent/status` + `POST /api/consent/accept`
- **Description:** Status returns current versions + whether the caller's
  business/user has accepted them. Accept writes one `consent_records` row with
  IP from `x-forwarded-for` and UA, and flips `businesses.consent_state` to
  `required` once accepted (so soft-gated tenants become hard-gated going
  forward).
- **Acceptance:**
  - [ ] Status: 401 unauthenticated; returns `{terms_version, privacy_version,
        accepted, accepted_at}` for the caller
  - [ ] Accept: 401 unauthenticated; 400 when body versions don't match current
        versions (stale client)
  - [ ] Accept writes **both** `business_id` and `user_id` on the row
  - [ ] IP captured from `x-forwarded-for` (fallback `x-real-ip`), UA from
        `user-agent` — same pattern as
        `src/app/api/admin/impersonation-log/route.ts`
  - [ ] Re-accepting identical versions is idempotent — no duplicate row
        (unique index catches it; return 200 not 409)
  - [ ] Unit tests: 401, stale-version 400, happy path, idempotent re-accept
- **Verification:** `npm test` green; curl both routes unauthenticated → 401.
- **Dependencies:** 2, 11 (versions must exist).
- **Files likely touched:** `src/app/api/consent/status/route.ts` (new),
  `src/app/api/consent/accept/route.ts` (new), tests.
- **Estimated scope:** S (2–3 files).

### Task 13: Signup checkbox — hard gate
- **Description:** Add an unchecked-by-default T&C checkbox to signup step 2 in
  `src/app/(auth)/signup/page.tsx` (form state near `handleSignup`, line 65).
  Blocks `handleSignup` until checked. Because `businesses` rows are created by
  the `handle_new_user()` DB function (not app code), the consent record cannot
  be written at signup — instead `businesses.consent_state` defaults to
  `required`, and Task 14's proxy gate forces the accept flow immediately after
  first login, where the checkbox acceptance is re-confirmed.
- **Acceptance:**
  - [ ] Checkbox present, unchecked by default, with linked text to `/terms`
        and `/privacy` (open in new tab)
  - [ ] Submit disabled or blocked with inline error until checked
  - [ ] Keyboard accessible; `aria` labeling present; error announced
  - [ ] Signup API call never fires without consent intent captured
  - [ ] `consent_state` for the new business is `required` (DB default)
- **Verification:** `npm run typecheck && npm run build`; manually attempt
  signup with box unchecked → blocked; checked → account created; confirm new
  business row has `consent_state='required'`.
- **Dependencies:** 11 (links must resolve).
- **Files likely touched:** `src/app/(auth)/signup/page.tsx`.
- **Estimated scope:** S (1 file).

### Task 14: Consent enforcement in `src/proxy.ts`
- **Description:** The server-side gate the checkbox alone cannot provide.
  For authenticated users whose business has `consent_state='required'` and who
  lack a `consent_records` row for current versions: **redirect** (hard) —
  outside the dashboard. For `consent_state='soft'`: allow through (Task 15
  shows the notice).
- **Acceptance:**
  - [ ] `required` + not accepted → redirected away from all `APP_PATHS`
        dashboard routes to the consent screen; landing/auth routes unaffected
  - [ ] `soft` + not accepted → dashboard loads normally
  - [ ] Accepted → gate stops intercepting on the next request
  - [ ] Gate runs **after** auth check and does not loop (the consent screen
        itself is not gated)
  - [ ] Consent status fetched cheaply — cached per request or in the JWT/
        profile, not an extra DB round-trip per asset
  - [ ] `consent_enforce_from` in `system_settings` respected (before the
        cutoff nothing is hard-gated)
- **Verification:** Staging: as a `required`/unaccepted user hit `/dashboard`
  → redirected; accept → return → loads. As `soft` → loads with notice.
- **Dependencies:** 12 (accept endpoint), 16 (backfill sets `soft`).
- **Files likely touched:** `src/proxy.ts`, possibly
  `src/lib/consent/check.ts` (new), consent screen page (new or shared with 15).
- **Estimated scope:** M (≤4 files).

### Task 15: Consent notice component for soft-gated tenants
- **Description:** Blocking-but-dismissible notice shown to `soft` businesses
  that haven't accepted. Plus a persistent sidebar badge until accepted.
- **Acceptance:**
  - [ ] On first load for an unaccepted `soft` user, notice shows Terms +
        Privacy links and an **Accept** action calling `POST /api/consent/accept`
  - [ ] Notice is dismissible (per decision: "existing tenants keep working")
  - [ ] Dismissing leaves a persistent sidebar entry so it isn't forgotten
  - [ ] After Accept, notice and badge disappear without a full reload
  - [ ] Accept failure (network/400) shows an inline error and does not
        dismiss
  - [ ] Focus trapped while the notice is open; Esc closes it; accessible name
  - [ ] Responsive
- **Verification:** `npm run build`; as a `soft`/unaccepted tenant: see notice,
  dismiss, continue working, accept, badge clears; check `consent_records` row
  written with both ids + IP + UA.
- **Dependencies:** 12.
- **Files likely touched:** `src/components/consent/ConsentBanner.tsx` (new),
  consent modal, dashboard shell layout, `src/components/layout/sidebar.tsx`.
- **Estimated scope:** M (≤5 files).

### Task 16: Backfill existing businesses → `soft` + cutoff
- **Description:** One-off SQL: set `consent_state='soft'` for all currently
  existing businesses; write `consent_gate.enforce_from` (planned: `now()` at
  run time) into `system_settings`. New signups stay `required` via the DB
  default. **Human approval required before running** — it is a data mutation.
- **Acceptance:**
  - [ ] SQL documented in the migration or as a reviewed script — not
        ad-hoc paste
  - [ ] Row count before/after equals the number of businesses existing at the
        cutoff (prod currently has **2**: `HopeChat`, `Infinity WIFI` — assert
        actual count, do not hardcode)
  - [ ] `enforce_from` written and matches the plan's stated value
  - [ ] A pre-existing business can reach its dashboard and sees the Task 15
        notice (not a Task 14 redirect)
  - [ ] A business created *after* the cutoff is `required` and is gated
- **Verification:** Run against staging first; check `consent_state`
  distribution; log in as a seeded pre-existing user → notice appears.
- **Dependencies:** 14, 15 (both must exist before flipping the switch).
- **Files likely touched:** `supabase/migrations/063_consent_backfill.sql`
  (new, or a documented script).
- **Estimated scope:** S (1 file + apply).

### Checkpoint: Consent
- [ ] New signup impossible without accepting current versions.
- [ ] Existing business reaches dashboard, sees notice, accepts → row exists
      for **both** business and user with IP + UA.
- [ ] Re-accept creates no duplicate row.
- [ ] After acceptance the gate stops intercepting.

---

## Phase 5 — Retention, parity, sign-off

### Task 17: Retention cron — redact IP after 90 days
- **Description:** Scheduled job truncates `ip_address` to the network prefix
  (drop the last IPv4 octet / keep a /64 for v6) on `auth_sessions` and
  `consent_records` rows older than 90 days. City/country retained. Idempotent.
  **Note:** per `tasks/staging-todo.md`, Vercel Cron does not fire on the Hobby
  plan — the cron driver is GitHub Actions (`.github/workflows/cron.yml`), so
  this job must be an HTTP endpoint the workflow calls, following the existing
  two cron endpoints (including their timing-safe secret compare).
- **Acceptance:**
  - [ ] HTTP endpoint guarded by a cron secret, **timing-safe comparison**
        (match the hardened pattern already in the other two cron routes)
  - [ ] Redacts only rows older than 90 days; leaves newer rows untouched
  - [ ] Second run changes nothing (idempotent) — returns `0` affected
  - [ ] Does **not** delete `consent_records` rows or their versions
        (audit integrity preserved; only the IP is redacted)
  - [ ] `.github/workflows/cron.yml` matrix extended; `vercel.json` route
        registered (Hobby no-op is expected)
  - [ ] Endpoint responds 401 without the secret
- **Verification:** Backdate a row's `last_seen` by 91 days; run endpoint with
  secret → IP truncated, city intact, row still present; run again → `0`;
  run without secret → 401.
- **Dependencies:** 2, 3 (tables exist and have data).
- **Files likely touched:** `src/app/api/cron/retention/route.ts` (new),
  `.github/workflows/cron.yml`, `vercel.json`.
- **Estimated scope:** S (≤3 files).

### Task 18: Landing-page parity
- **Description:** AGENTS.md mandates that features shipped to the dashboard
  are mentioned on `src/app/page.tsx`. Add copy for the activity/session
  tracking feature and the Terms/Privacy pages.
- **Acceptance:**
  - [ ] Features section mentions activity tracking (with the
        privacy-preserving angle: tenants see their activity, not visitor IP)
  - [ ] If billing-relevant: Pricing section updated
  - [ ] At least one FAQ entry covering what is tracked and how long IP is
        kept (90 days)
  - [ ] Footer links to `/terms` and `/privacy` (Task 11) — verified live
  - [ ] Copy does not overclaim (no "bank-grade", no legal guarantees)
- **Verification:** `npm run build`; read the rendered landing page top to
  bottom; no section contradicts actual behavior.
- **Dependencies:** 11 (pages must exist to link), 18's feature set complete
  (practically: after Phases 2–4).
- **Files likely touched:** `src/app/page.tsx`.
- **Estimated scope:** S (1 file).

### Checkpoint: Complete
- [ ] `npm run typecheck && npm run lint && npm run build && npm test` all pass.
- [ ] Every acceptance criterion above met.
- [ ] Legal copy reviewed by a human.
- [ ] Migration column probes recorded for 062 (and 063 if used).
- [ ] Human approves before merge.

---

## Final verification block

Run in order; all must pass before requesting merge:

```bash
npm run typecheck
npm run lint          # fall back to `npx eslint <changed files>` if it crashes
npm run build
npm test
node scripts/run-migrations.mjs
```

Then manual staging checks:

1. Signup → blocked without checkbox, succeeds with it → gated until accept.
2. Pre-existing (soft) business → dashboard loads → notice → accept → badge clears.
3. Tenant `/activity` → shows events, response contains no `ip_`/`city` keys.
4. Superadmin `/admin/activity` → shows IP + city; tenant user gets 403 from API.
5. Retention endpoint → 401 without secret; truncates only >90-day rows.
6. Landing page → all 4 footer legal links resolve; new copy present.

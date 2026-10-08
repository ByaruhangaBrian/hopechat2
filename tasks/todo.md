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
  - [x] Login records an event with a human-readable summary
  - [x] Logout records an event (fire-and-forget — must not delay sign-out)
  - [x] Contact create / update / delete each record an event naming the contact
  - [x] Summaries readable by a non-technical tenant
        (e.g. "Updated contact Jane Doe"), not raw JSON
  - [x] No capture call added to a hot loop (e.g. bulk import)
- **Verification:** `typecheck` ✅, `eslint` ✅ (0 errors; 8 pre-existing unused-import/exhaustive-deps warnings), `vitest` 157/157 ✅. Manual staging sign-in/sign-out/contact edit still to be done by human on next deploy.
- **Dependencies:** 6.
- **Files touched (actual):** `src/app/(auth)/login/page.tsx` (correct sign-in
  site), `src/app/auth/callback/route.ts` (OAuth/magic-link + match)
  `src/hooks/use-auth.tsx`, `src/components/contacts/contact-form.tsx`,
  `src/components/contacts/contact-detail-view.tsx`,
  `src/app/(dashboard)/contacts/page.tsx`, `src/components/contacts/import-modal.tsx`
  (aggregate single event after loop, **not** in the loop).
- **Estimated scope:** S.
- **STATUS: DONE 2026-10-08.**

### Task 8: `GET /api/activity` + `/activity` page + sidebar entry
- **Description:** Tenant-facing feed. **No IP, no city, no country, no UA**
  anywhere in the response — enforced by column selection, not filtering.
  RLS already restricts to the caller's business.
- **Acceptance:**
  - [x] Returns only the caller's business rows (enforced by RLS policy
        `business_id = get_user_business_id()` in migration 062; ✅ column
        selection whitelist in GET handler)
  - [x] Response payload contains no `ip_address`, `city`, `country`,
        `latitude`, `longitude`, or `user_agent` key (explicit `.select(...)`
        whitelist; table has no such columns anyway)
  - [x] Paginated; filters by category and date (`page`/`pageSize`,
        `category`, `from`, `to`)
  - [x] `/activity` page renders feed with loading/empty/error states
  - [x] Sidebar entry in `src/components/layout/sidebar.tsx` ("Activity",
        `Activity` icon, after Automations)
  - [x] Server-side guard: non-authenticated → redirect to login (`/activity`
        added to `protectedPaths` in `src/proxy.ts`; also added to `APP_PATHS`)
- **Verification:** `typecheck` ✅, `eslint` ✅ (0 errors; 3 pre-existing
  sidebar/proxy warnings), `vitest` 166/166 ✅ (9 new `params` tests).
  Cross-tenant REST probe still to be done by human on next deploy.
- **Dependencies:** 6 (API contract), 7 (events must exist to display).
- **Files touched (actual):** `src/app/api/activity/route.ts` (added GET),
  `src/app/api/activity/params.ts` (new: clampPage/clampPageSize/validCategory/
  parseIsoDate), `src/app/api/activity/params.test.ts` (new),
  `src/app/(dashboard)/activity/page.tsx` (new),
  `src/components/layout/sidebar.tsx`, `src/components/layout/header.tsx`
  (title "Activity Log"), `src/proxy.ts`.
- **Estimated scope:** M.
- **STATUS: DONE 2026-10-08.**

### Checkpoint: Tenant activity parity
- [x] Tenant sees own activity with **no** IP/geo keys in the payload.
- [ ] Cross-tenant REST probe returns `[]` (deferred to deploy verification).
- [x] Superadmin sees the same events (RLS `OR is_superadmin()`).

### Task 9: Wire capture into broadcasts
- **Description:** Record broadcast create, send/start, and completion — with
  counts in the summary.
- **Acceptance:**
  - [x] Create, send, and completion each produce an event
  - [x] Summary includes recipient count where known
  - [x] Bulk send produces **one** event, not one per recipient
  - [x] `npm run typecheck` green (✅ tsc clean; eslint 0 errors on touched
        files; vitest 166/166)
- **Verification:** Send a small test broadcast on staging; confirm exactly the
  expected number of rows (no per-recipient fanout). Human to do on next
  deploy.
- **Dependencies:** 6.
- **Files touched (actual):** `src/hooks/use-broadcast-sending.ts` (created +
  sent after finalize), `src/lib/sms/dispatch.ts` (server-side created + sent
  via `logActivity`, one per bulk send), `src/app/(dashboard)/broadcasts/[id]/page.tsx`
  (deleted), `src/app/(dashboard)/broadcasts/new/page.tsx` (draft created).
  Note: `scheduled` vocabulary action has no UI hook today (Step4 is
  Review & Send, no scheduling) — left unused.
- **Estimated scope:** S.
- **STATUS: DONE 2026-10-08.**

### Task 10: Wire capture into automations and settings
- **Description:** Record automation create/enable/disable and key settings
  changes.
- **Acceptance:**
  - [x] Automation create / update / delete / enable / disable each record an
        event
  - [x] Settings changes record an event naming the setting group
  - [x] No capture in automation engine hot loops (per-message runs)
  - [x] `npm run typecheck` green
- **Verification:** Toggle an automation and change a setting on staging;
  confirm correct rows appear. No events from the engine's message loop.
  (Human to do on next deploy.)
- **Dependencies:** 6.
- **Files likely touched:** automation mutation call sites, settings form
  surfaces (`src/app/(dashboard)/settings/*`).
- **Files touched (actual):** `src/app/api/automations/route.ts` (POST: created),
  `src/app/api/automations/[id]/route.ts` (PATCH: enabled/disabled vs updated, via
  `existing.business_id`; DELETE: deleted with name fetched first),
  `src/app/api/automations/[id]/duplicate/route.ts` (created for the copy),
  `src/components/settings/whatsapp-config.tsx` (updated WhatsApp config,
  success only), `src/components/settings/profile-form.tsx` (updated profile,
  success only), `src/components/settings/test-settings.tsx` (updated test
  settings, success only). Tags/templates CRUD left out (content catalog, not
  settings); `scheduled`/`paused`/`resumed` vocab actions still unused (no UI).
- **Estimated scope:** S.
- **STATUS: DONE 2026-10-08.**

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
  - [x] `/terms` and `/privacy` render, are publicly reachable, are indexed
        (`robots` allowed), and show a visible version + last-updated date
  - [x] Versions match what will be written into
        `system_settings.legal_versions`
  - [x] All four Terms/Privacy links on `src/app/page.tsx` point at `/terms`
        and `/privacy`
  - [x] Refund Policy link points at `/terms#refunds` and the anchor exists
  - [x] Pages read acceptably on mobile
  - [x] Copy explicitly flagged as **needing human/counsel review** — do not
        present as legal advice
- **Verification:** `npm run build`; click all four Terms/Privacy links →
  land on the real pages; click Refund Policy → lands on `/terms#refunds`;
  grep `src/app/page.tsx` for `href="#"` → zero hits. (Done: grep → 0 hits;
  `tsc` clean; eslint 0 errors on both new pages.)
- **Dependencies:** None (independent of Phases 1–3 — can start immediately).
- **Files likely touched:** `src/app/terms/page.tsx` (new),
  `src/app/privacy/page.tsx` (new), `src/app/page.tsx`.
- **Files touched (actual):** `src/app/terms/page.tsx` (new, v1 / 2026-10-08,
  refunds section with `id="refunds"`), `src/app/privacy/page.tsx` (new,
  v1 / 2026-10-08), `src/app/page.tsx` (Privacy→/privacy, Terms→/terms,
  Refund→/terms#refunds at both footer sites). Versions stamp (v1) and date
  (8 Oct 2026) match the `system_settings.legal_versions` seed in migration 062.
  Per-page `export const metadata.robots = { index: true, follow: true }`
  (root layout noindexes by default).
- **Estimated scope:** M (3 files, copy-heavy).
- **STATUS: DONE 2026-10-08.**

### Task 12: `GET /api/consent/status` + `POST /api/consent/accept`
- **Description:** Status returns current versions + whether the caller's
  business/user has accepted them. Accept writes one `consent_records` row with
  IP from `x-forwarded-for` and UA, and flips `businesses.consent_state` to
  `required` once accepted (so soft-gated tenants become hard-gated going
  forward).
- **Acceptance:**
  - [x] Status: 401 unauthenticated; returns `{terms_version, privacy_version,
        accepted, accepted_at}` for the caller
  - [x] Accept: 401 unauthenticated; 400 when body versions don't match current
        versions (stale client)
  - [x] Accept writes **both** `business_id` and `user_id` on the row
  - [x] IP captured from `x-forwarded-for` (fallback `x-real-ip`), UA from
        `user-agent` — same pattern as
        `src/app/api/admin/impersonation-log/route.ts`
  - [x] Re-accepting identical versions is idempotent — no duplicate row
        (unique index catches it; return 200 not 409)
  - [x] Unit tests: 401, stale-version 400, happy path, idempotent re-accept
- **Verification:** `npm test` green; curl both routes unauthenticated → 401.
  (Done: vitest 173/173, incl. 7 new route tests.)
- **Dependencies:** 2, 11 (versions must exist).
- **Files likely touched:** `src/app/api/consent/status/route.ts` (new),
  `src/app/api/consent/accept/route.ts` (new), tests.
- **Files touched (actual):** `src/app/api/consent/status/route.ts` (new —
  auth 401, profile business lookup, reads `system_settings.legal_versions`,
  checks matching consent_records row → `{terms_version, privacy_version,
  accepted, accepted_at}`), `src/app/api/consent/accept/route.ts` (new —
  auth 401, body version validation vs current → stale 400, inserts
  consent_records via **service-role** client (no user INSERT policy) with
  `business_id` + `user_id` + IP (x-forwarded-for split`, fallback x-real-ip) +
  UA, treats unique-constraint 23505 as idempotent 200, flips
  `businesses.consent_state` to `required`),
  `src/app/api/consent/status/route.test.ts` (new, 7 tests).
- **Estimated scope:** S (2–3 files).
- **STATUS: DONE 2026-10-08.**

### Task 13: Signup checkbox — hard gate
- **Description:** Add an unchecked-by-default T&C checkbox to signup step 2 in
  `src/app/(auth)/signup/page.tsx` (form state near `handleSignup`, line 65).
  Blocks `handleSignup` until checked. Because `businesses` rows are created by
  the `handle_new_user()` DB function (not app code), the consent record cannot
  be written at signup — instead `businesses.consent_state` defaults to
  `required`, and Task 14's proxy gate forces the accept flow immediately after
  first login, where the checkbox acceptance is re-confirmed.
- **Acceptance:**
  - [x] Checkbox present, unchecked by default, with linked text to `/terms`
        and `/privacy` (open in new tab, `target="_blank" rel="noopener noreferrer"`)
  - [x] Submit disabled or blocked with inline error until checked
  - [x] Keyboard accessible; `aria` labeling present; error announced
  - [x] Signup API call never fires without consent intent captured
  - [x] `consent_state` for the new business is `required` (DB default)
- **Verification:** `npm run typecheck && npm run build`; manually attempt
  signup with box unchecked → blocked; checked → account created; confirm new
  business row has `consent_state='required'`. (Done: tsc clean; eslint clean;
  vitest 173/173 — UI gate, no logic change.)
- **Dependencies:** 11 (links must resolve).
- **Files likely touched:** `src/app/(auth)/signup/page.tsx`.
- **Files touched (actual):** `src/app/(auth)/signup/page.tsx` — added
  `termsAccepted` state, `handleSignup` early-return with inline error when
  false (before `setLoading(true)` so the auth call never fires), native
  checkbox (`id="termsAccept"`, `aria-required`, `aria-describedby`) with
  linked label to `/terms` + `/privacy` (new tab) on step 2, and an
  `role="alert"` error block on the step-2 form.
- **Estimated scope:** S (1 file).
- **STATUS: DONE 2026-10-08.**

### Task 14: Consent enforcement in `src/proxy.ts`
- **Description:** The server-side gate the checkbox alone cannot provide.
  For authenticated users whose business has `consent_state='required'` and who
  lack a `consent_records` row for current versions: **redirect** (hard) —
  outside the dashboard. For `consent_state='soft'`: allow through (Task 15
  shows the notice).
- **Acceptance:**
  - [x] `required` + not accepted → redirected away from all `APP_PATHS`
        dashboard routes to the consent screen; landing/auth routes unaffected
  - [x] `soft` + not accepted → dashboard loads normally
  - [x] Accepted → gate stops intercepting on the next request
  - [x] Gate runs **after** auth check and does not loop (the consent screen
        itself is not gated)
  - [x] Consent status fetched cheaply — cached per request or in the JWT/
        profile, not an extra DB round-trip per asset
  - [x] `consent_enforce_from` in `system_settings` respected (before the
        cutoff nothing is hard-gated)
- **Verification:** Staging: as a `required`/unaccepted user hit `/dashboard`
  → redirected; accept → return → loads. As `soft` → loads with notice.
- **Dependencies:** 12 (accept endpoint), 16 (backfill sets `soft`).
- **Files likely touched:** `src/proxy.ts`, possibly
  `src/lib/consent/check.ts` (new), consent screen page (new or shared with 15).
- **Files touched (actual):** `src/proxy.ts` — added `getConsentGateDecision`
  gate after the auth/protected-path checks: authenticated users whose business
  is `required` and who lack a `consent_records` row for current versions are
  redirected to `/consent` for all dashboard app paths (`/dashboard`, `/inbox`,
  `/contacts`, `/pipelines`, `/broadcasts`, `/automations`, `/activity`,
  `/settings`, `/onboarding`, `/menus`, `/ai`); landing host and auth routes
  unaffected; `/consent` added to `APP_PATHS` and `protectedPaths` but excluded
  from the gated list (no loop). New `src/lib/consent/check.ts` —
  `getConsentGateDecision(supabase, userId)` returns `'ok' | 'soft' | 'blocked'`
  in one request chain (profile→business_id, consent_gate, business
  consent_state, legal_versions, matching consent_records), fails open to `ok`,
  and honors `consent_gate.enforce_from` (null or future → `ok`, nothing
  hard-gated) — this is the single per-request criterion so there is no extra
  DB round-trip per asset. New `src/app/consent/page.tsx` — standalone screen
  that loads `/api/consent/status`, redirects to `/login` on 401 and to
  `/dashboard` if already accepted, links `/terms` + `/privacy` (new tab), and
  an **Accept and continue** button calling `POST /api/consent/accept`; stale
  versions re-fetch fresh status, failures show an inline `role="alert"` error
  and never dismiss. New `src/lib/consent/check.test.ts` — 7 unit tests as
  described.
- **Estimated scope:** M (≤4 files).
- **STATUS: DONE 2026-10-08.**

### Task 15: Consent notice component for soft-gated tenants
- **Description:** Blocking-but-dismissible notice shown to `soft` businesses
  that haven't accepted. Plus a persistent sidebar badge until accepted.
- **Acceptance:**
  - [x] On first load for an unaccepted `soft` user, notice shows Terms +
        Privacy links and an **Accept** action calling `POST /api/consent/accept`
  - [x] Notice is dismissible (per decision: "existing tenants keep working")
  - [x] Dismissing leaves a persistent sidebar entry so it isn't forgotten
  - [x] After Accept, notice and badge disappear without a full reload
  - [x] Accept failure (network/400) shows an inline error and does not
        dismiss
  - [x] Focus trapped while the notice is open; Esc closes it; accessible name
  - [x] Responsive
- **Verification:** `npm run build`; as a `soft`/unaccepted tenant: see notice,
  dismiss, continue working, accept, badge clears; check `consent_records` row
  written with both ids + IP + UA.
- **Dependencies:** 12.
- **Files likely touched:** `src/components/consent/ConsentBanner.tsx` (new),
  consent modal, dashboard shell layout, `src/components/layout/sidebar.tsx`.
- **Files touched (actual):** new `src/components/consent/consent-notice.tsx`
  (`ConsentNotice`) — fetches `/api/consent/status` once on mount; if
  unaccepted shows a blocking-but-dismissible `role="dialog"` overlay
  (`aria-modal`, `aria-labelledby`) with Terms + Privacy links (new tab) and
  an Accept button calling `POST /api/consent/accept`; on success dispatches
  `hopechat:consent-pending=false` and closes with no reload; on stale/network/
  400 error shows inline `role="alert"` error and stays open; focus is trapped
  while open and Esc dismisses; dismissal persists via `localStorage`
  (`hc_consent_dismissed`) and fires `hopechat:consent-pending=true`. Rendered
  once inside `src/app/(dashboard)/dashboard-shell.tsx` above `<main>`. The
  sidebar (`src/components/layout/sidebar.tsx`) listens for the pending event
  and shows a persistent amber **Review terms** badge with a pulsing dot that
  dispatches `hopechat:consent-open` to reopen the notice; badge clears when
  consent is accepted. `required` tenants never reach it (proxy gated) —
  only soft/pre-cutoff users see this.
- **Estimated scope:** M (≤5 files).
- **STATUS: DONE 2026-10-08.**

### Task 16: Backfill existing businesses → `soft` + cutoff
- **Description:** One-off SQL: set `consent_state='soft'` for all currently
  existing businesses; write `consent_gate.enforce_from` (planned: `now()` at
  run time) into `system_settings`. New signups stay `required` via the DB
  default. **Human approval required before running** — it is a data mutation.
- **Acceptance:**
  - [x] SQL documented in the migration or as a reviewed script — not
        ad-hoc paste
  - [ ] Row count before/after equals the number of businesses existing at the
        cutoff (prod currently has **2**: `HopeChat`, `Infinity WIFI` — assert
        actual count, do not hardcode)
  - [x] `enforce_from` written and matches the plan's stated value
  - [ ] A pre-existing business can reach its dashboard and sees the Task 15
        notice (not a Task 14 redirect)
  - [ ] A business created *after* the cutoff is `required` and is gated
- **Verification:** Run against staging first; check `consent_state`
  distribution; log in as a seeded pre-existing user → notice appears.
- **Dependencies:** 14, 15 (both must exist before flipping the switch).
- **Files likely touched:** `supabase/migrations/063_consent_backfill.sql`
  (new, or a documented script).
- **Files touched (actual):** new `supabase/migrations/063_consent_backfill.sql`
  — documents the design constraint (no `DO` blocks, no semicolons inside
  literals/comments, matching 062), pre-flight census instructions, then (1)
  `UPDATE businesses SET consent_state='soft' WHERE consent_state='required'`
  (full census of currently-existing rows, nothing hardcoded), and (2) a
  one-shot guarded `UPDATE system_settings SET value = jsonb_set(value,
  '{enforce_from}', to_jsonb(to_char(now(), ...)))` for `consent_gate` only
  while `enforce_from` is still NULL, so a re-run never moves the cutoff.
  Includes a manual post-apply verification checklist (distribution, value,
  new signup gated, existing tenant sees notice).
- **Estimated scope:** S (1 file + apply).
- **STATUS: DONE (migration authored) 2026-10-08 — APPLY PENDING: requires
  human approval; run `supabase/migrations/063_consent_backfill.sql` in the
  Dashboard SQL editor against staging first, then prod. Do NOT use
  `scripts/run-migrations.mjs` (broken; only `pg_exec` runner works), and 061
  must be applied beforehand too.

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
  - [x] HTTP endpoint guarded by a cron secret, **timing-safe comparison**
        (match the hardened pattern already in the other two cron routes)
  - [x] Redacts only rows older than 90 days; leaves newer rows untouched
  - [x] Second run changes nothing (idempotent) — returns `0` affected
  - [x] Does **not** delete `consent_records` rows or their versions
        (audit integrity preserved; only the IP is redacted)
  - [x] `.github/workflows/cron.yml` matrix extended; `vercel.json` route
        registered (Hobby no-op is expected)
  - [x] Endpoint responds 401 without the secret
- **Verification:** Backdate a row's `last_seen` by 91 days; run endpoint with
  secret → IP truncated, city intact, row still present; run again → `0`;
  run without secret → 401.
- **Dependencies:** 2, 3 (tables exist and have data).
- **Files touched:** `src/app/api/cron/retention/route.ts` (new),
  `src/app/api/cron/retention/route.test.ts` (new, 8 tests),
  `.github/workflows/cron.yml` (matrix + retention step),
  `vercel.json` (cron route), `docs/deployment-runbook.md` (secret doc).
- **STATUS: DONE 2026-10-08** — route verified: `npx tsc --noEmit` clean,
  eslint 0 errors, vitest 188/188 (includes 8 new retention tests). Workflow
  now expects GHA secrets `STAGING_RETENTION_CRON_SECRET` / `PROD_RETENTION_CRON_SECRET`
  and Vercel env `RETENTION_CRON_SECRET` per host. Manual staging check
  (backdate 91 days → IP truncated, city intact, row present; rerun → 0;
  no secret → 401) is queued behind the next deploy.
- **Estimated scope:** S.

### Task 18: Landing-page parity
- **Description:** AGENTS.md mandates that features shipped to the dashboard
  are mentioned on `src/app/page.tsx`. Add copy for the activity/session
  tracking feature and the Terms/Privacy pages.
- **Acceptance:**
  - [x] Features section mentions activity tracking (with the
        privacy-preserving angle: tenants see their activity, not visitor IP)
  - [x] If billing-relevant: Pricing section updated
        — activity tracking is included on every plan (not billing-relevant,
        so no pricing change needed)
  - [x] At least one FAQ entry covering what is tracked and how long IP is
        kept (90 days)
  - [x] Footer links to `/terms` and `/privacy` (Task 11) — verified live
  - [x] Copy does not overclaim (no "bank-grade", no legal guarantees)
- **Verification:** `npm run build`; read the rendered landing page top to
  bottom; no section contradicts actual behavior.
- **Dependencies:** 11 (pages must exist to link), 18's feature set complete
  (practically: after Phases 2–4).
- **Files likely touched:** `src/app/page.tsx`.
- **STATUS: DONE 2026-10-08** — added "Activity Trail & Privacy" feature card
  (BarChart3, tenant-sees-activity-not-IP angle, 90-day truncation, consent-first)
  and a FAQ entry covering what is tracked / 90-day IP retention. Footer legal
  links already present (Task 11). Not billing-relevant → pricing left factual.
  `npx tsc --noEmit` clean; eslint 0 errors (4 pre-existing warnings).
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

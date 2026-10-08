# Implementation Plan: Tenant Activity Tracking, Superadmin Sessions, and T&C Consent

## Overview

Three linked capabilities:

1. **Tenant activity log** — a per-tenant record of *what happened* in their own
   workspace (logins, contact edits, broadcasts, automations). Tenants read only
   their own rows, and **never see IP or location**.
2. **Superadmin sessions view** — a cross-tenant record of *where from*:
   session start/last-seen, IP, city, country, region, lat/long, user agent,
   path, duration. Readable **only** by superadmin and the service role.
3. **Terms of Service + Privacy Policy consent** — versioned legal pages served
   at `/terms` and `/privacy`, a checkbox gate on signup, and a durable
   consent record tying **both** the business and the individual user to the
   exact versions they accepted, with timestamp, IP and user agent.

The split into two tables (activity vs sessions) is the load-bearing decision:
it is what makes "tenants see activity but not location" enforceable by a
database policy rather than by a UI filter you have to remember to maintain.

### Confirmed decisions (from human, this session)

| Question | Decision |
|---|---|
| Where consent lives | **Both** — one record keyed by business **and** user, capturing versions + timestamp + IP + UA |
| Existing businesses (prod today: `HopeChat`, `Infinity WIFI`) | **Soft gate** — continue working behind a consent notice until accepted; *new* signups are hard-gated |
| IP retention | **90 days raw, then truncate the IP**; city/country retained |
| Who sees geo | **Superadmin only** — tenants get activity with no IP/location |

## Architecture Decisions

- **Two tables, not one with a filtered column.** Postgres RLS can restrict
  *rows*, not *columns*. Putting IP in a tenant-readable table and then trying
  to hide it would fail silently. `auth_sessions` therefore has **no
  tenant-facing SELECT policy at all**.
- **Geo comes free from Vercel.** `x-vercel-ip-city`, `-country`,
  `-country-region`, `-latitude`, `-longitude` are populated on every Vercel
  deployment. No geo-IP library, no third-party API, no extra dependency.
  Headers are **absent in local dev** — all capture code must tolerate
  `undefined`.
- **Capture point is `src/proxy.ts`.** It already exists, already runs on every
  non-static request (matcher excludes `_next/static|_next/image|favicon.ico|
  images`), and currently reads *zero* request headers, so it is a clean,
  greenfield insertion point. No `middleware.ts` exists.
- **Write throttling is mandatory.** A raw insert per request would multiply
  DB load and blow the table up. Capture writes at most **once per session per
  60s**, only on page navigations, fire-and-forget, never blocking the response.
- **Consent is server-enforced, not just UI.** A checkbox without a server-side
  check is theatre. Enforcement lives in `src/proxy.ts` for hard-gated tenants.
- **Consent versions live in `system_settings`**, so a future revision is a
  version bump + one migration, not a schema change.
- **Client cannot spoof tenant identity.** `POST /api/activity` derives
  `business_id` and actor from the authenticated session; the request body
  carries only the semantic event. IP is **not a parameter** of that endpoint —
  the "tenants can't see geo" rule is enforced at the type level, not by a
  comment.
- **Migration 062 must contain no `$$` function bodies.**
  `scripts/run-migrations.mjs` splits statements naively on `;`, which is the
  most likely reason migration **014 was silently skipped** in production (it
  added `whatsapp_ai_jobs.conversation_id` — absent today, which killed the AI
  job queue). Every migration task below carries a post-run column probe so a
  silent skip cannot recur unnoticed.

## Proxy API findings (Task 1, from shipped docs)

Read from `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`
and `01-app/01-getting-started/16-proxy.md` (Next 16.2.6):

- **Function signature:** `export function proxy(request: NextRequest)` or
  default export. There **is** a second argument `event: NextFetchEvent` with
  `event.waitUntil(promise)` — the documented pattern for background work
  (proxy.md:155-164, 670-690). **Use `event.waitUntil` for the fire-and-forget
  session write**, not `await` on the request-critical path. `NextProxy` also
  exists as a full typed shorthand.
- **Runtime:** Proxy now defaults to the **Node.js runtime** (v16; Node runtime
  became stable in 15.5). No `runtime: 'edge'` config needed in the file, and
  setting the `runtime` route-segment config in a proxy file throws. Node
  runtime means `@supabase/supabase-js` + service-role key are usable directly
  in proxy code (server-only secret, never shipped to the client).
- **Cookies:** `request.cookies.get/set/delete` are **synchronous** on
  `NextRequest` in proxy (docs show no `await`). Set response cookies via the
  `NextResponse` instance (`supabaseResponse.cookies.set(...)`) which the
  existing proxy already does for auth.
- **Headers:** ordinary `request.headers.get(...)`; geo headers
  (`x-vercel-ip-*`, `x-forwarded-for`) are readable. RSC internal headers
  (`rsc`, `next-router-prefetch`, `next-router-state-tree`) are stripped in
  proxy — not relevant to geo capture.
- **Matcher:** must be a static constant; current
  `'/((?!_next/static|_next/image|favicon.ico|.*\\.(?:...)$).*)'` already
  excludes static assets and does NOT exclude `/api` — proxy runs broadly.
  Note: proxy still runs for `/_next/data/*` even if excluded (by design), and
  matcher exclusions also skip Server Functions on matching paths.
- **Guidance:** proxy docs explicitly say it is *not* for slow fetching or
  full session management. Session/consent checks here must be shallow; the
  real authorization stays in route handlers/pages. Also: `fetch` with
  `cache/revalidate/tags` options has no effect in proxy.
- **Testing:** `next/experimental/testing/server` exposes
  `unstable_doesProxyMatch(...)` and a way to invoke the proxy function
  directly — available for Task 3/14 unit tests (experimental).

## Schema (migration `062_activity_consent.sql`)

```
activity_events            -- tenant-visible WHAT
  id, business_id, actor_user_id, actor_label, category, action,
  entity_type, entity_id, summary, metadata, created_at
  indexes: (business_id, created_at DESC), (created_at DESC)
  policies: tenant SELECT own business | superadmin SELECT all | service role all
  NOTE: no ip_address / geo column by design

auth_sessions              -- superadmin-only WHERE-FROM
  id, business_id, user_id, session_id, ip_address, city, country,
  country_region, latitude, longitude, user_agent, path,
  session_start, last_seen, duration_seconds
  indexes: (business_id, last_seen DESC), (last_seen DESC)
  policies: superadmin SELECT | service role all   -- NO tenant policy

consent_records            -- durable proof of acceptance
  id, business_id, user_id, terms_version, privacy_version,
  accepted_at, ip_address, user_agent, created_at
  unique: (user_id, terms_version, privacy_version)
  policies: user SELECT/INSERT own | superadmin SELECT all | service role all

businesses.consent_state   TEXT CHECK IN ('soft','required') DEFAULT 'required'

system_settings seeds:
  'legal_versions'        {"terms_version","terms_updated_at","privacy_version","privacy_updated_at"}
  'consent_gate'          {"enforce_from":"<ISO ts>","soft_business_ids":[...]}
```

## Task List

### Phase 1 — Foundation

- [ ] **Task 1:** Confirm the Next 16 `proxy.ts` request API from `node_modules/next/dist/docs/`
- [ ] **Task 2:** Migration `062_activity_consent.sql` (tables, RLS, indexes, seeds)
- [x] **Task 3:** Session capture in `src/proxy.ts` (geo + cookie + throttled write)

#### Checkpoint: Foundation
- [ ] Migration applied **and column-probed** (not just "ran without error")
- [ ] A deployed page load produces an `auth_sessions` row with real city/country
- [ ] Page latency unchanged; capture failure never breaks a page

### Phase 2 — Superadmin sessions view

- [x] **Task 4:** `GET /api/admin/sessions` (superadmin-gated, filtered, paginated)
- [x] **Task 5:** `/admin/activity` page + admin sidebar entry

#### Checkpoint: Superadmin location visibility
- [ ] Superadmin can filter by business and see city/country/IP per session
- [ ] Non-superadmin gets 403 from the API, not just a hidden nav link

### Phase 3 — Tenant activity

- [x] **Task 6:** Activity capture helper + `POST /api/activity` + unit tests
- [x] **Task 7:** Wire capture into auth (login/logout) and contacts CRUD
- [x] **Task 8:** `GET /api/activity` + `/activity` page + app sidebar entry
- [x] **Task 9:** Wire capture into broadcasts and pipelines
- [x] **Task 10:** Wire capture into automations and settings

#### Checkpoint: Tenant activity parity
- [ ] Tenant sees their own activity feed with **no** IP or geo columns returned
- [ ] Cross-tenant read returns 0 rows (verified by direct REST call with a
      tenant JWT, not just in the UI)
- [ ] Superadmin still sees the same events rolled up across tenants

### Phase 4 — Terms & consent

- [x] **Task 11:** `/terms` and `/privacy` pages + repair the dead footer links
- [x] **Task 12:** `GET /api/consent/status` + `POST /api/consent/accept`
- [x] **Task 13:** Signup checkbox — hard gate on account creation
- [x] **Task 14:** Consent enforcement in `src/proxy.ts` (hard vs soft split)
- [x] **Task 15:** Consent notice component for soft-gated tenants
- [x] **Task 16:** Backfill — mark existing businesses as `soft` (prod now:
      `HopeChat`, `Infinity WIFI`), set cutoff (migration authored; apply
      pending human approval)

#### Checkpoint: Consent
- [ ] New signup is impossible without accepting current versions
- [ ] An existing business reaches its dashboard, sees the notice, accepts, and
      the record rows exist for **both** business and user with IP + UA
- [ ] Accepting the same versions twice does not create a duplicate row
- [ ] After acceptance the gate stops intercepting that user

### Phase 5 — Retention, parity, sign-off

- [x] **Task 17:** Retention cron — redact IP after 90 days + `vercel.json` schedule
- [x] **Task 18:** Landing-page parity — Features/FAQs/Footer copy + legal links

#### Checkpoint: Complete
- [ ] `npm run typecheck`, `npm run lint`, `npm run build`, `npm test` all pass
- [ ] Every acceptance criterion above met
- [ ] Legal copy reviewed by a human before launch
- [ ] Human approves before merge

## Dependency Graph

```
Task 1 ─► Task 3 ─► Task 4 ─► Task 5          ┐
Task 2 ─►┬┴───────────────────────────────────┤ Checkpoint B
         ├► Task 6 ─► Task 7 ─► Task 8        │
         │        └► Task 9, Task 10          ├─► Checkpoint C
         ├► Task 11 ─► Task 12 ─► Task 13     │
         │              └► Task 14 ─► 15 ─► 16┤ Checkpoint D
         │                                    │
         └► Task 17                           ┘─► Task 18 ─► Checkpoint E
```

Tasks 1–2 are parallel. Task 11 (legal pages) is independent of Phases 1–3 and
can start immediately. Phases 2 and 3 are independent of each other once
Tasks 1–2 land.

## Parallelization Opportunities

- **Safe in parallel:** Task 1 + Task 2; Task 11 with all of Phases 2–3;
  Task 9 and Task 10 (different call sites, no shared contract change).
- **Sequential:** Task 2 before anything that touches a table; Task 3 before 4;
  Task 12 before 13/14/15.
- **Needs coordination:** Tasks 6–10 all depend on the event vocabulary
  (`category` / `action` strings) — define the enum in Task 6 first, then 7/9/10
  can fan out.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Next 16 `proxy.ts` API differs from memory (no `event.waitUntil`, different matcher) | High | Task 1 reads `node_modules/next/dist/docs/` **before any code** — mandated by AGENTS.md; gates Task 3 |
| Supabase insert on every request = latency + cost | High | 60s/session throttle, page-navs only, fire-and-forget, skip when unauthenticated |
| Geo/IP leaks to tenants via RLS | High | Separate `auth_sessions` table with no tenant policy; Task 8 verification is a direct REST call with a tenant JWT, not a UI eyeball |
| **Migration silently skipped** (014 precedent) | High | Every migration task ends with a PostgREST column probe; a "ran OK" message is not evidence |
| Migration runner splits on `;` naively | Med | No `$$` bodies or `;` inside string literals in 062 |
| `auth_sessions` row volume | Med | 60s throttle + Task 17 retention; index on `last_seen DESC` for pruning |
| Consent text is not legal advice | Med | Versioned fields so revisions are cheap; human review is an explicit Checkpoint E gate |
| Geo headers absent in local dev | Low | All capture code tolerates `undefined`; geo verification only on a real deployment |
| Overwriting the staging plan | Low | Archived verbatim to `tasks/staging-plan.md` / `tasks/staging-todo.md`; nothing lost |

## Open Questions

1. **Legal entity details** for the Terms/Privacy pages — registered business
   name, Uganda address, and governing law. The footer currently exposes only
   `info@hopechat.net` and `+256 763 149 276`.
2. **Legal review** — I can draft baseline Terms/Privacy copy covering data
   we actually process (contacts, messages, IP/geo, AI provider sharing with
   Gemini, WhatsApp/Meta data, Pesapal payments, Cal.com bookings, SMS), but it
   needs a human/counsel pass before launch.
3. **Soft-gate UX** — approved as "existing tenants keep working but see a
   blocking notice until accepted". Planned: a modal on next login that can be
   dismissed to continue, plus a persistent sidebar badge that stays until
   accepted. Confirm that's the intended level of friction (vs. undismissable).
4. **Consent enforcement cutoff** — timestamp separating `required` from `soft`
   businesses. Planned: `now()` at Task 16 run time, recorded in
   `system_settings.consent_gate.enforce_from`.
5. **Should automated activity count?** `automation_logs` and `http_logs` already
   capture system events. This plan scopes `activity_events` to *human-initiated*
   actions only. Say the word if you want system events merged in.
6. **Refund Policy link** (`src/app/page.tsx:1114`) is dead but no refund policy
   is in scope here. **RESOLVED (approved):** Task 11 adds a refunds section to
   the Terms page and points the link at `/terms#refunds`.

## Related work discovered during research (not in this plan's scope)

- **Migration 061 is still pending on prod and staging** (only 062 was applied
  by the human). Anon reads were already blocked on prod (404) so it is not
  urgent, but apply it for consistency with repo-canonical schema.
- **`run-migrations.mjs` is currently non-functional on every environment**
  that lacks the `pg_exec` helper (prod returns 404 for `rpc('pg_exec')`, and
  the runner swallows exactly that error class → silent no-op). It also cannot
  parse `DO $$` blocks. Until it is fixed (or replaced), schema changes must go
  through the Supabase Dashboard SQL editor — a real limitation for the
  retention cron in Task 17 which cannot take tables for granted.
- `admin_impersonation_logs` already stores `ip_address` + `user_agent` using
  the same `x-forwarded-for` fallback. Worth consolidating onto the shared
  session-capture helper in a follow-up so there is one IP-capture code path.
- The footer has **five** dead `href="#"` links: Privacy Policy (1112), Terms
  of Service (1113), **Refund Policy (1114)**, and duplicates at 1122/1123.
  Task 11 fixes the four that map to this plan; see Open Question 6 for the
  refund link.

## Next Steps

After human approval: implement bottom-up following the dependency graph,
starting with Task 1 (docs) and Task 2 (migration) in parallel.

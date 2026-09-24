# Task List — Staging / Test Environment

Legend: `[ ]` pending, `[x]` done. Each task is independently verifiable.
Commands: typecheck `npm run typecheck`, build `npm run build`, lint per-file
(`npx eslint <file>` — full `npm run lint` can crash natively).

Confirmed decisions: staging domain **`dev.hopechat.net`**; **same** Meta test
app; `main` = prod, `develop` = staging (Vercel production branch); second
Supabase project (**Free** tier + weekly keepalive ping); first GitHub Actions
CI; this file replaces the retired Cal.com plan.

## Checklist
- [ ] Human approved this plan (domain, Meta app, file overwrite confirmed).
- [ ] Every task has acceptance criteria + a verification step.
- [ ] Task dependencies ordered (see plan dependency graph).
- [ ] No task touches more than ~5 files.
- [ ] Checkpoints exist between phases.

## Phase 0 — Branch & CI

- [ ] **Task 1: Create `develop` branch**
  - Branch from `main`, push upstream; protect `main` if possible.
  - Verify: `git branch -a` shows `develop`; push succeeds.
- [ ] **Task 2: GitHub Actions CI `.github/workflows/ci.yml`**
  - PR to `main`/`develop` → install, typecheck, per-file lint, build with
    placeholder env.
  - Verify: green run on a test PR.

### Checkpoint: Foundation
- [ ] `develop` pushed; CI green on a PR.

## Phase 1 — Staging Supabase

- [x] **Task 3: Provision staging Supabase + migrations**
  - New project `hopechat-staging` (`dbrciimrntdpvhvzhhdt`, eu-west-1); ran
    `migrate.sql` + all migrations `001…060` + `0201_integrations.sql` (with
    forward-dependency stubs pre-created: `get_user_business_id`,
    `is_superadmin`, `is_admin_view_all`, `is_superadmin_not_impersonating`,
    `businesses`, `system_settings`, `payment_transactions`).
  - Verify: 52 tables = 52 prod tables; RLS enabled on all 52 (prod had
    `onboarding_funnels` RLS on — matched); 36 triggers match; policies and
    indexes match repo (repo is canonical — prod is behind: never applied
    049–058, and its migration 014 is an older copy adding only
    `human_takeover`); `get_user_business_id()` present.
  - Note: applied via Management API query endpoint (`db.<ref>.supabase.co`
    resolves IPv6-only; no psql on this machine).
- [x] **Task 4: Staging secrets + seed data**
  - Fresh 64-hex `ENCRYPTION_KEY`
    (`233b4bf7…55bd2d3`); seed test business, admin user, sample data.
  - Verify: seeded admin login renders populated dashboard. **PASSED**
    2026-09-25: admin `stagingadmin@hopetech.com` login via
    `/auth/v1/token?grant_type=password` works; admin JWT reads seeded
    deals/contacts/conversations/pipelines/broadcasts/automations/tags.

### Checkpoint: Database
- [x] Migrations clean; seeded login works.

## Phase 2 — Staging Vercel + Routing

- [x] **Task 5: Staging Vercel project + env vars**
  - New project, production branch `develop`, all env vars (see plan table),
    TLS for `dev.hopechat.net`.
  - Verify: first deploy serves landing on `https://dev.hopechat.net`.
    **PASSED** 2026-09-25/26: `dev.hopechat.net` + `/login` HTTP 200;
    `.vercel/project.json` linked to `hopechat2-staging`
    (`prj_XRbcRYGMcmkuo2j0l01PjMwXRxUl`); env listing verified. Known gaps
    recorded for Task 7/runbook: staging missing `META_APP_SECRET`,
    `GEMINI_API_KEY`, `GROQ_*`, `GOOGLE_SHEETS_PRIVATE_KEY`, `PESAPAL_*`,
    `SMTP_*`; prod missing `AUTOMATION_CRON_SECRET`, `LEAD_RECOVERY_CRON_SECRET`,
    `PESAPAL_*`, `SMTP_*`, `CALCOM_WEBHOOK_SECRET`.
- [x] **Task 6: Host routing + cron for staging**
  - Cron driver = **GitHub Actions** (user decision, 2026-09-25): Hobby team →
    Vercel Cron never fires; GHA `on: schedule` runs on every plan.
    `.github/workflows/cron.yml` (packaged in this Task-6 commit **ecd63f**,
    landed on both `develop` and the default branch `main`, where GHA
    schedules alone evaluate) drives the same two HTTP cron endpoints GHA
    would have called, with a guarded staging+prod matrix.
  - **Staging cron secrets — live end-to-end:**
    - Vercel staging project `hopechat2-staging` env **`AUTOMATION_CRON_SECRET`**
      and **`LEAD_RECOVERY_CRON_SECRET`** → targets `production,preview`
      (verified via `/v9/projects/…/env` listing; the internal names match the
      `vercel.json`-registered Hobby-noop Cron routes).
    - GHA repo secrets on `main` (published 2026-09-25, 22:32Z):
      `STAGING_AUTOMATION_CRON_SECRET` = the staging `AUTOMATION_CRON_SECRET`
      value, `STAGING_LEAD_RECOVERY_CRON_SECRET` = the staging
      `LEAD_RECOVERY_CRON_SECRET` value (single source of truth =
      `%TEMP%\hc_staging_creds.txt`).
  - **Prod = dormant by design** (zero prod mutation): the cron.yml matrix
    product names `PROD_AUTOMATION_CRON_SECRET` / `PROD_LEAD_RECOVERY_CRON_SECRET`
    are **not set** as GHA secrets → the prod job self-skips (`if` guard
    `secrets.PROD_* != ''`). When the user supplies prod cron values (Task 7
    third-party isolation / runbook), setting those two GHA secrets is the
    ONLY step needed to arm prod — no prod Vercel env writes performed here.
  - Verify: `dev.hopechat.net` landing + `/login` served (Task 5); both cron
    endpoints reachable on staging host, 401 without the `x-cron-secret`
    header, 200 with the correctly-guarded matrix secret; no prod cron signal
    ever sent wrong-host (routes independently 401 on secret mismatch).
  - **2026-09-26 — cron verification PASSED** after two separate root causes
    were squashed:
    1. **Edge CDN caching of `/api/*`** (the real culprit behind
       "random 401/200"): in `next.config.ts` the `/:path*` catch-all
       (`public, max-age=0, s-maxage=300, stale-while-revalidate=86400`)
       was listed AFTER `/api/:path*` `no-store`, and per the headers.md
       "Header Overriding Behavior" (last-matching rule wins) it overrode
       `no-store` — every `/api` response was cached publicly at the edge for
       5 min (+24 h SWR), so a cached successful cron body was served to ANY
       caller (no/garbage secret) for hours. Fixed by reordering: `/api/:path*`
       `no-store` now comes after the catch-all. Post-fix responses carry
       `Cache-Control: no-store` + `X-Vercel-Cache: MISS`.
    2. **Secret compare hardened to timing-safe** in both cron routes
       (`sha256` digests + XOR, `crypto`), with a denial log.
  - **Verification matrix (2026-09-26, staging `dev.hopechat.net`):**
    `AUTOMATION_CRON_SECRET` route — no-secret `401`, garbage `401`, correct
    secret `200 {"processed":0}`; `LEAD_RECOVERY_CRON_SECRET` route — no-secret
    `401`, garbage `401`, correct secret `200 {"ok":true,...}`.
  - **Staging was redeployed via `vercel deploy --prod` (direct upload)**
    three times during this hunt (2026-09-26). The GitHub-integration
    same-SHA `develop` redeploy (dpl_Cc29…) could serve stale/no-store-cached
    artifacts; direct-upload deploys from local HEAD bypass that. Final live
    deployment = `hopechat2-staging-ef982ev1x-…` (aliased to `dev.hopechat.net`).
  - **Open follow-ups (Page 1):** the hardened route code (timing-safe) +
    `next.config.ts` rule reorder are uncommitted on `develop`; **do not merge
    to `main`/prod until committed** (otherwise prod ships the non-strict
    cached-cron behavior). Prod Vercel hosts need the same reorder deployed
    and prod cron secrets set before arming `PROD_*` (Task 7/runbook).

### Checkpoint: Deployable Staging
- [x] Push to `develop` auto-deploys to `dev.hopechat.net`; routing works.
  - Git-integration deployments observed for `develop` pushes; 2026-09-26 the
    production alias for `dev.hopechat.net` was expressly assigned by direct
    `vercel deploy --prod` (final live deployment
    `hopechat2-staging-ef982ev1x-…`).

## Phase 3 — Third-party isolation

- [ ] **Task 7: Sandbox third-party config**
  - Pesapal sandbox; Meta test app (test phone/business only); staging Cal.com
    key + webhook secret; test SMTP inbox.
  - Verify: sandbox checkout, WhatsApp test message, booking webhook hit staging.

## Phase 4 — Runbook & verification

- [ ] **Task 8: Deployment runbook**
  - Migrate order, env checklist, promote `develop`→`main`, rollback, Supabase
    idle-pause caveat.
  - Verify: steps followable without prior context.
- [ ] **Task 9: Full staging smoke test**
  - Signup → recovery email resolves on `dev.hopechat.net/login`; AI chat;
    sandbox checkout + webhook; Sheets sync; inbound WhatsApp; Cal.com booking;
    cron fires.
  - Verify: checklist all pass; no prod URLs/data touched.

## Phase 5 — Security hardening (found while verifying staging)

Severity: **critical** — anonymous (no profile) callers can read *every*
tenant's rows. Root cause: `is_superadmin()` returns NULL when the caller has
no profile row; PL/pgSQL `IF NOT NULL` is treated as *false*, so
`is_admin_view_all()`/`is_superadmin_not_impersonating()` did NOT return FALSE
— they fell through and returned TRUE, giving anonymous clients the superadmin
bypass on the `Strict business scoped <table>` / 019-era policies.

- [ ] **Task 10: Harden helper functions (`061_harden_admin_helper_functions.sql`)**
  - COALESCE `is_superadmin()` → `false` at every gate in
    `is_admin_view_all()`, `is_superadmin_not_impersonating()`,
    `get_user_business_id()` (the latter preserves 047's JWT fast-path); drop
    any residual 019-era `Business scoped <table>` policies that reference
    `is_superadmin_not_impersonating()`. Inline guards also added to the 019/
    025 files and the canonical `migrate.sql`.
  - Verify (staging): anon read of `contacts`, `messages`, `deals`,
    `conversations`, `sms_broadcasts` → 0 rows (empty), where before applying
    061 they returned all rows. Superadmin `/admin` still sees everything with
    `x-admin-view-all: true`.
- [ ] **Task 10b: Apply 061 to staging + verify**
  - Verify: anon `select * from contacts` returns `[]` on `dev` REST API.
- [ ] **Task 10c: Apply 061 to prod (urgent)**
  - Prod is behind anyway (never applied 049–058, 061); apply 061 first —
    it is self-contained and does not depend on those. Runbook entry in Task 8.
  - Verify: anon REST query returns `[]` on prod host.

### Checkpoint: Complete
- [ ] All acceptance criteria met; human reviews before merge to `main`.

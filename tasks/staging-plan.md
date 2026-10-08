# Implementation Plan: Staging / Test Environment

## Overview

Stand up a full pre-production environment so features can be verified before
reaching production, using:

1. **Git**: single repo, `main` = production, `develop` = staging. Staging is the
   production branch of the staging Vercel project.
2. **Database**: a second Supabase project, provisioned from scratch with
   `supabase/migrate.sql` + all `supabase/migrations/*.sql` in order, plus seed data.
3. **Hosting**: a second Vercel project tracking `develop`, deployed to
   **`dev.hopechat.net`**, with its own env vars.
4. **CI**: first-time GitHub Actions workflow (typecheck + lint + build on PRs) —
   no `.github/` workflows exist today.
5. **Third parties**: shared Meta test app (per decision); Pesapal sandbox;
   separate Cal.com test key; distinct cron/webhook secrets.

Confirmed decisions:

- Overwrite `tasks/plan.md` / `tasks/todo.md` (old Cal.com plan retired).
- Staging domain: **`dev.hopechat.net`**.
- Meta: **same test app** as production (no second Meta app).

## Architecture Decisions (confirmed)

- **Branching**: trunk-based with long-lived `develop`. Feature branches →
  `develop` (staging) → PR → `main` (prod). No `master` usage going forward.
- **Vercel**: two projects from one repo. Prod project = production branch `main`;
  staging project = production branch `develop`, domain `dev.hopechat.net`
  (+ `www` handling per `src/proxy.ts` rules).
- **Supabase**: staging project is independent — never point staging app at the
  prod database or vice versa. Fresh `ENCRYPTION_KEY` for staging (staging cannot
  decrypt prod-encrypted WhatsApp/Cal.com/Pesapal tokens; that is expected).
- **Host routing**: `src/proxy.ts` routes by hostname (apex/www → landing,
  `app.` → dashboard, `docs.` → docs). Add `dev.hopechat.net` + `dev.app.` /
  `dev.docs.` equivalents (or a staging-only host map) so the same code serves
  both environments. `NEXT_PUBLIC_SITE_URL=https://dev.hopechat.net` keeps email
  and payment absolute links on staging (the `appBaseUrl()` fix).
- **Secrets isolation**: distinct `AUTOMATION_CRON_SECRET`, `CALCOM_WEBHOOK_SECRET`,
  SMTP credentials (staging email should go to a test inbox or a provider subaccount
  to avoid confusing real users). Meta app shared but with test phone numbers /
  test businesses only. Pesapal switched to `demo.pesapal.com` via env override.
- **CI**: GitHub Actions, no external services. Runs on PRs targeting `main` and
  `develop`.

## Env vars (staging values)

| Var | Staging value |
|-----|---------------|
| `NEXT_PUBLIC_SITE_URL` | `https://dev.hopechat.net` |
| `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` | new staging project |
| `SUPABASE_SERVICE_ROLE_KEY` | staging service role |
| `ENCRYPTION_KEY` | fresh 64-hex (≠ prod) |
| `GEMINI_API_KEY` | shared or separate quota key |
| `META_APP_SECRET` | same test app |
| `PESAPAL_*` | sandbox credentials |
| `AUTOMATION_CRON_SECRET`, `CALCOM_WEBHOOK_SECRET` | new random values |
| `SMTP_*` | test inbox / subaccount |

Full list: `.env.local.example` (45 usages of `process.env.*` audited).

## Task List

### Phase 0 — Branch & CI

- [ ] **Task 1: Create `develop` branch**
  - `git checkout -b develop`, push with upstream, update default branch docs;
    protect `main` (PR-only) if repo settings allow.
  - Verify: `git branch -a` shows `develop`; push succeeds.
- [ ] **Task 2: GitHub Actions CI `.github/workflows/ci.yml`**
  - On PR to `main`/`develop`: install, `npm run typecheck`, lint changed files
    (full `npm run lint` can crash natively — per-file eslint or continue-on-error),
    `npm run build` with placeholder env vars.
  - Verify: green run on a test PR.

### Checkpoint: Foundation
- [ ] `develop` pushed; CI green on a PR.

### Phase 1 — Staging Supabase

- [ ] **Task 3: Provision staging Supabase + migrations**
  - Create new project; run `supabase/migrate.sql` then
    `supabase/migrations/013…060` + `0201_integrations.sql` in order; confirm
    `schema_migrations` rows and RLS enabled on all tables.
  - Verify: table list matches prod schema; spot-check `get_user_business_id()`.
- [ ] **Task 4: Staging secrets + seed data**
  - Generate fresh `ENCRYPTION_KEY`; seed a test business, admin user, sample
    contacts/messages so the dashboard is explorable immediately.
  - Verify: login as seeded admin; dashboard renders with data.

### Checkpoint: Database
- [ ] Migrations applied cleanly; seeded login works.

### Phase 2 — Staging Vercel + Routing

- [ ] **Task 5: Staging Vercel project + env vars**
  - New Vercel project linked to repo, production branch `develop`; set all env
    vars (table above) for Production; attach `dev.hopechat.net` + TLS.
  - Verify: first deploy succeeds; `https://dev.hopechat.net` serves landing.
- [ ] **Task 6: Host routing + cron for staging**
  - Extend `src/proxy.ts` host map for `dev.hopechat.net` (and
    `dev.app.` / `dev.docs.` subdomains or equivalent); confirm `vercel.json`
    cron registers on the staging project.
  - Verify: landing, dashboard, and docs all resolve on staging hosts; cron
    endpoint responds with correct secret.

### Checkpoint: Deployable Staging
- [ ] `develop` push auto-deploys to `dev.hopechat.net`; all three surfaces route.

### Phase 3 — Third-party isolation

- [ ] **Task 7: Sandbox third-party config**
  - Pesapal sandbox creds; shared Meta test app pointed at test business/phone
    only; staging Cal.com key + `CALCOM_WEBHOOK_SECRET`; test SMTP inbox.
  - Verify: one sandbox checkout, one WhatsApp test message, one booking webhook
    received on staging (not prod).

### Phase 4 — Runbook & verification

- [ ] **Task 8: Deployment runbook**
  - Document: migrate order, env var checklist per environment, promote-to-prod
    steps (`develop` → PR → `main`), rollback (Vercel instant rollback + migration
    reversal notes), Supabase free-tier pause caveat.
  - Verify: a second person (or fresh session) can follow it end-to-end.
- [ ] **Task 9: Full staging smoke test**
  - Checklist: signup → magic/recovery email link lands on
    `dev.hopechat.net/login` (valid absolute URL), AI chat reply, sandbox
    checkout + webhook, Google Sheets sync, inbound WhatsApp webhook, Cal.com
    booking, cron fires.
  - Verify: all checklist items pass; no prod URLs or prod data touched.

### Checkpoint: Complete
- [ ] All acceptance criteria met; human reviews before merge to `main`.

## Dependency Graph

```
Task 1 ─► Task 2 ─┐
                  ├─► Task 3 ─► Task 4 ─► Task 5 ─► Task 6 ─► Task 7 ─► Task 8 ─► Task 9
(branches/CI)     │  (Supabase)         (Vercel)   (routing) (3rd-party) (runbook) (E2E)
```

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Supabase free tier pauses after ~1 wk idle | High | Weekly keepalive ping (cron or manual) or upgrade staging to Pro. |
| `NEXT_PUBLIC_*` baked at build time | High | Set env vars before first build; changing Supabase URL requires redeploy. |
| Webhook/cron cross-talk between envs | High | Distinct secrets + sandbox endpoints; verify webhook target URLs point at `dev.hopechat.net`. |
| Shared Meta test app sends to wrong place | Med | Only test phone numbers/businesses registered on the test app. |
| `ENCRYPTION_KEY` mismatch surprises (staged rows unreadable) | Med | Expected by design; document in runbook — never copy encrypted rows across envs. |
| Full `npm run lint` native crash in CI | Low | Per-file eslint or build-only gate initially. |
| `src/proxy.ts` host map misses staging hosts | Med | Task 6 explicitly covers all three surfaces on `dev.` hosts. |
| Overwriting Cal.com plan in `tasks/` | Low | Approved by user; Cal.com plan recoverable from git history if needed. |

## Resolved Decisions

- Staging domain: **`dev.hopechat.net`**.
- Meta: **same test app** (no second app).
- `tasks/plan.md` / `tasks/todo.md`: **overwritten** with this plan.

## Resolved Questions

- Staging Supabase: **Free** tier with a weekly keepalive ping to avoid idle-pause.
- Seed data: minimal fixture (1 test business + admin), expandable later.

## Parallelization Opportunities

- Task 1 and Supabase project creation (Task 3 manual console step) can start in parallel.
- Task 2 (CI) independent of Phases 1–2.
- Task 7 third-party setup mostly independent once Task 5 env vars exist.

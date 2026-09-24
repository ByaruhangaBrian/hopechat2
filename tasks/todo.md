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

- [ ] **Task 3: Provision staging Supabase + migrations**
  - New project; run `supabase/migrate.sql` + `supabase/migrations/013…060` +
    `0201_integrations.sql` in order; confirm `schema_migrations` + RLS.
  - Verify: schema matches prod; `get_user_business_id()` present.
- [ ] **Task 4: Staging secrets + seed data**
  - Fresh 64-hex `ENCRYPTION_KEY`; seed test business, admin user, sample data.
  - Verify: seeded admin login renders populated dashboard.

### Checkpoint: Database
- [ ] Migrations clean; seeded login works.

## Phase 2 — Staging Vercel + Routing

- [ ] **Task 5: Staging Vercel project + env vars**
  - New project, production branch `develop`, all env vars (see plan table),
    TLS for `dev.hopechat.net`.
  - Verify: first deploy serves landing on `https://dev.hopechat.net`.
- [ ] **Task 6: Host routing + cron for staging**
  - Extend `src/proxy.ts` for `dev.` hosts (landing/dashboard/docs); confirm
    `vercel.json` cron on staging project.
  - Verify: all three surfaces resolve; cron endpoint auth-checks correctly.

### Checkpoint: Deployable Staging
- [ ] Push to `develop` auto-deploys to `dev.hopechat.net`; routing works.

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

### Checkpoint: Complete
- [ ] All acceptance criteria met; human reviews before merge to `main`.

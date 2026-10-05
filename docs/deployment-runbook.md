# Deployment Runbook — HopeChat2

Operational procedures for the production (`hopechat.net`) and staging
(`dev.hopechat.net`) environments. Follow top to bottom; every section ends
with a verification step.

Reference data (verified 2026-09-26):

| | Staging | Production |
| --- | --- | --- |
| Hosts | `dev.hopechat.net` | `hopechat.net`, `app.hopechat.net`, `docs.hopechat.net` |
| Git branch | `develop` | `main` |
| Vercel project | `hopechat2-staging` | `hopechat2` |
| Vercel project ID | `prj_XRbcRYGMcmkuo2j0l01PjMwXRxUl` | `prj_4CmW0qIo6sLo9QjjpHkBCClbYVac` |
| Vercel team | `team_QAoz2Dubtc8iWVzFrlyGMoX2` | (same team) |
| Supabase project | `hopechat-staging` | (prod project) |
| Supabase ref | `dbrciimrntdpvhvzhhdt` (eu-west-1) | `cahycfzvsbmotvgszssr` |
| Vercel Cron schedule base | `develop` → auto-deploy | `main` → auto-deploy |

Both environments share ONE codebase and ONE deployment; `src/proxy.ts`
splits the subdomains (apex = marketing, `app.` = business app, `docs.` =
documentation site).

---

## 1. Environment variables

`next.config.ts` injects env into the Vercel build/deployment; server-side
routes read `process.env.*` at runtime. `NEXT_PUBLIC_*` vars are inlined at
build time — changing them requires a new deploy.

Required on every environment:

| Env var | Notes |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project settings |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only; never in client code |
| `ENCRYPTION_KEY` | 64 hex chars (32 bytes, AES-256-GCM). **Rotating orphans stored tokens** — WhatsApp/Pesapal/Sheets keys must be re-entered |
| `META_APP_SECRET` | HMAC for inbound WhatsApp webhooks |
| `NEXT_PUBLIC_SITE_URL` | canonical URL for sitemap/OG/emails (default `https://wacrm.tech`) |

Feature / guarded-route vars (set when the feature is used):

| Env var | Guards / uses |
| --- | --- |
| `AUTOMATION_CRON_SECRET` | `x-cron-secret` for `/api/automations/cron` (drains pending executions) |
| `LEAD_RECOVERY_CRON_SECRET` | `x-cron-secret` for `/api/onboarding-funnel/cron` (recovery emails) |
| `WHATSAPP_AI_QUEUE_SECRET` | `/api/whatsapp/queue` |
| `GEMINI_API_KEY` | global AI fallback (per-business keys live in DB, encrypted) |
| `PESAPAL_CONSUMER_KEY` / `PESAPAL_CONSUMER_SECRET` | payments fallback (DB per-business overrides) |
| `CALCOM_API_KEY` / `CALCOM_USERNAME` / `CALCOM_BASE_URL` / `CALCOM_WEBHOOK_SECRET` | Cal.com scheduling + webhook signature |
| `GOOGLE_SHEETS_CLIENT_EMAIL` / `GOOGLE_SHEETS_PRIVATE_KEY` | Sheets sync fallback |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` | nodemailer fallback (DB `system_settings.email_settings` overrides) |

> GROQ keys are NOT env vars — they are per-business, stored encrypted in
> `ai_settings.groq_api_key`.

Known gaps as of 2026-09-26: staging lacks `META_APP_SECRET`, `GEMINI_API_KEY`,
`GOOGLE_SHEETS_*`, `PESAPAL_*`, `SMTP_*`. Prod lacks `AUTOMATION_CRON_SECRET`,
`LEAD_RECOVERY_CRON_SECRET`, `CALCOM_WEBHOOK_SECRET`, `PESAPAL_*`, `SMTP_*`.

**How to set** (staging, dev install; `%APPDATA%\xdg.data\com.vercel.cli\auth.json`
holds the CLI token — rerun `vercel login` if that file is lost):

```
vercel env add <KEY> production   # from repo root (linked to hopechat2-staging)
vercel env pull --environment=production   # inspect plaintext locally
```

Prod project: `vercel link --project hopechat2` once, or use the Dashboard
(Project → Settings → Environment Variables) on `hopechat2`.

**Rotating the cron secrets** (procedure used 2026-09-25 during the Task-6
incident):

1. Generate new values (`openssl rand -hex 32`).
2. Replace `AUTOMATION_CRON_SECRET` / `LEAD_RECOVERY_CRON_SECRET` in the
   **Vercel project** (target `production` + `preview`). Old values can be
   deleted after the new deploy is live.
3. Update the matching GitHub repo secrets on `ByaruhangaBrian/hopechat2`
   (`gh secret set`), because `cron.yml` sends the header value from GHA:
   `STAGING_AUTOMATION_CRON_SECRET` / `STAGING_LEAD_RECOVERY_CRON_SECRET`,
   and `PROD_AUTOMATION_CRON_SECRET` / `PROD_LEAD_RECOVERY_CRON_SECRET`.
4. Deploy (see §3) and verify both routes (§4).
5. Update the local secrets file so the human operator (and future agents)
   has a single source of truth: `%TEMP%\hc_staging_creds.txt`.

---

## 2. Database migrations

Repo is the canonical source of truth — prod was found behind (never applied
049–058); staging applied `001…060, 0201` + harden migrations. Migration
**061 must be applied to prod FIRST** before any newer migration, because it
closes the anonymous-superadmin bypass and is self-contained (no deps).

Rule: **empty remaining migration table vs prod is: 049–058, 061. Apply in
numeric order; 061 is independent and can go first if you need only the
security fix immediately.**

Apply methods (in order of preference on this machine):

1. **Supabase Dashboard** → SQL Editor → paste file contents → Run. Works for
   both envs regardless of network/IPv6 constraints.
2. **Management API query endpoint** (used for staging — the old DB host
   resolves IPv6-only and there is no psql on the dev laptop):
   `POST https://api.supabase.com/v1/projects/{ref}/database/query` with
   body `{ "query": "<sql>" }` and the `sbp_…` Management token.
3. `supabase db push` (needs a DB password — not available for these envs yet).

Seed data (staging only): `supabase/seed.sql` gives a loggable admin
`stagingadmin@hopetech.com` + a sample business with deals/contacts/etc. On a
fresh staging project run it after the migrations (see `Task 4`). Never run it
against prod.

Verify after migrating: anon `select * from contacts;` must return **zero
rows** on staging and prod (both should already close the superadmin bypass
via 061; staging additionally verified with impersonation headers →
`[]`).

---

## 3. Deploying

**Push-based (normal)**: push to `develop` (staging) or `main` (prod). The
Vercel GitHub integration builds and assigns the production alias for that
project's production branch.

**Manual direct-upload (staging troubleshooting)**: from the repo root with
the CLI linked to `hopechat2-staging`

```
vercel deploy --prod --yes
```

Why we needed this on 2026-09-26: same-SHA redeploys through the git
integration can serve a build-cache-stale artifact, and the edge CDN caches
for up to 300 s (+ SWR). A direct upload produces genuinely fresh output.

**Rollback**:
- Vercel: `vercel rollback <deployment-id>` (or Dashboard → Deployments →
  the previous deployment → ⋯ → Rollback). DNS/varnish will pick it up
  within ~1 min.
- Git: `git revert <sha>` on the branch and push, or `git push -f origin <sha>:<branch>`
  (force-push only if the team agrees).

---

## 4. Verifying a deployment

1. `curl -I https://dev.hopechat.net/` → HTTP 200 (or `https://hopechat.net/`).
2. `/login` → HTTP 200.
3. Asset integrity: load `/login`, grab a `/_next/static/chunks/*.js` name,
   `curl` it — must be HTTP 200 (not 404 = stale HTML/chunk drift).
4. Cron routes (must be behind the `x-cron-secret` now):
   - `curl -H "x-cron-secret: <secret>" https://<host>/api/automations/cron`
     → `200 {"processed":…}`
   - same for `/api/onboarding-funnel/cron` → `200 {"ok":true,…}`
   - no/garbage header → **401**. If you ever see 200 without a valid secret,
     check `Cache-Control` on the response — it must say **`no-store`** and
     `X-Vercel-Cache: MISS`. A `public, max-age` / `X-Vercel-Cache: HIT` on an
     `/api` route means the header-rule order in `next.config.ts` regressed
     (see the 2026-09-26 caches incident below) — fix and redeploy.

**2026-09-26 incident — edge caching of /api (do not reintroduce):**
Headers rules in `next.config.ts` are merged; on a conflict the **LAST**
matching rule wins (`headers.md` → "Header Overriding Behavior"). The
`/:path*` catch-all (`public, max-age=0, s-maxage=300, stale-while-revalidate=86400`)
was listed AFTER `/api/:path*` `no-store`, so every API response was cached
publicly at the edge and stale successful cron bodies were served to any
caller with no/bad secrets. The current order keeps the catch-all FIRST and
the `/api/*` `no-store` override AFTER it. Do not revert the order.

---

## 5. Cron driver (GitHub Actions)

`vercel.json` registers crons but Vercel Cron only fires on paid plans; this
team is on Hobby, so `.github/workflows/cron.yml` drives both routes from GHA
(schedules evaluate on the **default branch = `main`**):

- `5 0 * * *` → `/api/onboarding-funnel/cron` (daily lead-recovery)
- `*/30 * * * *` → `/api/automations/cron` (queue drain / keepalive)

Matrix: staging (`https://dev.hopechat.net`, secrets
`STAGING_AUTOMATION_CRON_SECRET`/`STAGING_LEAD_RECOVERY_CRON_SECRET`) and prod
(`https://hopechat.net`, `PROD_*`). Jobs that have no secret configured
self-skip, so prod is dormant until you set the `PROD_*` secrets — that is the
single step to arm prod cron, and it should not be done until prod Vercel env
has `AUTOMATION_CRON_SECRET` + `LEAD_RECOVERY_CRON_SECRET` set (§1).

**Supabase Free-tier idle pause:** the staging Supabase project can pause
after ~1 week of inactivity. The half-hourly automations cron hits staging's
DB via the service-role client, doubling as a keepalive, so a pausing project
simply wakes when prod cron traffic flows again. If the dashboard shows a
paused project, it resumes on first query (no data loss).

Manual run: GitHub → Actions → `cron` → **Run workflow** (choose `target`).

---

## 6. Promote `develop` → `main` (release)

1. `git checkout main && git pull`
2. `git merge develop` — a clean fast-forward unless prod-only fixes were made
   on `main` (034/041-era hotfixes have lived there before; reconcile then).
3. Apply **migration 061 to prod before or with the merge** (§2). Prod is the
   only environment that can still exhibit the anonymous-superadmin bypass
   until 061 is applied, so treat (2)-(3) as one operation.
4. Run the env-gap checklist (§1) for prod; set missing vars.
5. Push → verify against `https://hopechat.net` (§4).
6. Only after prod cron env secrets exist, set `PROD_*` GHA secrets (§5) —
   this is the explicit **arm prod cron** step.

---

## 7. Staging hygiene

- Working tree on `develop` holds local-only state (e.g. `supabase/seed.sql`
  is committed; the `%TEMP%\hc_staging_creds.txt` secrets file is NOT in the
  repo — keep it out).
- The edge cache self-heals via `no-store`; if you still see a stale
  `X-Vercel-Cache: HIT` on an `/api` response, hit the URL with a
  cache-busting query (`?bust=<random>`) once to force a MISS, then retest.
- Never point prod envs at the staging Supabase project and vice versa; the
  service-role keys differ per project.
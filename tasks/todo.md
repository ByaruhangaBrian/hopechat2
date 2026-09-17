# Task List — Docs Site for New Business Setup

Legend: `[ ]` pending, `[x]` done. Each task is independently verifiable.
Deployment: single app; docs served on `docs.hopechat2.vercel.app` via Next.js Proxy host rewrite. Content: hand-written TSX pages.

---

## Task 1: Proxy migration + docs host routing
**Description:** Rename `src/middleware.ts` → `src/proxy.ts`, porting all existing auth logic unchanged (named `proxy` export, same `matcher` config). Add host-based routing: when `request.nextUrl.hostname` starts with `docs.` and ends with `hopechat2.vercel.app`, rewrite to `/docs/<path>` (pass through when path already starts with `/docs`). Existing auth redirects/protections must behave identically.

**Acceptance criteria:**
- [ ] `src/proxy.ts` exists with `export function proxy(...)`; `src/middleware.ts` removed
- [ ] Docs-host requests rewrite to `/docs/*`; main domain unaffected for all existing routes
- [ ] Auth behavior byte-for-byte identical (login/signup/onboarding/dashboard redirects, admin guard, API auth)

**Verification:**
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] Manual: landing + dashboard + auth flows unchanged; direct `docs.hopechat2.vercel.app/about` style request hits `/docs` (test via localhost `Host: docs.hopechat2.vercel.app` header equivalent / preview)

**Dependencies:** None

**Files likely touched:**
- `src/middleware.ts` (rename → `src/proxy.ts`)

**Estimated scope:** Small (1-2 files)

---

## Task 2: Docs shell (layout + sidebar + nav registry)
**Description:** `src/app/docs/layout.tsx` rendering a docs chrome: top bar with brand + "Back to HopeChat", responsive sidebar (desktop fixed, mobile collapsible) listing every guide from a typed nav registry (`src/components/docs/nav.ts`), active-page highlight, styled to match the landing page design system. Docs metadata: `%s — HopeChat Docs` title template, description, `robots: index`.

**Acceptance criteria:**
- [ ] Sidebar auto-renders all pages from the nav registry; active page highlighted
- [ ] Mobile: sidebar collapses behind a toggle; content remains readable
- [ ] Metadata title/description + robots:index set on the docs layout

**Verification:**
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] Manual: navigate docs in desktop + mobile widths

**Dependencies:** Task 1

**Files likely touched:**
- `src/app/docs/layout.tsx`
- `src/components/docs/nav.ts`
- `src/components/docs/sidebar.tsx`
- `src/components/docs/docs-header.tsx`

**Estimated scope:** Medium (3-4 files)

---

## Task 3: Overview / Getting started page
**Description:** `/docs` index page — what HopeChat is, prerequisites (WhatsApp Business account, Meta developer app, phone number to connect), and a numbered high-level setup path with cards/links to each guide page.

**Acceptance criteria:**
- [ ] Page renders at `/docs` root with introduction + prerequisites
- [ ] Every setup step links to its corresponding guide page (registry-driven where sensible)
- [ ] No references to features/behaviors that don't exist in the product

**Verification:**
- [ ] `npx tsc --noEmit` passes
- [ ] Manual: all links resolve; page matches landing-page visual language

**Dependencies:** Task 2

**Files likely touched:**
- `src/app/docs/page.tsx`

**Estimated scope:** Small (1 file)

---

## Task 4: Essential setup guides (account + WhatsApp)
**Description:** `/docs/account` — sign up, name your workspace (onboarding screen), enter dashboard, first checklist. `/docs/whatsapp` — what's needed, where to find Phone Number ID / WABA ID / System User token in Meta, pasting into Settings → WhatsApp Config, verifying connection, common errors (content verified against `whatsapp-config.tsx`).

**Acceptance criteria:**
- [ ] Account guide covers signup → workspace naming → dashboard entry accurately
- [ ] WhatsApp guide names the exact fields shown in `whatsapp-config.tsx` and where each value lives in Meta; describes connection states + error recovery
- [ ] Both pages appear in the sidebar nav

**Verification:**
- [ ] `npx tsc --noEmit` passes
- [ ] Manual: read-through matches the actual settings screen

**Dependencies:** Task 3

**Files likely touched:**
- `src/app/docs/account/page.tsx`
- `src/app/docs/whatsapp/page.tsx`
- `src/components/docs/nav.ts`

**Estimated scope:** Medium (3 files)

---

## Checkpoint: Core Path (after Tasks 1-4)
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] Manual: docs.hopechat2.vercel.app root serves overview; sidebar navigates account + WhatsApp guides; main domain unchanged
- [ ] Review with human before proceeding

---

## Task 5: Team, templates, contacts guides
**Description:** `/docs/team` — roles/permissions, seats by plan, adding members (Settings → Users). `/docs/templates` — creating Meta-approved message templates, variable substitution, status. `/docs/contacts` — importing CSV, tags, custom fields, dedupe.

**Acceptance criteria:**
- [ ] Each page describes the real flow with the real labels (verify against `user-management.tsx`, `template-manager.tsx`, contacts components)
- [ ] All three appear in the sidebar with internal cross-links where relevant

**Verification:**
- [ ] `npx tsc --noEmit` passes
- [ ] Manual: steps reproducible in the app

**Dependencies:** Task 4

**Files likely touched:**
- `src/app/docs/team/page.tsx`
- `src/app/docs/templates/page.tsx`
- `src/app/docs/contacts/page.tsx`
- `src/components/docs/nav.ts`

**Estimated scope:** Medium (4 files)

---

## Task 6: Automations, AI, tests guides
**Description:** `/docs/automations` — triggers, conditions, steps incl. `dispatch_test`, builder walkthrough, run logs. `/docs/ai` — knowledge base uploads, training, escalation to humans. `/docs/tests` — practice drills vs timed exams, entry-test routing, once-per-number rule, how students experience it, credit cost.

**Acceptance criteria:**
- [ ] Automation guide documents triggers/branches/waits/dispatch-test using builder vocabulary from `automation-builder.tsx`
- [ ] AI guide matches the AI config/knowledge manager screens
- [ ] Tests guide reflects `runtime.ts` behavior (practice vs timed, routing, attempt limit) and credit cost

**Verification:**
- [ ] `npx tsc --noEmit` passes
- [ ] Manual: walkthroughs reproducible

**Dependencies:** Task 5

**Files likely touched:**
- `src/app/docs/automations/page.tsx`
- `src/app/docs/ai/page.tsx`
- `src/app/docs/tests/page.tsx`
- `src/components/docs/nav.ts`

**Estimated scope:** Medium (4 files)

---

## Task 7: Broadcasts, billing, FAQ guides
**Description:** `/docs/broadcasts` — approved templates, audience selection, scheduling, SMS channel. `/docs/billing` — plans/tiers, Pesapal payments (Mobile Money/card), credit top-up, how message sends + test attempts consume credits. `/docs/faq` — common setup/troubleshooting questions.

**Acceptance criteria:**
- [ ] Broadcast guide matches the broadcast builder steps (template → audience → personalize → schedule)
- [ ] Billing guide reflects `subscriptions/index.ts`, credit model, and Pesapal integration
- [ ] FAQ covers the highest-signal setup questions (WhatsApp connect issues, template approval, timing out, credits)

**Verification:**
- [ ] `npx tsc --noEmit` passes
- [ ] Manual: FAQ answers are accurate against current behavior

**Dependencies:** Task 6

**Files likely touched:**
- `src/app/docs/broadcasts/page.tsx`
- `src/app/docs/billing/page.tsx`
- `src/app/docs/faq/page.tsx`
- `src/components/docs/nav.ts`

**Estimated scope:** Medium (4 files)

---

## Checkpoint: Guides Complete (after Tasks 5-7)
- [ ] All 12 guide pages render; sidebar lists every page; cross-links resolve
- [ ] `npx tsc --noEmit` passes
- [ ] Content spot-checked against real product labels/flows
- [ ] Review with human before proceeding

---

## Task 8: Landing page parity (docs link)
**Description:** Add a "Docs" link to the landing page header and footer pointing at `https://docs.hopechat2.vercel.app` (new service → must be promoted per AGENTS.md parity rule). Keep mobile menu consistent.

**Acceptance criteria:**
- [ ] "Docs" visible in header nav + footer; opens the subdomain in a new tab (external link)
- [ ] Mobile nav includes the same link

**Verification:**
- [ ] `npx tsc --noEmit` passes; `npm run build` passes
- [ ] Manual: click from landing header + footer + mobile menu

**Dependencies:** Task 7 (docs content complete)

**Files likely touched:**
- `src/app/page.tsx`

**Estimated scope:** Small (1 file)

---

## Task 9: Deploy + subdomain wiring (manual handoff)
**Description:** Add `docs.hopechat2.vercel.app` under Vercel Project → Domains, deploy, and verify: subdomain serves docs, main domain serves landing + dashboard unchanged.

**Acceptance criteria:**
- [ ] `docs.hopechat2.vercel.app` resolves and serves the docs site
- [ ] `hopechat2.vercel.app` still serves landing + dashboard; auth flows unaffected
- [ ] Landing "Docs" link works from production

**Verification:**
- [ ] Manual browser check on both hosts

**Dependencies:** Task 8

**Files likely touched:** (none — Vercel dashboard)

**Estimated scope:** XS (external)

---

## Final Checkpoint
- [ ] All acceptance criteria met
- [ ] `npx tsc --noEmit`, `npx eslint`, `npm run build` all pass
- [ ] docs.hopechat2.vercel.app live, linked from landing, content accurate
- [ ] Ready for human review
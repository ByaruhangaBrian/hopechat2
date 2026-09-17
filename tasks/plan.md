# Implementation Plan: Docs Site for New Business Setup

## Overview

Build a documentation site that walks a new business owner through setting up HopeChat for their business — create account → connect WhatsApp → add team → templates → contacts → automations → tests → broadcasts → billing. The docs are served on the subdomain **docs.hopechat2.vercel.app** (same deployment as the app; host-based routing in Next.js Proxy rewrites that hostname to the `/docs` route group). Content is hand-written static TSX pages — no new markdown/MDX dependencies.

Confirmed with user:
- **Deployment:** same app, host-based routing (one repo, one deploy).
- **Content authoring:** hand-written TSX pages.

## Architecture Decisions

- **Served on a subdomain via Proxy rewrite.** All docs live under `src/app/docs/*` as static (server-rendered) TSX pages. Next.js Proxy checks `request.nextUrl.hostname`; when it is `docs.hopechat2.vercel.app` (or ends with `.hopechat2.vercel.app`), it rewrites the URL by prefixing `/docs`. Main domain keeps serving the landing page + dashboard as today; `/docs` also remains reachable on the main domain (useful for dev/preview).
- **Migrate `middleware.ts` → `proxy.ts`.** Next.js 16 deprecated the `middleware` file convention and renamed it to `proxy`. The existing auth logic in `src/middleware.ts` is ported unchanged to `src/proxy.ts` (same exports, config supported — `matcher`, `NextRequest`/`NextResponse`), and the host-based docs rewrite is added there. Existing behavior preserved; `protectedPaths` does not include `/docs` so docs stay public.
- **Shared docs shell.** `src/app/docs/layout.tsx` renders a docs chrome (top nav with brand + "Back to HopeChat", sidebar listing all guide pages) consistent with the landing page design system. Page list is driven by a typed nav registry so adding a page updates the sidebar automatically.
- **Content grounded in the real product.** Every guide reflects the actual labels/flows in the app (settings tabs, WhatsApp config fields, automation builder, etc.), verified against source before writing.
- **Landing page parity (AGENTS.md).** The marketing landing page gets a "Docs" / "Guides" link (header + footer) pointing at `https://docs.hopechat2.vercel.app`. The docs site itself is a new service/asset → must be reachable from the landing page.
- **Domain wiring is a manual Vercel step.** `docs.hopechat2.vercel.app` is a subdomain of the Vercel-assigned app domain; it must be added under Project → Domains in the Vercel dashboard. Marked as an explicit handoff task (not scriptable here).

## Dependency Graph

```
Proxy/middleware host routing (T1: foundation)
   │
   ├── Docs layout + nav shell (T2)   ◄──  everything else renders inside this
   │        │
   ├────────┼── Overview page (T3)
   │        ├── Setup guides A (T4): account, WhatsApp
   │        ├── Setup guides B (T5): team, templates, contacts
   │        ├── Feature guides A (T6): automations, AI, tests
   │        └── Feature guides B (T7): broadcasts, billing, FAQ
   │
   └── Landing page links (T8)
Deploy + domain verification (T9, manual)
```

Implementation order is bottom-up: routing foundation → shell → pages → links → deploy.

## Task List

### Phase 1: Foundation

- [ ] **Task 1:** Rename `src/middleware.ts` → `src/proxy.ts` porting all existing auth logic unchanged (named `proxy` export), and add host-based rewrite: when `request.nextUrl.hostname` ends with `hopechat2.vercel.app` and starts with `docs.`, rewrite to `/docs/<path>` (pass through if the path already starts with `/docs`). All existing auth redirects/protections must behave identically.

### Checkpoint: Foundation
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] Manual: `hopechat2.vercel.app` still serves landing+dashboard; auth redirects unchanged

### Phase 2: Docs Shell + Core Pages

- [ ] **Task 2:** Docs shell — `src/app/docs/layout.tsx` (metadata with title template + `robots: index`), responsive sidebar (from a typed nav registry, active-state highlight), top bar linking back to the app/landing, styled to match the landing page (Tailwind v4, brand colors, Inter font).

- [ ] **Task 3:** Overview / Getting started page (`/docs`) — what HopeChat is, prerequisites (WhatsApp Business account, Meta developer app), and a numbered high-level setup path with links to each guide.

- [ ] **Task 4:** Essential setup guides — **Create account & workspace** (`/docs/account`: signup → name workspace → enter dashboard) and **Connect WhatsApp** (`/docs/whatsapp`: what's needed, where to find Phone Number ID / WABA ID / System User token, pasting into Settings → WhatsApp Config, webhook/verify status, common errors). Content verified against `whatsapp-config.tsx`.

### Checkpoint: Core Path
- [ ] `npx tsc --noEmit` passes; `npm run build` passes
- [ ] Manual: docs.hopechat2.vercel.app root serves the overview; sidebar navigates across pages; main domain unaffected

### Phase 3: Setup + Feature Guides

- [ ] **Task 5:** Team & templates & contacts — **Team & permissions** (`/docs/team`: roles, seats, adding members via Settings → Users), **Message templates** (`/docs/templates`: creating/approving Meta templates, variables), **Contacts** (`/docs/contacts`: importing CSV, tags, custom fields, dedupe).

- [ ] **Task 6:** Automation & AI & tests — **Automations** (`/docs/automations`: triggers, conditions, steps incl. dispatch test, builder walkthrough), **AI assistant** (`/docs/ai`: knowledge base, training, escalation), **Tests & Practice** (`/docs/tests`: creating practice drills vs timed exams, entry-test routing, how students experience it).

- [ ] **Task 7:** Broadcasts & billing & FAQ — **Broadcasts** (`/docs/broadcasts`: templates, audience, scheduling, SMS channel), **Billing & credits** (`/docs/billing`: plans, Pesapal payments, credit top-up, how attempts consume credits), **FAQ / troubleshooting** (`/docs/faq`).

### Checkpoint: Guides Complete
- [ ] All 12 guide pages render, sidebar shows every page, internal cross-links resolve
- [ ] Content matches actual product labels/flows (spot-checked against components/APIs)
- [ ] Review with human before proceeding

### Phase 4: Landing Page Parity + Deploy

- [ ] **Task 8:** Landing page parity — add a "Docs" link in the landing header + footer pointing to `https://docs.hopechat2.vercel.app` (per AGENTS.md parity rule); keep mobile nav consistent.

- [ ] **Task 9 (deploy, manual/handoff):** Add `docs.hopechat2.vercel.app` under Vercel Project → Domains for this project, deploy, verify the subdomain serves docs and the main domain is unchanged.

### Checkpoint: Complete
- [ ] All acceptance criteria met
- [ ] `npx tsc --noEmit`, `npx eslint`, `npm run build` all pass
- [ ] docs.hopechat2.vercel.app live and linked from the landing page
- [ ] Ready for human review

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `proxy.ts` migration subtly changes auth behavior | High | Port `middleware.ts` logic with zero functional changes; verify dashboard/login/onboarding redirects manually before moving on |
| `docs.hopechat2.vercel.app` subdomain not addable/routeable via Vercel dashboard alone | High | Confirm domain addition early (handoff task); fallback: add the domain in Vercel and keep host-agnostic `/docs` reachable as backup |
| Content drifts from the real product (labels/flows change) | Med | Each guide is written against current source (`whatsapp-config.tsx`, `settings/page.tsx`, builder components, `runtime.ts`) before implementation |
| Duplicating design system instead of reusing it | Med | Reuse existing Tailwind classes, `cn`, button/link variants, Inter font, brand colors from the landing page |
| Docs accidentally require auth (middleware overlap) | Low | `/docs` is absent from `protectedPaths`; Proxy rewrite short-circuits before auth checks |

## Open Questions

- Should `/docs` also remain reachable on the main domain (`hopechat2.vercel.app/docs`), or redirect/404 there in favour of the subdomain only? (Default: keep reachable — dev/preview friendly, zero extra work.)
- Canonical base URL for docs metadata — `NEXT_PUBLIC_SITE_URL` vs hardcoding the subdomain? (Default: hardcode the docs subdomain for canonical/OG.)
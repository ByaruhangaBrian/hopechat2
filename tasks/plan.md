# Implementation Plan: Cal.com Scheduling / Bookings Integration

## Overview

Add a **Calendar / Bookings** module to the HopeChat CRM integrated with **Cal.com**.
Per confirmed decisions:

1. **Credentials live in Settings → Integrations** (`type = 'calcom'`, API key + username,
   stored encrypted, following the Google Sheets pattern).
2. **Management lives on a new `/bookings` page + sidebar menu item**
   (new `bookings` permission key). The page lists Cal.com event types, lets the
   business toggle each enabled/disabled, and shows a copy-ready booking link
   (`https://cal.com/{username}/{slug}`).
3. **Sharing is copy-and-post**: the booking link is copied to the clipboard and the
   UI points to pasting it into the AI assistant prompt / a chat message — no dedicated
   send route in v1.
4. A **Cal.com webhook** syncs created/rescheduled/cancelled bookings into a
   business-scoped `cal_bookings` table, surfaced as a recent-bookings list on the
   `/bookings` page.

Everything follows existing conventions: `business_integrations` for credentials,
`google-sheets.ts` as the third-party API lib template, the WhatsApp webhook route +
`webhook-signature.ts` as the inbound-HMAC template, `resolveBusinessId()` for
server-side scoping, and the AGENTS.md landing-page parity rule.

## Architecture Decisions (confirmed)

- **Auth: Cal.com API key (v1 API) + username.** API key encrypted with
  `ENCRYPTION_KEY`, never returned to the client. Transport encapsulated in
  `calcom.ts` so an OAuth upgrade stays possible.
- **Config storage: reuse `business_integrations`** (`type = 'calcom'`, unique per
  business). Config JSON: `{ calcom_api_key (enc), calcom_username, webhook_secret (enc) }`.
  Optional `system_settings` global fallback row.
- **New DB object: only `cal_bookings`.** RLS per-operation with
  `get_user_business_id() OR is_admin_view_all()` plus explicit
  `FOR ALL TO service_role USING (true)` (migration 048 gotcha: never an empty role list).
- **UI split: Settings → Integrations = connect pane only; `/bookings` = manage.**
  New `bookings` PermissionKey (business-config, not granted to agents by default),
  sidebar entry, and `pathGates` entry in `dashboard-shell.tsx`.
- **Sharing: clipboard copy + AI-prompt hint.** Build the Cal.com scheduling URL,
  copy to clipboard; hint text tells the business to drop it into the AI assistant
  prompt or a chat.
- **Webhook: Cal.com shared-secret HMAC.** `src/lib/calcom/webhook-signature.ts`
  (fail closed, constant-time compare) modeled on the WhatsApp webhook.
  Assumption: header `X-Cal-Signature-256: SHA256=<hex>` — verify manually in Task 8.
- **Env vars** (`.env.local.example`, OPTIONAL): `CALCOM_API_BASE`
  (default `https://api.cal.com/v1`), optional global `CALCOM_WEBHOOK_SECRET`.
- **Tests**: colocated `*.test.ts` under `src/lib/...`. NOTE: the vitest runner is
  broken on this machine (rolldown `styleText`) — tests are written and run only if
  the runner works; verification leans on `npm run typecheck` + `npm run build`
  + manual checks.

## Task List

### Phase 0: Foundation

- [ ] **Task 1: DB migration `060_calcom_scheduling.sql`**
  - Create `cal_bookings` (business-scoped, JSONB payload, unique
    `(business_id, cal_event_id)`), indexes, `update_updated_at_column()` trigger.
  - RLS per-op policies + explicit `TO service_role` full-access policy.
  - Seed optional `system_settings` fallback row for calcom.
- [ ] **Task 2: Cal.com API client lib `src/lib/integrations/calcom.ts` + tests**
  - Encrypted-config loader (mirror `google-sheets.ts`: lazy admin, decrypt,
    env/global fallback, `logHttpEvent`).
  - `fetchEventTypes`, `patchEventType(id, {disabled, length?})`,
    `buildBookingLink(username, slug)`, typed `EventType`.
  - `calcom.test.ts` for URL building + response parsing (mocked fetch).

### Checkpoint: Foundation
- [ ] Migration clean; `npm run typecheck` + `npm run build` pass.

### Phase 1: Connect & Navigate

- [ ] **Task 3: Config API `src/app/api/integrations/calcom/route.ts`**
  - GET: decrypts config → connection status (+ live event types when configured).
  - POST: upserts config (encrypt keys, blank fields keep existing), tests the
    connection; clean 4xx on invalid key/username.
  - DELETE: clears the integration.
- [ ] **Task 4: Settings connect UI `src/components/settings/calcom-form.tsx` + hub**
  - Connect pane only: API key + username inputs, masked saved-state,
    Save & Test with toasts, Disconnect.
  - Flip the `calendly` stub card in `integrations-hub.tsx` → **Cal.com**
    ("Configure"), with a hint that management lives on the Bookings page.
- [ ] **Task 5: `bookings` permission + sidebar + `/bookings` page shell**
  - `permissions.ts`: add `bookings` to `PermissionKey`, `PERMISSION_DEFINITIONS`,
    `FULL_ACCESS`, `AGENT_DEFAULT` (false), `BUSINESS_CONFIG_PERMISSIONS`.
  - Sidebar nav item "Bookings" (+ `permissionByPath`), `pathGates` entry in
    `dashboard-shell.tsx`.
  - `src/app/(dashboard)/bookings/page.tsx` skeleton: client page, permission-clamped,
    loading/empty states, panel placeholders.

### Checkpoint: Connect & Navigate
- [ ] Connect a real Cal.com account from Settings; sidebar shows Bookings;
      unpermissioned users are bounced from `/bookings`.

### Phase 2: Manage & Share

- [ ] **Task 6: Event-type toggle API
        `src/app/api/integrations/calcom/event-types/[id]/route.ts`**
  - PATCH `{ disabled: boolean }` (+ optional `length`) via Cal.com; 4xx with
    Cal.com error detail on failure.
- [ ] **Task 7: `/bookings` manage UI**
  - Event-type list: title, duration, enabled/disabled toggle (optimistic + rollback),
    booking link with **Copy** button, hint "Paste this link into your AI assistant
    prompt or a chat to share it."
  - Empty/no-integration state links back to Settings → Integrations.

### Checkpoint: Manage Flow
- [ ] Toggling enable/disable reflects on Cal.com and in the UI; copy link works.

### Phase 3: Track Bookings

- [ ] **Task 8: Cal.com webhook**
  - `src/lib/calcom/webhook-signature.ts` + `webhook-signature.test.ts`
    (HMAC-SHA256, fail closed, constant-time compare).
  - `src/app/api/calcom/webhook/route.ts`: verify raw-body signature; parse
    `BOOKING_CREATED / BOOKING_RESCHEDULED / BOOKING_CANCELLED`; upsert
    `cal_bookings` via admin client; `logHttpEvent`; always 200 for acknowledged.
- [ ] **Task 9: Bookings list API + `/bookings` panel**
  - `src/app/api/calcom/bookings/route.ts`: recent bookings per business
    (status: booked | rescheduled | cancelled).
  - Recent-bookings panel on the `/bookings` page: attendee, event, time, status pill.

### Checkpoint: Shipped Slice
- [ ] A booking made via a shared link appears in-app; reschedule/cancel dedupes.

### Phase 4: Parity & Polish

- [ ] **Task 10: Landing page parity (AGENTS.md mandatory)**
  - `src/app/page.tsx`: feature card for appointment booking, matching FAQ entry,
    Cal.com under Integrations chips/footer.
- [ ] **Task 11: Hardening pass**
  - RLS/service-role policies, rate-limit usage, no keys in client bundles,
    dark/light contrast, reduced-motion; final `lint`/`typecheck`/`build`.

### Checkpoint: Complete
- [ ] All acceptance criteria met; human reviews before merge.

## Dependency Graph

```
Task 1 (migration) ───────────────┐
Task 2 (calcom lib) ──────────────┼──► Task 3 ─► Task 4 (settings connect UI)
         │                        │              Task 5 (nav + /bookings shell)
         └──────────► Task 6 (toggle API) ─────────► Task 7 (/bookings manage UI)
         └──────────► Task 8 (webhook lib + route) ─► Task 9 (bookings list + panel)
Tasks 1–9 ────────────────────────────────────────────► Task 10, Task 11
```

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Cal.com v1 API variability/possible deprecation | Med | Encapsulate transport in `calcom.ts`; env-overridable `CALCOM_API_BASE`; mock-based tests; document endpoints. |
| Username scoping when a key owns multiple calendars/orgs | Med | Always pass `username` param; surface Cal.com errors plainly in UI. |
| Webhook signature header assumption (`SHA256=<hex>`) | Med | Fail-closed verification + fixtures; manual replay check in Task 8; per-business secret in config. |
| RLS service-role policy omission (048 gotcha) | High | Explicit `FOR ALL TO service_role USING (true) WITH CHECK (true)`. |
| vitest runner broken on this machine | Low | Tests written but gated; verified via typecheck/build/manual. |
| New permission key affects existing profiles | Low | `normalizePermissions()` fills missing keys from role defaults; agents default to `bookings: false`. |
| Landing page parity required (AGENTS.md) | Med | Task 10 is mandatory before "done". |
| API key leaking to client bundles | High | Key encrypted in DB; routes decrypt server-side; client sees only status + event types. |

## Resolved Decisions

- Auth: **API key + username** (encrypted, admin-owned).
- UI: credentials in **Settings → Integrations**; management on a new **`/bookings` menu item**.
- Schedule depth: **view + toggle event types, share links** (no availability editing in v1).
- Sharing: **copy the link** and paste into the AI assistant prompt or a chat (no send route in v1).

## Parallelization Opportunities

- Tasks 1 and 2 are independent → parallel.
- Task 5 (nav/permission) is independent of Tasks 3–4 → can run in parallel.
- Task 6 depends on Task 2 only; Task 7 depends on 5 + 6; Task 8 depends on 2;
  Task 9 depends on 8 (+ 7 for the panel). Tasks 10–11 after the feature slices land.
# Implementation Plan: Automated WhatsApp Catalog & Menu

## Overview

Let a business owner upload their products/menu/services once, then have HopeChat's AI
automatically answer customer questions with a real WhatsApp catalog or menu message —
sized to the business type (a clinic offers services and bookings, a restaurant offers a
menu with image thumbnails, a school offers courses, a retailer offers products with
prices and stock).

The AI decides *when* to send a catalog (the customer asked "what do you sell?", "show me
the menu", "how much is a haircut?"); HopeChat renders it natively.

## The load-bearing constraint (verified)

I checked what the Cloud API can actually send. This determines the whole design:

| Approach | Cloud API support | Verdict |
|---|---|---|
| `interactive.type: "catalog_message"` / `"product"` / `"product_list"` | Supported **only** for catalogs registered in **Meta Commerce Manager** and linked to a linked Facebook Business Page. Full-catalog also needs per-sender enablement. | **Rejected as the primary path.** Every tenant would have to onboard Commerce Manager manually. Unshippable for East African SMEs. |
| `interactive.type: "list"` (sections + rows) | First-class, in every WABA. Body 1024 chars, row title 24, row description 72, max 10 rows/section. | **Primary rendering path.** Works for every tenant, no Meta approval. |
| `interactive.type: "button"` | First-class, max 3 buttons, 20 chars. | Used for small sets and confirmations. |
| Plain text | Always works. | Fallback when text would overflow. |
| Carousel / product templates | Require Meta template approval per business. | Deferred, not in v1. |

The codebase already has `sendInteractiveMessage` (`src/lib/whatsapp/meta-api.ts:199`) which
auto-selects buttons vs list and already truncates to Meta's limits — but its list builder
hardcodes `sections: [{ title: 'Options' }]` and caps at 10 rows with no sectioning. That
gets extended rather than replaced.

So: **HopeChat owns the catalog data; WhatsApp renders it as interactive list/button
messages.** No Commerce Manager dependency.

## Architecture Decisions

- **Catalog lives in Supabase, not Meta.** New `catalog_items` + `catalog_categories`
  tables scoped by `business_id`, matching the existing `053_school_test_module.sql` /
  `057_business_session_settings.sql` conventions (UUID PKs, RLS via `get_user_business_id()`).
- **Business type drives presentation.** `business_settings.value` (already JSONB, already
  per-business, already read by `getBusinessSettings` at `ai-worker.ts:411`) gains a
  `business_type` + `catalog_style` config. No new table needed for the profile.
- **AI triggers via a Gemini tool, not keyword matching.** Reuse the `start_test` pattern
  (`gemini-client.ts:163-183` declaration, `:247-271` handler): a `send_catalog` tool that
  the model calls when the customer asks about the offer. This inherits the confirm-first
  safety and is far more robust than the dead `keyword_match` automation trigger.
- **Sectioning respects Meta's 10-row cap.** Items are grouped by category; a category with
  >10 items is chunked and offered via a category-level list rather than silently truncated
  (the current `items.slice(0, 10)` silently drops the rest — a real bug for a menu).
- **Message content is persisted** so the existing `messages` table + inbox renders it, and
  a `catalog_sessions` table tracks what the customer is browsing so a follow-up "the second
  one" resolves.
- **Prices/currency from `business_settings`,** not hardcoded, matching the UGX-first
  pricing across the product.

## Task List

### Phase 1: Data layer (no customer-visible behaviour)

- [ ] **Task 1: `catalog_items` + `catalog_categories` migration**
- [ ] **Task 2: Catalog type definitions and server-side data access**
- [ ] **Task 3: Business-type catalog config in `business_settings`**

### Checkpoint: Data layer
- [ ] `npm run typecheck` clean
- [ ] Migration applies to staging Supabase
- [ ] Unit tests for the data-access helpers

### Phase 2: Rendering engine

- [ ] **Task 4: Catalog renderer (`catalog-renderer.ts`) with sectioning + truncation**
- [ ] **Task 5: Extend `sendInteractiveMessage` to accept real sections**
- [ ] **Task 6: `catalog_sessions` for multi-turn browsing**

### Checkpoint: Rendering
- [ ] Renderer unit tests cover: 3 items, 10 items, 47 items, empty catalog, image-only items
- [ ] Meta length limits asserted in tests (24/72/1024/10)

### Phase 3: AI integration

- [ ] **Task 7: `send_catalog` Gemini tool declaration**
- [ ] **Task 8: Wire the tool into `ai-worker.ts` prompt + delivery**
- [ ] **Task 9: Business-type-aware prompt instructions**

### Checkpoint: AI integration
- [ ] End-to-end: "what do you sell?" → interactive list arrives
- [ ] Multi-turn: customer picks a category → items list → item detail
- [ ] Credit gate and 24h-window guard behave

### Phase 4: Owner-facing UI

- [ ] **Task 10: Catalog CRUD API routes**
- [ ] **Task 11: Catalog management page + sidebar entry**
- [ ] **Task 12: CSV/quick-add bulk import**

### Checkpoint: UI
- [ ] `npm run lint` no new errors
- [ ] `npm run build` succeeds
- [ ] Manual: upload 12 items, confirm AI offers them

### Phase 5: Ship

- [ ] **Task 13: Landing page copy for the catalog feature**
- [ ] **Task 14: Deploy develop → verify staging → promote**

### Checkpoint: Complete
- [ ] `npm test` passes
- [ ] Verified live on staging

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| `ai_settings.business_id` column was never created, so `business_knowledge` is dead and the KB block never reaches the prompt (`ai-config-cache.ts:43` selects a column that `010_ai_settings.sql` never creates) | **Critical** — blocks any KB-backed catalog description | Fix as Task 0 before Phase 3. This is a pre-existing production bug, not something this feature introduces. |
| Meta rejects interactive message outside the 24h customer service window | Medium | Only send catalogs in reply to an inbound message; fall back to an approved template otherwise. |
| `items.slice(0, 10)` silently truncates a long menu | High for restaurants | Task 4 does explicit sectioning; Task 4 tests assert nothing is dropped. |
| Model hallucinates prices | High | Prices always come from the DB via tool result, never from the model. The prompt forbids stating a price not in the tool response. |
| `send/route.ts:190-196` silently downgrades any non-template message to text and persists a phantom bubble | Medium | Route catalog sends through `meta-send.ts` (`engineSendInteractive`), which already persists correctly — not through the send route. |
| No cron for `/api/whatsapp/queue`, so delayed AI jobs only drain on the next inbound message | Medium | Not blocking v1 (catalog replies are immediate), but note it. |
| Businesses with >500 items | Low | Paginate by category; never inject the full catalog into the prompt — the tool fetches on demand. |

## Open Questions

1. **Business types to ship in v1.** I propose: `restaurant`, `clinic`, `salon`, `retail`,
   `school`, `services`, `other`. Each maps to a catalog presentation (e.g. restaurant and
   retail get image thumbnails + prices; clinic and services get name + description +
   booking CTA). Confirm which matter.
2. **Images?** Product photos make a huge difference for menus, but mean hosting and Meta
   media upload. v1 could be text-only (fast, no storage) with images as a follow-up.
   Your call — this is the biggest scope decision here.
3. **Ordering?** Should a catalog item let the customer place an order inline (cart → send),
   or should it only hand off to a human? Inline ordering is significantly more work.
4. **Commerce Manager bridge later?** If you eventually want native `catalog_message` and
   cart-in-WhatsApp, that's a second phase: push `catalog_items` to Commerce Manager per
   tenant and swap the renderer. The schema here is deliberately shaped to allow that.
// HopeChat service worker.
//
// Why this file exists: Chromium refuses to offer installation unless the
// page is controlled by a service worker with a `fetch` handler. The
// manifest alone is not enough, and `beforeinstallprompt` never fires
// without both. So the handler below is deliberately minimal.
//
// What it does NOT do, on purpose:
//   - No navigation / HTML caching. Every dashboard route is per-user and
//     server-rendered; caching it would serve one tenant's data to the
//     next person on a shared device.
//   - No caching of /api/* or any Supabase traffic. Same reason, and
//     realtime sockets must never be intercepted.
//   - No offline shell. HopeChat is useless without the server — a stale
//     offline copy would be worse than an honest browser error page.
//
// It only revalidates immutable build output (/_next/static/*), which is
// content-hashed and already safe to keep forever, and it makes sure a
// new deploy activates without waiting for every tab to close.

const CACHE_VERSION = "hopechat-static-v1";
const STATIC_PREFIX = "/_next/static/";

self.addEventListener("install", (event) => {
  // Don't hold the install hostage on a precache — there is nothing to
  // precache. Activate as soon as the file lands.
  self.skipWaiting();
  event.waitUntil(Promise.resolve());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Never touch anything but plain GETs — POST/PUT/DELETE to /api/* are the
  // actual product (sending WhatsApp messages, burning credits).
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Cross-origin (Supabase images, OG assets) stays on the network so we
  // never cache someone else's response under our origin.
  if (url.origin !== self.location.origin) return;

  // Anything user-specific is explicitly excluded, including requests
  // that merely *look* static via a cache-busting query string.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/login") ||
    url.pathname.startsWith("/signup") ||
    url.pathname.startsWith("/settings") ||
    url.pathname.startsWith("/admin")
  ) {
    return;
  }

  // Hashed Next.js chunks and public assets: cache-first is safe because a
  // content change produces a new filename. Everything else (documents,
  // icons, sw.js itself) falls through to the browser's normal handling.
  if (!url.pathname.startsWith(STATIC_PREFIX)) return;

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;

      const response = await fetch(request);
      // Opaque or error responses aren't worth storing.
      if (response.ok && response.type === "basic") {
        const cache = await caches.open(CACHE_VERSION);
        cache.put(request, response.clone());
      }
      return response;
    })(),
  );
});
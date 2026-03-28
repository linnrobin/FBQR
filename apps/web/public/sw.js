/**
 * FBQR Merchant POS — Service Worker
 * Scope: /merchant/* and /kitchen/*
 *
 * Strategy:
 * - Static assets (JS, CSS, fonts, images): Cache-first (stale-while-revalidate)
 * - Navigation requests (HTML pages): Network-first with offline fallback
 * - API requests: Network-only (never cache — order data must be real-time)
 *
 * On iOS 16.4+: Web Push requires the app to be installed via "Add to Home Screen".
 * Display an in-app banner prompting this for optimal notification support.
 */

const CACHE_VERSION = "fbqr-merchant-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const OFFLINE_URL = "/offline.html";

const PRECACHE_URLS = [
  "/offline.html",
];

// ── Install ───────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  // Take control immediately
  self.skipWaiting();
});

// ── Activate ──────────────────────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("fbqr-merchant-") && k !== STATIC_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch ─────────────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET and cross-origin
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Never cache API routes — real-time data only
  if (url.pathname.startsWith("/api/")) return;

  // Static assets: cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(js|css|woff2?|png|jpg|jpeg|webp|svg|ico)$/)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // Navigation: network-first, fall back to offline page
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then(
          (offline) => offline ?? new Response("Offline", { status: 503 })
        )
      )
    );
  }
});

// ── Push ──────────────────────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "FBQR", body: event.data.text() };
  }

  const title = payload.title ?? "FBQR";
  const options = {
    body: payload.body ?? "",
    icon: payload.icon ?? "/icons/icon-192x192.png",
    badge: payload.badge ?? "/icons/badge-72x72.png",
    tag: payload.tag,
    data: payload.data ?? {},
    requireInteraction: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click ────────────────────────────────────────────────────────

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data ?? {};
  let targetUrl = "/merchant/dashboard";

  if (data.type === "NEW_ORDER") {
    targetUrl = "/merchant/tables";
  } else if (data.type === "WAITER_CALL") {
    targetUrl = "/merchant/tables";
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus an existing merchant tab if one is open
      const existing = clientList.find((c) => c.url.includes("/merchant/"));
      if (existing) {
        return existing.focus();
      }
      // Otherwise open a new tab
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

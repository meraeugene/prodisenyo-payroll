const STATIC_CACHE = "prodisenyo-static-v2";
const DYNAMIC_CACHE = "prodisenyo-dynamic-v2";
const PRECACHE_URLS = ["/", "/manifest.webmanifest", "/icon.ico"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Next.js build and development chunks are content-addressed and must never
  // be served cache-first. An old chunk can reference modules that no longer
  // exist after a deployment or Turbopack rebuild.
  if (url.pathname.startsWith("/_next/") || url.pathname === "/sw.js") {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("/")),
        ),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(request).then((networkResponse) => {
        const networkClone = networkResponse.clone();
        caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(request, networkClone);
        });
        return networkResponse;
      });
    }),
  );
});

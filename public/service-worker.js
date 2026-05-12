/* global URL, caches, fetch, self */

const APP_CACHE = "saaspro-camiones-shell-v1";
const RUNTIME_CACHE = "saaspro-camiones-runtime-v1";

function getBasePath() {
  return new URL(self.registration.scope).pathname;
}

function toAbsoluteUrl(pathname) {
  return new URL(pathname, self.location.origin).toString();
}

function getShellUrls() {
  const basePath = getBasePath();
  return [toAbsoluteUrl(basePath), toAbsoluteUrl(`${basePath}index.html`), toAbsoluteUrl(`${basePath}manifest.webmanifest`)];
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(getShellUrls())).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => ![APP_CACHE, RUNTIME_CACHE].includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);
  const isSameOrigin = requestUrl.origin === self.location.origin;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cache = await caches.open(APP_CACHE);
        return (
          (await cache.match(toAbsoluteUrl(`${getBasePath()}index.html`))) ||
          cache.match(toAbsoluteUrl(getBasePath()))
        );
      })
    );
    return;
  }

  if (!isSameOrigin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse.ok) {
          return networkResponse;
        }

        const responseClone = networkResponse.clone();
        void caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, responseClone));
        return networkResponse;
      });
    })
  );
});

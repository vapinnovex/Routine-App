const CACHE_NAME = "routine-web-v5";
const APP_SHELL = ["/", "/manifest.json", "/pwa-180.png", "/pwa-192.png", "/pwa-512.png"];
const isAsset = (path) => path.startsWith("/_expo/") || path.startsWith("/assets/") || /^\/pwa-\d+\.png$/.test(path) || path === "/manifest.json";
const cacheable = (response) => response.ok && !response.redirected && !/no-store|private/i.test(response.headers.get("Cache-Control") || "");

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    // Cache the entry bundle on the first visit, before this worker controls the page.
    const shell = await cache.match("/");
    const html = await shell.text();
    const assets = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
      .map((match) => new URL(match[1], self.location.origin))
      .filter((url) => url.origin === self.location.origin && isAsset(url.pathname));
    await cache.addAll([...new Set(assets.map((url) => url.href))]);
    // A new release waits for old tabs to close; never interrupt unsaved work.
  })());
});
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith("routine-web-") && key !== CACHE_NAME) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin ||
      url.pathname.startsWith("/api/") || request.headers.has("Authorization")) return;
  if (request.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (cacheable(response)) await cache.put(request, response.clone());
        return response;
      } catch {
        return await cache.match(request) || await cache.match("/") || Response.error();
      }
    })());
  } else if (isAsset(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (cacheable(response)) await cache.put(request, response.clone());
      return response;
    })());
  }
});

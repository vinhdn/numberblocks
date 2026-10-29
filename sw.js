/* Numberblocks kid-safe PWA service worker.
   Caches only this site's own app shell so Chrome on Android offers a real
   "Install app" (not just a shortcut) and the shell opens offline.
   Video playback still streams from YouTube and needs a connection. */
const CACHE = "numberblocks-pwa-v5";
const SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./polyfills.js",
  "./app.js",
  "./tv.js",
  "./data.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Cross-origin (YouTube, Google Fonts, thumbnails): network only, never cached here.
  if (url.origin !== self.location.origin) return;
  // Navigations: network first so kids never get stuck on a stale page, cache as fallback.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }
  // Same-origin static files: cache first, refresh in the background.
  event.respondWith(
    caches.match(req).then((hit) => {
      const network = fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || network;
    })
  );
});

const CACHE = "my-ai-v7";
const SHELL = ["./", "index.html", "manifest.json", "icon-192.png", "icon-512.png"];
const CACHE_HOSTS = ["esm.run", "cdn.jsdelivr.net"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(SHELL.map((u) => fetch(new Request(u, { cache: "reload" })).then((r) => c.put(u, r))))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const same = url.origin === location.origin;
  if (!same && !CACHE_HOSTS.includes(url.hostname)) return; // model files are cached by WebLLM itself

  // Your own app files: network first (always the newest), cache when offline
  if (same) {
    e.respondWith(
      fetch(req, { cache: "no-cache" })
        .then((res) => {
          if (res && res.status === 200) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }))
    );
    return;
  }
  // Libraries: cache first, so the AI engine loads offline
  e.respondWith(
    caches.match(req).then((hit) =>
      hit || fetch(req).then((res) => {
        if (res && res.status === 200) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      })
    )
  );
});

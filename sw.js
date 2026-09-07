/* Tubig Butuan service worker.
   App shell: cache-first. Live data (data/*.json): network-first with cache fallback,
   so the last good schedule is still readable when the signal drops. */
const VERSION = 'tubig-v1';
const SHELL = [
  './', 'index.html', 'css/style.css', 'js/app.js', 'js/map.js',
  'data/barangays.json', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION).then((cache) =>
      Promise.all(SHELL.map((u) => cache.add(u).catch(() => null)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isLiveData = sameOrigin && /\/data\/(?!barangays\.json)[^/]+\.json$/.test(url.pathname);
  const isFontOrCdn = /fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com/.test(url.host);

  if (isLiveData) {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }
  if (sameOrigin || isFontOrCdn) {
    // stale-while-revalidate: answer from cache at once, refresh the cache in the
    // background so the next visit picks up new code without a version bump.
    e.respondWith(
      caches.match(req).then((hit) => {
        const refresh = fetch(req).then((res) => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        }).catch(() => (req.mode === 'navigate' ? caches.match('index.html') : undefined));
        return hit || refresh;
      })
    );
  }
});

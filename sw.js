/* Tubig Butuan service worker.
   Policy: anything that changes often (the page, its CSS and JS, the live data
   files) is fetched from the network first with a short timeout, falling back to
   the cache only when offline or the network is too slow. Heavy static assets
   (barangay boundaries, landmarks, icons, fonts, map library) are cache-first.
   Bump VERSION when the caching policy itself changes; old caches are deleted. */
const VERSION = 'tubig-v2';
const NETWORK_TIMEOUT_MS = 3500;
const STATIC = ['data/barangays.json', 'data/landmarks.json', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'manifest.webmanifest'];
const PRECACHE = ['./', 'index.html', 'css/style.css', 'js/app.js', 'js/map.js'].concat(STATIC);

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION).then((cache) => Promise.all(PRECACHE.map((u) => cache.add(u).catch(() => null)))).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

function putCopy(req, res) {
  if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
  return res;
}
function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then((v) => { clearTimeout(t); resolve(v); }, (err) => { clearTimeout(t); reject(err); });
  });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFontOrCdn = /fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com/.test(url.host);
  if (!sameOrigin && !isFontOrCdn) return;
  const path = url.pathname.replace(/^.*\//, '');
  const isStatic = isFontOrCdn || STATIC.some((s) => url.pathname.endsWith('/' + s) || url.pathname.endsWith(s));

  if (isStatic) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => putCopy(req, res))));
    return;
  }
  // network-first for the page, its code and the live data
  e.respondWith(
    withTimeout(fetch(req), NETWORK_TIMEOUT_MS)
      .then((res) => putCopy(req, res))
      .catch(() => caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match('index.html') : undefined)))
  );
});

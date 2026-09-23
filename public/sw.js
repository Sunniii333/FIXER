// Offline shell: the app page and its static assets are cached so capture works with no connection.
// Mission data never passes through here — it lives in IndexedDB.
const CACHE = 'fixer-v1'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.add('/')))
  self.skipWaiting()
})
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (e) => {
  const req = e.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return
  if (req.mode === 'navigate') {
    // network first so deploys land; the cached shell when offline
    e.respondWith(
      fetch(req)
        .then((res) => (caches.open(CACHE).then((c) => c.put('/', res.clone())), res))
        .catch(() => caches.match('/')),
    )
    return
  }
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()))
          return res
        }),
    ),
  )
})

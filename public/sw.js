// Offline shell: the app page and its static assets are cached so capture works with no connection.
// Mission data never passes through here — it lives in IndexedDB.
const CACHE = 'fixer-v1'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/manifest.webmanifest', '/icon.svg', '/icon-192.png'])))
  self.skipWaiting()
})
self.addEventListener('activate', (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  ),
)

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

// Push: the payload is only { kind, count? } — the text is generic on purpose, since it shows on the lock screen.
const texts = {
  fiveMinute: () => ['ครบ 5 นาทีแล้ว', 'ลงมือก้าวแรกหรือยัง? กดเพื่อเปิดภารกิจ'],
  stuck: () => ['ก้าวนี้นานเกินไปแล้ว', 'ถึงเวลาถามคนที่ช่วยได้ ก่อนจะติดจริง'],
  review: () => ['ได้เวลาทบทวน', 'ดูภารกิจที่ยังเปิดอยู่ของวันนี้'],
  deadline: (n) => ['ภารกิจครบกำหนดวันนี้', `มีภารกิจครบกำหนดวันนี้ ${n ?? 1} งาน`],
  backup: () => ['สำรองข้อมูลหน่อย', 'ไม่ได้ส่งออกไฟล์สำรองมาเกิน 7 วันแล้ว'],
}
const targets = { fiveMinute: '/', stuck: '/#/stuck', review: '/#/review', deadline: '/', backup: '/#/settings' }

self.addEventListener('push', (e) => {
  let data = {}
  try {
    data = e.data ? e.data.json() : {}
  } catch {}
  const [title, body] = (texts[data.kind] ?? (() => ['The Fixer', 'มีการแจ้งเตือน']))(data.count)
  e.waitUntil(
    self.registration.showNotification(title, { body, tag: data.kind, icon: '/icon.svg', data: { url: targets[data.kind] ?? '/' } }),
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = new URL(e.notification.data?.url ?? '/', location.origin).href
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const win = wins[0]
      return win ? win.navigate(url).then((w) => (w ?? win).focus()) : self.clients.openWindow(url)
    }),
  )
})

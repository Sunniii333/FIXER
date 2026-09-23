'use client'
import { useEffect, useState } from 'react'
import { App } from '../src/ui/App'
import { realPorts } from '../src/ui/real-ports'

export default function Page() {
  const [ports] = useState(() => (typeof window === 'undefined' ? undefined : realPorts()))
  useEffect(() => {
    if (!navigator.serviceWorker) return
    navigator.serviceWorker.register('/sw.js')
    // The first visit loads its scripts before the service worker controls the page: cache them too,
    // so the very next open works offline.
    navigator.serviceWorker.ready.then(async () => {
      const urls = performance
        .getEntriesByType('resource')
        .map((e) => e.name)
        .filter((u) => u.startsWith(`${location.origin}/_next/static/`))
      const cache = await caches.open('fixer-v1') // same name as in sw.js
      await Promise.all(urls.map(async (u) => (await cache.match(u)) || cache.add(u)))
    })
  }, [])
  return ports ? <App ports={ports} /> : null
}

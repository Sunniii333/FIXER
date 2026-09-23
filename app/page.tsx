'use client'
import { useEffect, useState } from 'react'
import { App } from '../src/ui/App'
import { realPorts } from '../src/ui/real-ports'

export default function Page() {
  const [ports] = useState(() => (typeof window === 'undefined' ? undefined : realPorts()))
  useEffect(() => {
    navigator.serviceWorker?.register('/sw.js')
  }, [])
  return ports ? <App ports={ports} /> : null
}

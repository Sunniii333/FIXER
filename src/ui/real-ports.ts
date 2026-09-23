// Real browser adapters. Thin by design; checked by hand, not by automated tests.
import type { Data, Storage } from '../core/fixer'
import type { Ports, ReminderSync, Share, SyncEntry } from './App'

function idbStorage(): Storage {
  const db = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open('fixer', 1)
    req.onupgradeneeded = () => req.result.createObjectStore('kv')
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  const tx = async <T,>(mode: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest<T>) => {
    const store = (await db).transaction('kv', mode).objectStore('kv')
    return new Promise<T>((resolve, reject) => {
      const req = op(store)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  // ponytail: whole state saved as one record; split per Mission if data grows past a few MB
  return {
    load: () => tx<Data | undefined>('readonly', (s) => s.get('data')),
    save: async (data) => void (await tx('readwrite', (s) => s.put(data, 'data'))),
  }
}

const share: Share = {
  async share(text) {
    if (navigator.share) {
      try {
        await navigator.share({ text })
        return 'shared'
      } catch (e) {
        if ((e as Error).name === 'AbortError') return 'shared' // the owner closed the sheet
      }
    }
    await navigator.clipboard.writeText(text)
    return 'copied'
  },
}

function reminderSync(): ReminderSync {
  let pending: SyncEntry[] | undefined
  const post = async (entries: SyncEntry[]) => {
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!key || !('PushManager' in window) || Notification.permission !== 'granted') return
    const reg = await navigator.serviceWorker.ready
    const subscription =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }))
    const res = await fetch('/api/reminders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ subscription: subscription.toJSON(), entries }),
    })
    if (!res.ok) throw new Error(`sync failed: ${res.status}`)
  }
  // offline: keep only the latest schedule and send it when the connection returns
  addEventListener('online', () => pending && reminders.sync(pending))
  const reminders: ReminderSync = {
    async sync(entries) {
      pending = entries
      await post(entries)
      if (pending === entries) pending = undefined
    },
  }
  return reminders
}

export function realPorts(): Ports {
  return { clock: Date, storage: idbStorage(), share, reminders: reminderSync() }
}

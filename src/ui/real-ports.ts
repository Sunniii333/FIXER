// Real browser adapters. Thin by design; checked by hand, not by automated tests.
import type { Data, Storage } from '../core/fixer'
import type { Ports, ReminderSync, Share, SyncEntry } from './App'
import type { Permission, Platform } from './Install'

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

type InstallPromptEvent = Event & { prompt(): Promise<void> }

function platform(): Platform {
  let deferred: InstallPromptEvent | undefined
  addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // we show our own invite at the right moments
    deferred = e as InstallPromptEvent
  })
  const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
  const flag = (f: string) => `fixer.invite.${f}`
  return {
    ios: /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
    standalone: matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true,
    permission: (): Permission => (supported ? Notification.permission : 'unsupported'),
    requestPermission: async (): Promise<Permission> => (supported ? Notification.requestPermission() : 'unsupported'),
    canPrompt: () => !!deferred,
    prompt: async () => {
      await deferred?.prompt()
      deferred = undefined
    },
    seen: (f) => {
      try {
        return localStorage.getItem(flag(f)) === '1'
      } catch {
        return false
      }
    },
    markSeen: (f) => {
      try {
        localStorage.setItem(flag(f), '1')
      } catch {}
    },
  }
}

export function realPorts(): Ports {
  return { clock: Date, storage: idbStorage(), share, reminders: reminderSync(), platform: platform() }
}

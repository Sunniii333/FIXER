// Real browser adapters. Thin by design; checked by hand, not by automated tests.
import type { Data, Storage } from '../core/fixer'
import type { Ports } from './App'

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

export function realPorts(): Ports {
  return { clock: Date, storage: idbStorage() }
}

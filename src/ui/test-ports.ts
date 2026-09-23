import { fakeClock, memoryStorage } from '../core/fakes'
import type { Ports, SyncEntry } from './App'

export const T0 = new Date(2026, 8, 1, 10, 0).getTime()

export function fakePorts(start = T0) {
  const shared: string[] = []
  const synced: SyncEntry[][] = []
  return {
    clock: fakeClock(start),
    storage: memoryStorage(),
    share: { share: async (text: string) => (shared.push(text), 'shared' as const) },
    reminders: { sync: async (entries: SyncEntry[]) => void synced.push(entries) },
    shared,
    synced,
  } satisfies Ports & Record<string, unknown>
}

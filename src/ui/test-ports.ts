import { fakeClock, memoryStorage } from '../core/fakes'
import type { Ports, SyncEntry } from './App'
import type { InviteFlag, Permission, Platform } from './Install'

export const T0 = new Date(2026, 8, 1, 10, 0).getTime()

/** Defaults to an installed app with permission granted, so notices and invites stay out of the way. */
export function fakePlatform(over: Partial<Pick<Platform, 'ios' | 'standalone'>> & { permission?: Permission; canPrompt?: boolean } = {}) {
  let permission: Permission = over.permission ?? 'granted'
  const seen = new Set<InviteFlag>()
  const calls: string[] = []
  return {
    ios: over.ios ?? false,
    standalone: over.standalone ?? true,
    permission: () => permission,
    requestPermission: async () => {
      calls.push('requestPermission')
      if (permission === 'default') permission = 'granted'
      return permission
    },
    canPrompt: () => over.canPrompt ?? false,
    prompt: async () => void calls.push('prompt'),
    seen: (f: InviteFlag) => seen.has(f),
    markSeen: (f: InviteFlag) => void seen.add(f),
    calls,
  } satisfies Platform & Record<string, unknown>
}

export function fakePorts(start = T0, platform = fakePlatform()) {
  const shared: string[] = []
  const synced: SyncEntry[][] = []
  return {
    clock: fakeClock(start),
    storage: memoryStorage(),
    share: { share: async (text: string) => (shared.push(text), 'shared' as const) },
    platform,
    reminders: { sync: async (entries: SyncEntry[]) => void synced.push(entries) },
    shared,
    synced,
  } satisfies Ports & Record<string, unknown>
}

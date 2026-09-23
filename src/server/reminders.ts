// The reminder backend's logic. It only ever sees a push subscription and generic
// entries { dueAt, kind, count? } — never Mission content. Everything else is stripped at the door.
import { reminderKinds, type ReminderKind } from '../core/fixer'

export type Entry = { dueAt: number; kind: ReminderKind; count?: number }
export type Subscription = { endpoint: string; keys: { p256dh: string; auth: string } }
export type Rec = { id: string; subscription: Subscription; entries: Entry[] }

export type Store = {
  all(): Promise<Rec[]>
  get(id: string): Promise<Rec | undefined>
  put(rec: Rec): Promise<void>
  remove(id: string): Promise<void>
}

/** 'gone' when the push service says the subscription no longer exists. */
export type PushSender = { send(subscription: Subscription, payload: { kind: ReminderKind; count?: number }): Promise<'ok' | 'gone'> }

/** A tick later than this after dueAt drops the entry as "already passed" rather than sending it stale. */
export const GRACE_MS = 15 * 60_000
const MAX_ENTRIES = 1000

export function dueReminders(now: number, entries: Entry[]) {
  const send: Entry[] = []
  const keep: Entry[] = []
  const skip: Entry[] = []
  for (const e of entries) (e.dueAt > now ? keep : now - e.dueAt > GRACE_MS ? skip : send).push(e)
  return { send, keep, skip }
}

const isStr = (x: unknown): x is string => typeof x === 'string' && x.length > 0 && x.length < 2048

/** Trust boundary: rebuilds the body from the generic fields only, or returns undefined. */
function parseSync(body: unknown): { subscription: Subscription; entries: Entry[] } | undefined {
  const b = body as { subscription?: Subscription; entries?: unknown[] } | null
  const s = b?.subscription
  if (!s || !isStr(s.endpoint) || !s.endpoint.startsWith('https://') || !isStr(s.keys?.p256dh) || !isStr(s.keys?.auth))
    return undefined
  if (!Array.isArray(b.entries) || b.entries.length > MAX_ENTRIES) return undefined
  const entries: Entry[] = []
  for (const raw of b.entries) {
    const e = raw as Partial<Entry>
    if (!Number.isFinite(e.dueAt) || !reminderKinds.includes(e.kind!)) return undefined
    if (e.count !== undefined && !Number.isInteger(e.count)) return undefined
    entries.push({ dueAt: e.dueAt!, kind: e.kind!, ...(e.count !== undefined && { count: e.count }) })
  }
  return { subscription: { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } }, entries }
}

async function subscriptionId(endpoint: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint))
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Reconciles the stored schedule with what the client posted. The client's list only holds
 * future reminders, so entries already due stay until the tick sends or skips them.
 */
export async function syncSchedule(body: unknown, store: Store, now: number) {
  const parsed = parseSync(body)
  if (!parsed) return false
  const id = await subscriptionId(parsed.subscription.endpoint)
  const due = ((await store.get(id))?.entries ?? []).filter((e) => e.dueAt <= now)
  const key = (e: Entry) => `${e.kind}@${e.dueAt}`
  const future = parsed.entries.filter((e) => !due.some((d) => key(d) === key(e)))
  await store.put({ id, subscription: parsed.subscription, entries: [...due, ...future] })
  return true
}

/** One periodic tick: send what is due, once, and retire it. Idempotent for the same `now`. */
export async function tick(now: number, store: Store, sender: PushSender) {
  let sent = 0
  let skipped = 0
  for (const rec of await store.all()) {
    const { send, keep, skip } = dueReminders(now, rec.entries)
    if (send.length === 0 && skip.length === 0) continue
    // retire first: a crash mid-send loses a reminder rather than repeating it
    await store.put({ ...rec, entries: keep })
    skipped += skip.length
    for (const e of send) {
      const result = await sender.send(rec.subscription, { kind: e.kind, ...(e.count !== undefined && { count: e.count }) })
      if (result === 'gone') {
        await store.remove(rec.id)
        break
      }
      sent++
    }
  }
  return { sent, skipped }
}

export function memoryStore(): Store {
  const recs = new Map<string, Rec>()
  return {
    all: async () => [...recs.values()].map((r) => structuredClone(r)),
    get: async (id) => structuredClone(recs.get(id)),
    put: async (rec) => void recs.set(rec.id, structuredClone(rec)),
    remove: async (id) => void recs.delete(id),
  }
}

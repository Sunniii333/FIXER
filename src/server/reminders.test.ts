import { describe, expect, it } from 'vitest'
import { dueReminders, GRACE_MS, memoryStore, syncSchedule, tick, type Entry, type PushSender } from './reminders'

const T = Date.UTC(2026, 8, 1, 3, 0)
const MIN = 60_000
const sub = (n = 1) => ({ endpoint: `https://push.example/${n}`, keys: { p256dh: 'key', auth: 'auth' } })

function fakeSender() {
  const sent: { endpoint: string; payload: unknown }[] = []
  const gone = new Set<string>()
  const sender: PushSender = {
    async send(subscription, payload) {
      sent.push({ endpoint: subscription.endpoint, payload })
      return gone.has(subscription.endpoint) ? 'gone' : 'ok'
    },
  }
  return { sender, sent, gone }
}

describe('dueReminders', () => {
  it('sends what is due now, keeps what is not yet due, and explicitly skips what is long past', () => {
    const entries: Entry[] = [
      { dueAt: T - GRACE_MS - 1, kind: 'review' },
      { dueAt: T - MIN, kind: 'fiveMinute' },
      { dueAt: T, kind: 'deadline', count: 2 },
      { dueAt: T + 1, kind: 'stuck' },
    ]
    expect(dueReminders(T, entries)).toEqual({
      send: [entries[1], entries[2]],
      keep: [entries[3]],
      skip: [entries[0]],
    })
  })
})

describe('tick', () => {
  it('fires each due entry exactly once, and only generic fields reach the Push-sender', async () => {
    const store = memoryStore()
    const { sender, sent } = fakeSender()
    await syncSchedule(
      {
        subscription: sub(),
        entries: [
          { dueAt: T + 5 * MIN, kind: 'fiveMinute', instruction: 'ความลับบริษัท' },
          { dueAt: T + 60 * MIN, kind: 'deadline', count: 3, missionId: 'm1' },
        ],
      },
      store,
      T,
    )

    await tick(T + 4 * MIN, store, sender)
    expect(sent).toEqual([])
    await tick(T + 5 * MIN, store, sender)
    await tick(T + 6 * MIN, store, sender)
    await tick(T + 61 * MIN, store, sender)
    expect(sent.map((s) => s.payload)).toEqual([{ kind: 'fiveMinute' }, { kind: 'deadline', count: 3 }])
    expect(JSON.stringify(await store.all())).not.toMatch(/ความลับ|m1|instruction|missionId/)
  })

  it('counts entries the tick found long past as skipped instead of losing them silently', async () => {
    const store = memoryStore()
    const { sender, sent } = fakeSender()
    await syncSchedule({ subscription: sub(), entries: [{ dueAt: T, kind: 'review' }] }, store, T - MIN)
    expect(await tick(T + GRACE_MS + MIN, store, sender)).toEqual({ sent: 0, skipped: 1 })
    expect(sent).toEqual([])
    expect(await tick(T + GRACE_MS + 2 * MIN, store, sender)).toEqual({ sent: 0, skipped: 0 })
  })

  it('forgets a subscription the push service says is gone', async () => {
    const store = memoryStore()
    const { sender, gone } = fakeSender()
    gone.add(sub().endpoint)
    await syncSchedule({ subscription: sub(), entries: [{ dueAt: T, kind: 'backup' }] }, store, T - MIN)
    await tick(T, store, sender)
    expect(await store.all()).toEqual([])
  })
})

describe('syncSchedule', () => {
  it('replaces the future schedule but keeps entries already due, which only the tick may retire', async () => {
    const store = memoryStore()
    const { sender, sent } = fakeSender()
    await syncSchedule({ subscription: sub(), entries: [{ dueAt: T, kind: 'fiveMinute' }, { dueAt: T + MIN, kind: 'stuck' }] }, store, T - MIN)
    // the client re-syncs just after the alert fell due, before the tick ran
    await syncSchedule({ subscription: sub(), entries: [] }, store, T + 1000)
    await tick(T + 2000, store, sender)
    expect(sent.map((s) => s.payload)).toEqual([{ kind: 'fiveMinute' }])
    await tick(T + 2 * MIN, store, sender)
    expect(sent).toHaveLength(1)
  })

  it('rejects anything that is not a subscription plus generic entries', async () => {
    const store = memoryStore()
    for (const bad of [
      null,
      { subscription: { endpoint: 'http://insecure' , keys: { p256dh: 'a', auth: 'b' } }, entries: [] },
      { subscription: sub(), entries: [{ dueAt: 'soon', kind: 'fiveMinute' }] },
      { subscription: sub(), entries: [{ dueAt: T, kind: 'somethingElse' }] },
      { subscription: sub(), entries: Array.from({ length: 1001 }, () => ({ dueAt: T, kind: 'review' })) },
    ])
      expect(await syncSchedule(bad, store, T)).toBe(false)
    expect(await store.all()).toEqual([])
  })
})

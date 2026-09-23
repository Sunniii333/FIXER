// Real adapters for the reminder backend. Thin; checked by hand, not by automated tests.
import { Redis } from '@upstash/redis'
import webpush from 'web-push'
import type { PushSender, Rec, Store } from './reminders'

const KEY = 'fixer:reminders' // one hash: subscriptionId → { subscription, entries }

export function redisStore(): Store {
  const redis = Redis.fromEnv()
  return {
    all: async () => Object.values((await redis.hgetall<Record<string, Rec>>(KEY)) ?? {}),
    get: async (id) => (await redis.hget<Rec>(KEY, id)) ?? undefined,
    put: async (rec) => void (await redis.hset(KEY, { [rec.id]: rec })),
    remove: async (id) => void (await redis.hdel(KEY, id)),
  }
}

export function webPushSender(): PushSender {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:owner@example.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )
  return {
    async send(subscription, payload) {
      try {
        await webpush.sendNotification(subscription, JSON.stringify(payload), { TTL: 3600, urgency: 'high' })
        return 'ok'
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) return 'gone'
        throw e
      }
    },
  }
}

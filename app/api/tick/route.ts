// Periodic tick, called about once a minute by an external scheduler (see ADR-0003).
// Idempotent and secret-protected: callers must send `Authorization: Bearer $CRON_SECRET`.
import { redisStore, webPushSender } from '../../../src/server/adapters'
import { tick } from '../../../src/server/reminders'

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return new Response(null, { status: 401 })
  return Response.json(await tick(Date.now(), redisStore(), webPushSender()))
}

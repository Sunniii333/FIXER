// Periodic tick, called about once a minute by an external scheduler (see ADR-0003).
// Idempotent and secret-protected: callers must send `Authorization: Bearer $CRON_SECRET`.
import { redisStore, webPushSender } from '../../../src/server/adapters'
import { tick } from '../../../src/server/reminders'

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return new Response(null, { status: 401 })
  const result = await tick(Date.now(), redisStore(), webPushSender())
  console.log('tick', result) // counts only, so the scheduler can be seen working in the logs
  return Response.json(result)
}

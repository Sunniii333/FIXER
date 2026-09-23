// Periodic tick (Vercel Cron or an external scheduler). Idempotent and secret-protected:
// callers must send `Authorization: Bearer $CRON_SECRET` (Vercel Cron does this itself).
import { redisStore, webPushSender } from '../../../src/server/adapters'
import { tick } from '../../../src/server/reminders'

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return new Response(null, { status: 401 })
  return Response.json(await tick(Date.now(), redisStore(), webPushSender()))
}

// Receives the derived reminder schedule: a push subscription plus { dueAt, kind, count? } entries.
// Never logs or stores the body as sent — syncSchedule rebuilds it from the generic fields only.
import { redisStore } from '../../../src/server/adapters'
import { syncSchedule } from '../../../src/server/reminders'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const ok = await syncSchedule(body, redisStore(), Date.now())
  return new Response(null, { status: ok ? 204 : 400 })
}

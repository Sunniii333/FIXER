# 13 — Reminder tracer: five-minute alert end to end

**What to build:** With the app closed, the owner gets a push notification when a Mission's five minutes are up and no First step has been marked. This is the first reminder path end to end:
- the core's `pendingReminders()` returns the five-minute alert
- the ReminderSync adapter registers a push subscription and posts the derived schedule whenever it changes
- a route handler reconciles the stored schedule in Upstash Redis
- a periodic tick uses the pure `dueReminders(now, entries)` to send generic Web Push notifications
- a service worker shows them

The backend only ever sees `{ subscriptionId, dueAt, kind, count? }`, never Mission content.

**Blocked by:** 02 — Five-minute clock and First-step tap

**Status:** ready-for-agent

- [ ] `pendingReminders()` returns a five-minute alert at `createdAt` + 5 min for each Mission without a First step, and drops it once the step is done
- [ ] The client re-syncs when a Mission is created, its First step is done, or it is closed, dropped or deleted
- [ ] The sync payload and stored entries contain only `subscriptionId`, `dueAt`, `kind`, `count?`
- [ ] `dueReminders` fires due entries exactly once, doesn't fire future entries, and handles past-due entries by the explicit "skipped if already passed" rule rather than losing them silently
- [ ] Notification text is generic (no Instruction or Mission name)
- [ ] Seam-2 tests drive `dueReminders` with a fake Clock, an in-memory store and a fake Push-sender, and assert only generic fields reach it
- [ ] **Open decision — tick cadence:** Vercel Hobby cron runs at most once a day, but this alert needs roughly one tick a minute. Build the tick as an idempotent, secret-protected route, and confirm with the owner whether it's driven by Vercel Pro cron or an external scheduler before deploying

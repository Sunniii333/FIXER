# ADR-0003: Web app on Vercel with a content-blind reminder backend

Status: accepted — supersedes ADR-0001 (Android only) and ADR-0002 (Capacitor shell, no server).

## Context

The Fixer must remind the owner while the app is closed (five-minute alert, stuck, Review,
Deadline and backup nudges). A plain web app can't schedule local alarms; the Android shell that
did this is dropped in favour of an installable web app that also works on iOS and desktop.

## Decision

- Next.js app (PWA: manifest + service worker) deployed to Vercel. Every screen that touches
  Mission content is a client component; Mission data lives only in IndexedDB.
- A small serverless slice delivers reminders: `POST /api/reminders` stores a push subscription
  and generic `{ dueAt, kind, count? }` entries in Upstash Redis; `GET /api/tick` (secret-protected,
  idempotent) sends due entries through Web Push. The body is rebuilt from those fields only, so
  Mission content can't be stored even if a client sent it.
- The client derives the schedule (`pendingReminders()`) and re-syncs it on every change.
  Entries already due stay on the server until the tick sends them, so a re-sync can't race a
  reminder away. A tick that finds an entry more than 15 minutes late skips it.

## Consequences

- Reminder delivery needs a network connection at the moment it fires; everything else is offline.
- On iOS, Web Push only works once installed to the home screen; the app says so.
- The tick needs roughly one call a minute: Vercel Pro cron or an external scheduler
  (Hobby cron runs at most daily). Still to be chosen by the owner.

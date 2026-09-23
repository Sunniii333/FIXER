# 14 — Other reminder kinds and re-sync triggers

**What to build:** The rest of the reminders, using the path from 13:
- **stuck reminder**: at the current Step's `startedAt` + `stuckAfter`
- **daily Review nudge**: at `reviewTime`, only when Missions are open
- **Deadline nudge**: once on the morning of the due date at `deadlineTime`, with a count and generic text; counts Drafts and active Missions with a real `deadlineAt`; excludes done, Dropped and text-only-deadline Missions
- **backup nudge**: when `lastExportAt` is more than seven days old and at least one Mission exists

The schedule re-syncs on every relevant change. Push notifications stay content-blind: the stuck notification is generic, and tapping it opens the Mission page, which shows the Helpers (or offers the People list when there are none).

**Blocked by:** 03 — The Step chain; 04 — Full receive walkthrough and later edits; 11 — Export and import; 12 — Settings, dark mode and the Rules screen; 13 — Reminder tracer

**Status:** ready-for-agent

- [ ] `pendingReminders()` returns each kind with the rules above; any reminder whose time has already passed when scheduled is skipped
- [ ] A text-only deadline never produces a Deadline nudge
- [ ] Re-sync happens on: Mission create, a Step change, deadline set/cleared, a change to `reviewTime`/`deadlineTime`/`stuckAfter`, export completed, close/drop/delete
- [ ] Turning reminders off in Settings clears the synced schedule
- [ ] Tapping a stuck notification opens that Mission, showing its Helpers, or offering the People list when it has none
- [ ] Core tests cover `pendingReminders()` for every kind; UI tests use a fake ReminderSync to check the re-sync triggers

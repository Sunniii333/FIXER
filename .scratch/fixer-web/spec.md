Status: ready-for-agent

# The Fixer — Web v1 Spec

Supersedes the Android/Capacitor direction recorded in `spec1.md`'s Implementation Decisions (ADR-0001, ADR-0002). This spec is the new v1 target: a web app deployed to Vercel, not a native Android shell.

## Problem Statement

I am regularly given broad work orders by other people. I get a vague **Instruction**, don't know where to start, and put it off. I think in circles without acting, so when my **Assigner** asks, all I can say is "I haven't done it yet." I work alone until I'm stuck instead of asking a **Helper** early. When the plan breaks, I'm caught off guard because I never thought about how it could break.

I need a tool that turns each Instruction into a **Mission** with a concrete **First step** taken within five minutes, and that keeps evidence that I acted rather than only thought. It must work on my phone with one hand, with no tracking, and keep every Mission's contents on my own device, because Mission details can be confidential company information. Capturing, acting on and reviewing Missions must work with no internet connection; only the actual delivery of a reminder while the app is closed needs a network connection at the moment it fires — the same as any phone's push notifications, and unavoidable for that one thing.

## Solution

A web app, installable to my phone's home screen, used by one person, deployed on Vercel. I receive a Mission in seconds; the **Five-minute clock** starts the moment I tap. I fill in only the Instruction and my First step to go active, and I'm walked through the rest (Done definition and deadline, Helpers, **Risk** and **Plan B**) at my own pace. When I do the First step, one tap records the time. The app tells me when five minutes are up even when it's closed, reminds me when a **Step** has stalled so I ask a Helper before I'm truly stuck, and lets me **Replan** in one tap when the plan breaks, changing the path but not the goal. At any point it writes a ready-to-send **Status sentence** for my Assigner, shareable through the device's native share sheet. At the end it shows evidence: how often I did an **On-time start**, what I closed, what is still open, and where my plans tend to break.

All Mission content — the Instruction, Steps, Done definition, Risk, Plan B, People — stays on my device in the browser. A tiny backend exists only to fire reminders while the app is closed; it only ever sees a push subscription and generic timing/kind data ("a reminder is due"), never Mission content.

## User Stories

### Receiving a Mission

1. As the owner, I want to record an Instruction within seconds of receiving it, so that I don't have to wait until I'm free to write it down.
2. As the owner, I want the Five-minute clock to start at the moment I tap to receive a Mission, so that the measure reflects real time from receipt to action.
3. As the owner, I want a Mission to exist as a Draft the moment I start receiving it, so that nothing is lost if I'm interrupted mid-conversation with my Assigner.
4. As the owner, I want the Five-minute clock to keep running on a Draft, so that I can't game the measure by leaving things half-entered.
5. As the owner, I want to be asked one question at a time, so that a vague Instruction turns into a clear target without me holding it all in my head.
6. As the owner, I want to be asked what "finished" looks like, when it's due, and what is off-limits, so that I end up with a clear **Done definition**.
7. As the owner, I want to be required to state a First step that is a real action before a Mission goes active, so that a Mission is never just a thought going round in my head.
8. As the owner, I want a quick mode where only the Instruction and First step are needed to go active, so that I can capture in about 20 seconds.
9. As the owner, I want to go back and fill in the Done definition, deadline, Helpers, Risk and Plan B later, so that quick capture doesn't cost me a clear picture.
10. As the owner, I want active Missions with no Done definition flagged as "เป้ายังไม่ชัด", so that I'm nudged to sharpen them instead of blocked from starting.
11. As the owner, I want to note who gave me the Instruction as the Assigner, chosen from my list of People, so that later Status sentences are addressed to the right person.
12. As the owner, I want to choose Helpers from my list of People when creating a Mission, so that I don't retype names.
13. As the owner, I want the same Person to be an Assigner on one Mission and a Helper on another, so that my list reflects how people actually work with me.
14. As the owner, I want to write the deadline as free text or pick a date, so that "before Thursday's meeting" is as easy to record as a date.
15. As the owner, I want a date picker beside the free-text deadline with an optional "date it?" prompt, so that I get overdue tracking when a real date exists.
16. As the owner, I want a Mission with a text-only deadline to show "ไม่มีวันกำหนด", so that I know it can't become overdue.
17. As the owner, I want tapping "save" twice quickly to never create a duplicate Mission, so that a jumpy thumb doesn't clutter my list.
18. As the owner, I want to name the way a Mission could break (Risk) and my Plan B when I receive it, so that I've thought about failure before it happens.
19. As the owner, I want to leave Risk and Plan B empty in quick mode, so that capture stays fast.

### Getting started

20. As the owner, I want a countdown from five minutes visible on the Mission, so that I feel pressure to stand up and start.
21. As the owner, I want the countdown computed from when the Mission was received, not from a running in-memory counter, so that it's right when I reopen the app.
22. As the owner, I want a notification when five minutes are up, even when the app is closed, so that I don't forget a Mission I just received.
23. As the owner, I want to mark "ทำก้าวแรกแล้ว" in one tap, so that the moment I really started is recorded.
24. As the owner, I want the recorded time to be the time of my tap and not something I can edit, so that it stays honest evidence.
25. As the owner, I want doing the First step after five minutes to still be recorded truthfully but not counted as an On-time start, so that the record is accurate and not flattered.
26. As the owner, I want to name the next Step right after finishing each Step, so that the work continues without rethinking from scratch.
27. As the owner, I want a Mission to always have exactly one current Step while it's active, so that I always know what to do next.
28. As the owner, I want to edit a Step's text after doing it while the original stays in the history and the recorded times don't change, so that correcting a typo can't rewrite my record.
29. As the owner, I want to close a Mission that never had a First step marked, so that I can still finish real work I forgot to mark, while it is counted honestly as a miss.

### Asking for help

30. As the owner, I want a People list showing what each person can help with (information, permission, skill), so that I know who to go to when I'm stuck.
31. As the owner, I want to add, edit and remove People, so that the list stays true.
32. As the owner, I want a reminder when the current Step has stayed current too long, so that I ask for help before I'm stuck, not after.
33. As the owner, I want the "stuck" limit to be one setting for the whole app, with a default of 30 minutes, so that I don't have to decide it per Step.
34. As the owner, I want the reminder and the Mission page to show that Mission's Helpers and what each can help with, so that I can act on it immediately.
35. As the owner, I want to be offered the People list from the reminder when a Mission has no Helpers, so that I can pick someone right then.

### When the plan breaks

36. As the owner, I want a "แผนพัง" button on a Mission, so that I can change course the instant a plan fails.
37. As the owner, I want it to show my Plan B and ask what the new Step is, so that I move on without stopping to reinvent the plan.
38. As the owner, I want a Replan to mark the failed Step as abandoned and add a new current Step, so that the record shows what was tried.
39. As the owner, I want a Replan to leave the Done definition untouched, so that I change the path but not the goal.
40. As the owner, I want to still edit the Done definition through the normal edit form, with every change recorded in the history, so that legitimate corrections are possible without hiding that the goal moved.
41. As the owner, I want to pick a reason for each Replan from a short fixed list (waiting on someone, missing access or info, scope changed, underestimated, other) plus optional free text, so that reasons can be grouped later.
42. As the owner, I want to see how many times a Mission was replanned and why, so that I learn which kinds of work tend to break and where.

### Reporting and closing

43. As the owner, I want the app to write a Status sentence for a Mission in fixed Thai wording, so that I can answer my Assigner immediately.
44. As the owner, I want Status sentences that differ by state (not started, in progress, replanned, done), so that the sentence fits what's true.
45. As the owner, I want the Status sentence built from the Instruction, the current Step and the latest Replan reason, so that it says something specific.
46. As the owner, I want to share the Status sentence through my device's native share sheet in one tap, and to copy it to my clipboard when a native share sheet isn't available, so that I can respond straight away on any browser.
47. As the owner, I want to close a Mission together with a done-sentence for my Assigner, so that the person who gave me the work knows it's finished.
48. As the owner, I want to reopen a closed Mission, so that I can pick up work that turned out not to be finished.
49. As the owner, I want reopening to keep the original clock and On-time start result and to require a new current Step, so that reopening can't rewrite the record and a Mission is never active without a next action.
50. As the owner, I want the previous close time kept in the history when I reopen, so that the record of the earlier close isn't lost.
51. As the owner, I want to drop a Mission that was cancelled or became moot, with a short reason, so that I can end it without pretending it was done or erasing it.
52. As the owner, I want a Dropped Mission to stay in the history and keep its On-time start result while staying out of the completion counts, so that my stats are honest either way.
53. As the owner, I want to delete a Mission created by mistake, so that errors don't linger.
54. As the owner, I want a few seconds to undo a delete, so that an accidental tap doesn't destroy a Mission.

### The Mission list and stats

55. As the owner, I want the home screen to sort Missions as overdue, then not started, then in progress, then done, so that the most urgent work is always at the top.
56. As the owner, I want Drafts sorted with the not-started Missions, so that they don't hide.
57. As the owner, I want a Mission past its `deadlineAt` and not closed to show as "เลยกำหนด" at the top, so that I can't miss it.
58. As the owner, I want a compact stats strip with my On-time start rate, the count closed this month, and the count open with overdue highlighted, so that I have evidence of whether I'm changing.
59. As the owner, I want the On-time start rate to count Missions closed without a First step, Dropped Missions and Missions whose five minutes passed without a First step as misses, so that the number can't be flattered.
60. As the owner, I want Missions still within their first five minutes left out of the rate until the outcome is known, so that the rate isn't distorted by pending cases.
61. As the owner, I want each month's rate grouped by the month the Mission was received, so that I can see whether it improves month to month.
62. As the owner, I want reopening never to change a Mission's contribution to the rate, so that history stays stable.

### Review

63. As the owner, I want a Review screen always available, so that I can look back whenever I want.
64. As the owner, I want a nudge each evening at a time I set (default 20:00), only when I have open Missions, so that I'm reminded when it matters and not otherwise.
65. As the owner, I want Review to list open Missions, overdue Missions and Drafts older than 24 hours as "ร่างค้าง", so that I see what is being neglected.
66. As the owner, I want Review to list Missions that were replanned often and to group Replans by reason, so that I see my recurring failure patterns.
67. As the owner, I want Review to show how many Missions had their Done definition changed, so that goal drift is visible.
68. As the owner, I want a wider date range on the same Review screen for a weekly pattern view, so that I don't need a second feature for it.
69. As the owner, I want Review to count Missions with a text-only deadline that were excluded from overdue tracking, so that the gap in the numbers is visible.
70. As the owner, I want a per-month count of Missions that missed their deadline, so that I can check my goal of fewer late Missions.

### The rules

71. As the owner, I want to read the nine rules of The Fixer inside the app, so that I have a reminder close to hand.

### Data, backup and privacy

72. As the owner, I want all my Mission data stored only in my browser, so that confidential Mission information never leaves my device.
73. As the owner, I want no analytics or third-party tracking, so that no one else learns what I'm working on.
74. As the owner, I want the reminder backend to only ever handle a push subscription and generic timing/kind data, never Instruction text, Step text, or any other Mission content, so that a reminder can reach me without my confidential work ever sitting on a server.
75. As the owner, I want to export all my data to a JSON file, so that I can back it up or move to a new browser or device.
76. As the owner, I want a reminder to back up when my last export is more than seven days old and I have at least one Mission, so that I don't lose everything by accident.
77. As the owner, I want importing to replace all my data only after I confirm a comparison of what is in the file against what is on the device, so that I can't overwrite by accident.
78. As the owner, I want an invalid or version-mismatched import file to be rejected with a clear message and nothing changed, so that a bad file can't destroy my data.

### Installing and receiving reminders

79. As the owner, I want to install the app to my phone's home screen, so that it opens like a normal app and can receive push notifications.
80. As the owner, I want to be invited to install the app the first time I open it and the first time I'd rely on a reminder, so that I don't miss out on reminders by not knowing installation is needed.
81. As the owner on iPhone, I want to be shown plain manual steps ("Share → Add to Home Screen") when the browser can't prompt me automatically, so that I can still get reminders even though iOS doesn't support an automatic install prompt.
82. As the owner, I want to be told plainly if I have refused notification permission, or if reminders can't reach me because the app isn't installed (iOS), so that I know I'm not being reminded, while the rest of the app keeps working.
83. As the owner, I want to be able to turn reminders on, grant permission, or install the app later, so that an earlier refusal or skip isn't permanent.
84. As the owner, I want a Mission with a text-only deadline to have no deadline reminder, so that I'm not promised a reminder the app can't schedule.

### Performance and ergonomics

85. As the owner, I want the app ready to type into within one second of opening, so that capture doesn't lose time to loading.
86. As the owner, I want the main actions in the lower half of the screen, so that I can use the app with one hand.
87. As the owner, I want a light theme by default with a dark mode I can switch to, so that the app is comfortable to use at night as well as during the day.
88. As the owner, I want every feature that reads or writes Mission data to work with no internet connection, so that connectivity never gets in the way of capturing or acting on a Mission.
89. As the owner, I want the app in Thai, so that it's in the language I work in.

## Implementation Decisions

**Structure.** Three layers around one core, all deployed as a single Next.js app on Vercel.
- **Fixer core**: a pure, UI-free module that owns every domain rule, unchanged in nature from the original design. It has an injected Clock port and Storage port. It exposes commands and queries, and nothing else touches Mission state.
- **UI**: Next.js (App Router) screens on top of the core (Missions home, Receive, Mission detail, People, Review, Rules, Settings). All screens that read or render Mission content are client components — Mission content is never passed through a server component, a Server Action, or a route handler, since it must never transit the Vercel server.
- **Reminder backend**: a small serverless slice — a route handler for the client to sync its reminder schedule and push subscription, a Vercel Cron job that ticks periodically, and a Web Push adapter. It only ever stores/handles subscription endpoints and generic reminder entries (`dueAt`, `kind`, optional count) — never Instruction/Step text or any other Mission field.

**Ports (boundaries the core depends on).** Clock, Storage, ReminderSync, Share.
- **Storage**: real adapter is IndexedDB in the browser. Faked with in-memory storage in tests.
- **ReminderSync**: replaces the Android shell's direct alarm scheduling. The core still exposes `pendingReminders()` exactly as before (kind, `at`, and any non-confidential display data like a count). The real adapter posts that derived list to the reminder backend (registering a push subscription on first use) whenever it changes; the backend reconciles its stored schedule against what was posted. Faked in tests by recording what would have been synced, with no network call.
- **Share**: real adapter uses the Web Share API (`navigator.share`) where available, falling back to copying the Status sentence to the clipboard. Faked in tests by recording what would have been shared/copied.

**Platform and delivery (supersedes ADR-0001, ADR-0002).**
- Web app, installable as a PWA (manifest + service worker), deployed to Vercel. No native Android/iOS shell, no Capacitor, no App Store/Play Store release.
- Works on Android Chrome, iOS Safari and desktop browsers. Mobile-first single-column layout; desktop is a centered, non-stretched fallback of the same layout, not a separate design.
- Android/Chrome supports the standard install prompt (`beforeinstallprompt`); iOS Safari does not, so the app detects iOS and shows manual "Share → Add to Home Screen" instructions instead. Web Push on iOS Safari only works once installed to the home screen — this is a hard platform constraint, not a choice.
- The Five-minute clock starts at `createdAt`, the moment the owner taps to receive a Mission, Drafts included — unchanged from the original design.

**Domain model.** Unchanged from the original spec:
- **Mission**: `id`, `instruction`, `doneDefinition?`, `deadlineText?`, `deadlineAt?`, `constraints?`, `assignerId?`, `helperIds`, `risk?`, `planB?`, `status` (`draft | active | done | dropped`), `dropReason?`, `createdAt`, `doneAt?`, `droppedAt?`, `steps`, `replans`, `history`.
- **Step**: `id`, `text`, `startedAt` (when it became current), `doneAt?`, `outcome` (`done | abandoned`).
- **Replan**: `at`, `reason` (one of a fixed list), `note?`, `abandonedStepId`, `newStepId`.
- **Person**: `id`, `name`, `canHelpWith`, `note?`. Roles (Assigner, Helper) belong to the Mission, not the Person.
- **Settings**: `reminderEnabled`, `reviewTime` (default 20:00), `deadlineTime` (default 09:00), `stuckAfter` (default 30 minutes), `lastExportAt`, `theme` (`light | dark`, default `light`, stored client-side only, not synced to the backend).
- **History** records edits as (`at`, `field`, `oldValue`). Recorded times are never rewritten. Reopen and Done-definition edits go here.

**Lifecycle rules.** Unchanged from the original design:
- Receiving creates a Draft at once. Going active needs an Instruction and a First step; everything else is optional. Receiving is idempotent per capture, so a double tap makes one Mission.
- While active, a Mission has exactly one current Step. Completing a Step requires naming the next one, except when closing.
- Replan abandons the current Step, adds a new current Step and records a reason from a fixed list: waiting on someone, missing access or info, scope changed, underestimated, other. It never touches the Done definition. The new Step is never called a First step.
- Reopen returns a done Mission to active, keeps the original clock and On-time start result, keeps the earlier `doneAt` in the history, and requires a new current Step.
- A Mission ends as `done`, or as `dropped` with a reason. Delete is for mistakes, with a few seconds of undo.
- The "ทำก้าวแรกแล้ว" time is the time of the tap and can't be edited or back-dated.

**Derived, never stored.** Unchanged:
- List order: overdue, then not started (Drafts included), then in progress, then done. Dropped Missions appear in the history.
- On-time start: the First step's `doneAt` is no more than five minutes after `createdAt`.
- Overdue: `deadlineAt` is in the past and the Mission isn't closed. Text-only deadlines can't be overdue.
- Stuck: the current Step has been current longer than `stuckAfter`.

**Stats.** Unchanged: On-time start rate, home tiles, and Missed deadline count, computed exactly as in the original design.

**Status sentence.** Four fixed Thai templates by state (not started, in progress, replanned, done). Slots come from the Instruction, current Step and latest Replan reason. The polite particle "ครับ" is hardcoded. The done template addresses the Assigner. Sharing goes through the Share port (Web Share API, clipboard fallback).

**Reminders and the reminder backend.**
- The core still exposes `pendingReminders()`, the derived list of what should fire and when — five-minute alert, stuck reminder, daily Review nudge, backup nudge, and Deadline nudge, all with the same rules as the original spec (see "Further Notes" below for the Deadline nudge's specific rules, unchanged).
- The client posts this list, plus a push subscription, to the reminder backend via ReminderSync whenever it changes (a Mission is created, a Step goes stuck-eligible, a deadline is set/cleared, `reviewTime`/`deadlineTime`/`stuckAfter` changes, an export completes, a Mission closes/drops/deletes). The backend stores only `{ subscriptionId, dueAt, kind, count? }` entries, keyed to that browser's subscription — no accounts, no login; the "identity" is just the installed browser's push subscription.
- A Vercel Cron job ticks periodically, and a pure `dueReminders(now, entries)` function (Seam 2) decides which entries are due; a Web Push adapter sends a generic notification per due entry (kind + count only, e.g. "มีภารกิจครบกำหนดวันนี้ N งาน" — no Instruction, no Mission name), mirroring the privacy rule the original spec already applied to the Deadline nudge.
- If notification permission is refused, or the app isn't installed (relevant on iOS specifically), the app keeps working and shows a "no reminders" notice, with a way to grant permission or install later.

**Review.** Unchanged: one always-available screen with a date range, showing open/overdue/stale Drafts, "เป้ายังไม่ชัด" Missions, often-replanned Missions grouped by reason, Done-definition-changed count, and the text-only-deadline exclusion count.

**Export and import.** Unchanged: export writes all Missions, People and Settings to a versioned JSON file; import validates first, shows a comparison, and replaces everything only on confirmation; invalid/version-mismatched files are rejected with nothing changed.

**Design system.** Neo-brutalist visual language: thick black borders, raw/offset shadows, an orange-and-brown "craftsman's desk" palette (warm cream/tan base, wood/paper-adjacent surfaces). Light theme is the default; dark mode is a full second token set (dark brown/charcoal base, same orange accents) toggled via Settings and persisted client-side only (not synced to the backend, since it carries no Mission content but also has no reason to leave the device).

**Performance and privacy.**
- Ready to type within one second of opening.
- Quick capture achievable in about 20 seconds.
- All Mission-data reads/writes work with no internet connection; only reminder delivery at the moment it fires needs a network connection, inherent to how push notifications work on any platform.
- No network calls carrying Mission content, no analytics, no third-party tracking. The only network traffic tied to a Mission is the generic reminder schedule sync (timing/kind only).

**Terminology.** Use the project glossary throughout the code, UI copy mapping and tests: Mission, Assigner, Helper, Person, Step, First step, Draft, Five-minute clock, On-time start, Done definition, Replan, Plan B, Risk, Dropped, Instruction, Stuck, Status sentence.

## Testing Decisions

**What makes a good test.** It exercises external behaviour only: what a caller of the core, of the reminder backend's tick logic, or a person using the screens, could observe. It never reaches into internal state or depends on how something is built. Time is always driven by a fake clock, never by real waiting.

**Three seams.**

1. **Fixer core seam (primary).** Drive the commands and queries through the core's interface, with a fake Clock and in-memory Storage. Unchanged in scope from the original design — covers On-time start and the rate's denominator, Draft rules, Step history and Replan/reopen behaviour, derived list order/overdue/Stuck, `pendingReminders()` for every kind, Status sentences per state, export/import (including rejection of invalid/version-mismatched files), and delete-with-undo.

2. **Reminder delivery seam (new).** Drive `dueReminders(now, entries)` directly with a fake Clock, an in-memory subscription/entry store, and a fake Push-sender port standing in for Web Push. Cover: entries due now fire exactly once, entries not yet due don't fire, entries with a past due time are still delivered (or explicitly dropped, matching the "skipped if already passed" rule from the original Deadline nudge design) rather than silently lost, and that only generic fields (`kind`, `count`) ever reach the fake Push-sender — never Mission content, since none is passed into this seam in the first place.

3. **UI seam (secondary).** Drive the real screens in a phone-sized browser viewport, with the same fake Clock and in-memory Storage as seam 1, plus a fake ReminderSync port (records what would've been synced, no network) and a fake Share port (records what would've been shared/copied). Cover the main flows end to end: quick capture, first-step tap, Replan, close with a done-sentence, drop, reopen, Review, People, export/import, the light/dark toggle, the install-prompt flow (including the iOS manual-instructions variant), and the "no reminders" notice when permission is refused or the app isn't installed.

**Not covered by automated tests.** The real IndexedDB adapter, the real Web Push send path (browser vendor push services), and the real install/PWA behaviour per browser are thin and are checked by hand, once per release, across at least one Android Chrome and one iOS Safari device.

**Prior art.** None; this spec establishes the pattern for the web pivot, carrying forward the two-seam pattern from the original Android-era spec and adding the one new seam the reminder backend requires.

## Out of Scope

- Multiple users, accounts, or sharing Missions with a team.
- Syncing Mission content across devices through a server — export/import to a JSON file remains the only way to move data between browsers/devices.
- Server-side rendering or server-side handling of Mission content in any form (route handler, Server Action, log, etc.) — Mission content is client-only, always.
- Calendar, email and Slack integrations.
- AI breaking an Instruction into Steps (planned for v2).
- Voice recording and transcription.
- Native App Store / Play Store release — the app is an installable web app (PWA), not a store listing.
- Personal (non-work) tasks and categories.
- Per-Step stuck limits.
- Drafting messages to Helpers or contact integration.
- Merging on import.
- Language switching.

## Further Notes

- This spec supersedes the "Platform and delivery" decisions in `spec1.md` (ADR-0001, ADR-0002: Android-only, Capacitor shell, IndexedDB via native wrapper, no server). A new ADR should be recorded documenting the move to a web app with a minimal, content-blind reminder backend, and `spec1.md`'s Implementation Decisions section should be updated or retired in favor of this spec.
- **The Deadline nudge**, carried over unchanged from the original design: fires once, on the morning of the due date, at `deadlineTime` (default 09:00, changeable in Settings); one notification per due date with a count and generic text (no Instruction shown); counts Drafts and active Missions with a real `deadlineAt`, excludes done/Dropped/text-only-deadline Missions; if the nudge time for a date has already passed when the deadline is set or the setting changes, that nudge is skipped, as with every other reminder; changing/clearing a deadline, closing/dropping the Mission, or changing `deadlineTime` moves or removes it, because the schedule synced to the backend is derived and re-synced on every relevant change.
- The exact behavior of `beforeinstallprompt` timing and eligibility criteria on Android Chrome, and the current iOS Safari Web Push support matrix, are worth a quick verification pass at build time since browser vendor behavior here shifts between releases.

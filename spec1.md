Status: ready-for-agent

# The Fixer v1 — Spec

## Problem Statement

I am regularly given broad work orders by other people. I get a vague **Instruction**, don't know where to start, and put it off. I think in circles without acting, so when my **Assigner** asks, all I can say is "I haven't done it yet." I work alone until I'm stuck instead of asking a **Helper** early. When the plan breaks, I'm caught off guard because I never thought about how it could break.

I need a tool that turns each Instruction into a **Mission** with a concrete **First step** taken within five minutes, and that keeps evidence that I acted rather than only thought. It must work on my Android phone with one hand, offline, with no tracking, because Mission details can be confidential company information.

## Solution

An Android app, used by one person. I receive a Mission in seconds; the **Five-minute clock** starts the moment I tap. I fill in only the Instruction and my First step to go active, and I'm walked through the rest (Done definition and deadline, Helpers, **Risk** and **Plan B**) at my own pace. When I do the First step, one tap records the time. The app tells me when five minutes are up even when it's closed, reminds me when a **Step** has stalled so I ask a Helper before I'm truly stuck, and lets me **Replan** in one tap when the plan breaks, changing the path but not the goal. At any point it writes a ready-to-send **Status sentence** for my Assigner. At the end it shows evidence: how often I did an **On-time start**, what I closed, what is still open, and where my plans tend to break. All data stays on the device.

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
46. As the owner, I want to share the Status sentence to a chat app in one tap, so that I can respond straight away.
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

72. As the owner, I want all my data stored only on my phone, so that confidential Mission information never leaves it.
73. As the owner, I want no analytics or third-party tracking, so that no one else learns what I'm working on.
74. As the owner, I want to export all my data to a JSON file, so that I can back it up or move to a new phone.
75. As the owner, I want a reminder to back up when my last export is more than seven days old and I have at least one Mission, so that I don't lose everything by accident.
76. As the owner, I want importing to replace all my data only after I confirm a comparison of what is in the file against what is on the phone, so that I can't overwrite by accident.
77. As the owner, I want an invalid or version-mismatched import file to be rejected with a clear message and nothing changed, so that a bad file can't destroy my data.

### Reminders and permissions

78. As the owner, I want to be told plainly if I have refused notifications or exact alarms, so that I know I'm not being reminded, while the rest of the app keeps working.
79. As the owner, I want to be able to turn reminders on later, so that a refusal isn't permanent.
80. As the owner, I want a Mission with a text-only deadline to have no deadline reminder, so that I'm not promised a reminder the app can't schedule.

### Performance and ergonomics

81. As the owner, I want the app ready to type into within one second of opening, so that capture doesn't lose time to loading.
82. As the owner, I want the main actions in the lower half of the screen, so that I can use the app with one hand.
83. As the owner, I want a dark mode, so that the app is comfortable to use at night.
84. As the owner, I want every feature to work with no internet connection, so that connectivity never gets in the way of starting.
85. As the owner, I want the app in Thai, so that it's in the language I work in.

## Implementation Decisions

**Structure.** Two layers around one core.
- **Fixer core**: a pure, UI-free module that owns every domain rule. It has an injected clock and an injected storage port. It exposes commands and queries, and nothing else touches Mission state.
- **UI**: the screens on top of the core (Missions home, Receive, Mission detail, People, Review, Rules).
- **Android shell**: a thin wrapper that turns the core's reminder schedule into real Android alarms and provides the share sheet.

**Ports (boundaries the core depends on).** Clock, Storage, Reminder scheduler, Share. Real adapters are IndexedDB for Storage and the Android shell for Reminder scheduler and Share. The same ports are faked in tests.

**Platform and delivery (see ADR-0001, ADR-0002).**
- Android only, single device, Thai only, with dark mode. No iOS handling.
- The web app is wrapped in a self-installed Android shell (Capacitor, sideloaded as an APK), so alarms are local and no server exists.
- The Five-minute clock starts at `createdAt`, the moment the owner taps to receive a Mission, Drafts included.

**Domain model.**
- **Mission**: `id`, `instruction`, `doneDefinition?`, `deadlineText?`, `deadlineAt?`, `constraints?`, `assignerId?`, `helperIds`, `risk?`, `planB?`, `status` (`draft | active | done | dropped`), `dropReason?`, `createdAt`, `doneAt?`, `droppedAt?`, `steps`, `replans`, `history`.
- **Step**: `id`, `text`, `startedAt` (when it became current), `doneAt?`, `outcome` (`done | abandoned`).
- **Replan**: `at`, `reason` (one of a fixed list), `note?`, `abandonedStepId`, `newStepId`.
- **Person**: `id`, `name`, `canHelpWith`, `note?`. Roles (Assigner, Helper) belong to the Mission, not the Person.
- **Settings**: `reminderEnabled`, `reviewTime` (default 20:00), `deadlineTime` (default 09:00), `stuckAfter` (default 30 minutes), `lastExportAt`.
- Removed from the earlier draft: `order`, `firstStep`, `nextStep`, `firstStepAt`. The First step is the first Step, and `firstStepAt` is the first Step's `doneAt`.
- **History** records edits as (`at`, `field`, `oldValue`). Recorded times are never rewritten. Reopen and Done-definition edits go here.

**Lifecycle rules.**
- Receiving creates a Draft at once. Going active needs an Instruction and a First step; everything else is optional. Receiving is idempotent per capture, so a double tap makes one Mission.
- While active, a Mission has exactly one current Step. Completing a Step requires naming the next one, except when closing.
- Replan abandons the current Step, adds a new current Step and records a reason from a fixed list: waiting on someone, missing access or info, scope changed, underestimated, other. It never touches the Done definition. The new Step is never called a First step.
- Reopen returns a done Mission to active, keeps the original clock and On-time start result, keeps the earlier `doneAt` in the history, and requires a new current Step.
- A Mission ends as `done`, or as `dropped` with a reason. Delete is for mistakes, with a few seconds of undo.
- The "ทำก้าวแรกแล้ว" time is the time of the tap and can't be edited or back-dated.

**Derived, never stored.**
- List order: overdue, then not started (Drafts included), then in progress, then done. Dropped Missions appear in the history.
- On-time start: the First step's `doneAt` is no more than five minutes after `createdAt`.
- Overdue: `deadlineAt` is in the past and the Mission isn't closed. Text-only deadlines can't be overdue.
- Stuck: the current Step has been current longer than `stuckAfter`.

**Stats.**
- **On-time start rate**: numerator is On-time starts. The denominator is every Mission whose clock has resolved: the First step was done (in time or late), or five minutes passed without one. That includes Dropped Missions and Missions closed without a First step, both counted as misses. Missions still inside their first five minutes are left out until resolved. Deleted Missions are never counted. The rate is bucketed by the month received, and reopening never changes it.
- **Home tiles**: On-time start rate, closed this month, and open (Draft plus active) with the overdue count highlighted.
- **Missed deadline count** per month received: Missions closed after `deadlineAt` or still open past it. Text-only deadlines are excluded, and the excluded count is shown.

**Status sentence.** Four fixed Thai templates by state (not started, in progress, replanned, done). Slots come from the Instruction, current Step and latest Replan reason. The polite particle "ครับ" is hardcoded. The done template addresses the Assigner. Sharing goes through the Share port.

**Reminders.** The core exposes `pendingReminders()`, the derived list of what should fire and when, and the shell reconciles real alarms against it. Kinds:
- five-minute alert at `createdAt` plus five minutes, while no First step is done
- stuck reminder at the current Step's `startedAt` plus `stuckAfter`, showing the Mission's Helpers
- daily Review nudge at `reviewTime`, only when Missions are open
- backup nudge when `lastExportAt` is more than seven days ago and at least one Mission exists
- Deadline nudge, one per local date on which an open Mission (Draft or active) has a real `deadlineAt`, at that date plus `deadlineTime`; one notification per date with a count ("มีภารกิจครบกำหนดวันนี้ N งาน"), no Mission named; dropped from the list once its time has passed

If notification or exact-alarm permission is refused, the app keeps working and shows a "no reminders" notice.

**Review.** One always-available screen with a date range. It shows open, overdue and stale Drafts (older than 24 hours, "ร่างค้าง"); Missions flagged "เป้ายังไม่ชัด"; often-replanned Missions and Replans grouped by reason; count of Missions whose Done definition was changed; count of text-only deadlines excluded from overdue tracking.

**Export and import.** Export writes all Missions, People and Settings to a versioned JSON file. Import validates the file first, shows counts from the file against what is on the phone, and on confirmation replaces everything. An invalid or version-mismatched file leaves existing data untouched.

**Performance and privacy.**
- Ready to type within one second of opening.
- Quick capture achievable in about 20 seconds.
- Fully offline.
- No network calls for app data, no analytics and no third-party tracking.

**Terminology.** Use the project glossary throughout the code, UI copy mapping and tests: Mission, Assigner, Helper, Person, Step, First step, Draft, Five-minute clock, On-time start, Done definition, Replan, Plan B, Risk, Dropped, Instruction, Stuck, Status sentence.

## Testing Decisions

**What makes a good test.** It exercises external behaviour only: what a caller of the core, or a person using the screens, could observe. It never reaches into internal state or depends on how something is built. Time is always driven by the fake clock, never by real waiting.

**Two seams.**

1. **Fixer core seam (primary).** Drive the commands and queries through the core's interface, with a fake clock and in-memory storage. Cover:
   - On-time start and the rate's denominator: late, missed, closed without a First step, Dropped, still-pending and deleted Missions.
   - Draft rules: minimum to go active, clock running on a Draft, double-tap idempotence, stale Draft detection.
   - Step history, editing without rewriting times, Replan abandoning the current Step without touching the Done definition, and reopen keeping the original result.
   - Derived list order, overdue and Stuck, including text-only deadlines.
   - `pendingReminders()` for every kind, before and after state changes.
   - Status sentences per state.
   - Export/import, including rejection of invalid or version-mismatched files with nothing changed.
   - Delete with undo.

2. **UI seam (secondary).** Drive the real screens in a phone-sized viewport, with the same fake clock, fake in-memory storage, and fake Reminder scheduler and Share ports. Cover the main flows end to end: quick capture, first-step tap, Replan, close with a done-sentence, drop, reopen, Review, People, and export/import. Also check:
   - Layout and reachability of the main actions for one-handed use.
   - Dark mode.
   - The "no reminders" notice when permission is refused.

**Not covered by automated tests.** The IndexedDB adapter and the Android shell (real alarms, real permission prompts, real share sheet) are thin and are checked by hand on the device, once per release.

**Prior art.** None; the repository is empty. These two seams will set the pattern.

## Out of Scope

- Multiple users, sharing Missions with a team.
- Syncing across devices through a server.
- Calendar, email and Slack integrations.
- AI breaking an Instruction into Steps (planned for v2).
- Voice recording and transcription.
- iOS, and any App Store or Play Store release.
- Personal (non-work) tasks and categories.
- Per-Step stuck limits.
- Drafting messages to Helpers or contact integration.
- Merging on import.
- Language switching.

## Further Notes

- Decided in the design session and recorded in `CONTEXT.md` (glossary) and `docs/adr/` (ADR-0001, ADR-0002).
- **Decided: the deadline reminder (the Deadline nudge).** A picked date is stored as the end of that local day, and there is no time-of-day field, so "N hours before" would land near 23:00 on the due day and help no one. Instead:
  - It fires once, on the morning of the due date, at a time the owner can change in Settings (`deadlineTime`, default 09:00). No per-Mission variation, no day-before nudge, and no time-of-day field on the deadline.
  - One notification per due date, with a count, and generic text: no Instruction is shown, because Mission details can be confidential and notifications show on the lock screen (the same reason as the other reminders). Tapping it opens the Mission list, which already puts overdue Missions first.
  - Counted: Drafts and active Missions with a real `deadlineAt`. Not counted: done, Dropped, text-only deadlines.
  - If the nudge time for the date has already passed when the deadline is set or the Setting changed, that nudge is skipped, as with every other reminder. Changing or clearing a deadline, closing or dropping the Mission, or changing `deadlineTime` moves or removes it, because the list is derived.
  - Same permission rules and "no reminders" notice as the other reminders. Built in ticket 23.
- Android needs runtime permission for notifications and exact alarms; the exact flow for the target Android version is unverified and should be checked at build time.
- The first-run "install to home screen" guidance from the original edge cases no longer applies, because the app is a self-installed Android shell.

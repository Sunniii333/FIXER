# 07 — Close, drop, reopen, and delete with undo

**What to build:** The owner can close a Mission as done, including one that never had a First step marked (counted honestly as a miss). They can drop a cancelled or moot Mission with a short reason; it stays in the history. They can reopen a done Mission: it returns to active with the original clock and On-time start result kept, the earlier `doneAt` kept in History, and a new current Step required. A Mission created by mistake can be deleted, with a few seconds to undo.

**Blocked by:** 03 — The Step chain

**Status:** ready-for-agent

- [ ] Closing sets `doneAt`; closing without a First step is allowed
- [ ] Dropping requires a `dropReason` and sets `droppedAt`; Dropped Missions show in the history, not the active list
- [ ] Reopening requires a new current Step, writes the previous `doneAt` to History, and doesn't change the On-time start result
- [ ] Delete can be undone for a few seconds; after that the Mission is gone and never counted
- [ ] Core tests cover every transition, including delete-with-undo, with a fake Clock
- [ ] UI tests cover close, drop and reopen

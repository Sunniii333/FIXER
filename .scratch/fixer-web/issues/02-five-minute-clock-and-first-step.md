# 02 — Five-minute clock and First-step tap

**What to build:** On the Mission page, the owner sees a countdown from five minutes derived from `createdAt`, so it is correct after reopening the app. One tap on "ทำก้าวแรกแล้ว" records the tap time as the First step's `doneAt`. On-time start is derived: `doneAt` no more than five minutes after `createdAt`. A late tap is recorded truthfully but is not an On-time start.

**Blocked by:** 01 — Walking skeleton

**Status:** ready-for-agent

- [ ] The countdown is computed from `createdAt` and the Clock, not from an in-memory counter
- [ ] The countdown also runs on Drafts
- [ ] The recorded time is the tap time and can't be edited or back-dated
- [ ] Core tests cover on-time, late, and still-pending (inside five minutes) cases with a fake Clock
- [ ] A UI test covers the first-step tap

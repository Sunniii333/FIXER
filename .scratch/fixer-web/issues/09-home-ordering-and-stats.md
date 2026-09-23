# 09 — Home ordering and stats strip

**What to build:** The home screen sorts Missions as overdue ("เลยกำหนด"), then not started (Drafts included), then in progress, then done. A compact stats strip shows the On-time start rate, the number closed this month, and the number open (Drafts plus active) with overdue highlighted. Everything is derived, never stored.

**Blocked by:** 04 — Full receive walkthrough and later edits; 07 — Close, drop, reopen, and delete with undo

**Status:** ready-for-agent

- [ ] Overdue means `deadlineAt` is past and the Mission isn't closed; text-only deadlines are never overdue
- [ ] Sort order is overdue → not started (including Drafts) → in progress → done
- [ ] Rate denominator: every Mission whose clock has resolved, including Dropped Missions and Missions closed without a First step (both misses); Missions still inside five minutes are excluded; deleted Missions are never counted
- [ ] The rate is bucketed by the month received, and reopening never changes it
- [ ] Core tests cover the rate's denominator cases and the ordering, with a fake Clock

# 10 — Review screen

**What to build:** An always-available Review screen with a date range; a wider range gives the weekly pattern view. It lists open Missions, overdue Missions, Drafts older than 24 hours ("ร่างค้าง") and "เป้ายังไม่ชัด" Missions. It shows often-replanned Missions and Replans grouped by reason, how many Missions had their Done definition changed, how many were left out of overdue tracking because of text-only deadlines, and the Missed deadline count per month received.

**Blocked by:** 06 — Replan; 09 — Home ordering and stats strip

**Status:** ready-for-agent

- [ ] Changing the date range filters every section
- [ ] A Draft older than 24 hours shows as "ร่างค้าง"
- [ ] Replans are grouped by their fixed-list reason
- [ ] Missed deadline: closed after `deadlineAt`, or still open past it; text-only deadlines are excluded and the excluded count is shown
- [ ] The count of Missions whose Done definition changed is read from History
- [ ] Core tests cover the Review queries; a UI test covers the screen

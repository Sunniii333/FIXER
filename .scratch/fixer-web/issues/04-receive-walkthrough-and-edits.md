# 04 — Full receive walkthrough and later edits

**What to build:** After quick capture, or instead of it, the owner is asked one question at a time: what "finished" looks like (Done definition), when it's due, what is off-limits (constraints), the Risk, and the Plan B. The deadline is free text with a date picker beside it and an optional "date it?" prompt. Everything can be filled in or changed later through the edit form.

**Blocked by:** 01 — Walking skeleton

**Status:** ready-for-agent

- [ ] The walkthrough asks one question per screen, and every question is skippable
- [ ] The deadline accepts free text (`deadlineText`), a date (`deadlineAt`), or both
- [ ] Active Missions with no Done definition show "เป้ายังไม่ชัด"
- [ ] Missions with a text-only deadline show "ไม่มีวันกำหนด"
- [ ] Every Done-definition edit is recorded in History
- [ ] Risk and Plan B can stay empty
- [ ] Core tests cover History on Done-definition edits; a UI test covers the walkthrough

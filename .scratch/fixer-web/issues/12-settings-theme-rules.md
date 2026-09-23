# 12 — Settings, dark mode and the Rules screen

**What to build:** A Settings screen for `stuckAfter` (default 30 min), `reviewTime` (default 20:00), `deadlineTime` (default 09:00) and turning reminders on or off. There's a light/dark theme toggle: light by default, dark as a full second token set (dark brown/charcoal base, same orange accents), stored on the device only and never synced. There's also a Rules screen listing the nine rules of The Fixer.

**Blocked by:** 01 — Walking skeleton

**Status:** ready-for-agent

- [ ] The settings persist offline with the defaults above
- [ ] The theme toggle applies at once, survives a reload, and is never sent to the backend
- [ ] The Rules screen shows nine rules — **use placeholder text for now; the owner will supply the final wording**
- [ ] A UI test covers the light/dark toggle

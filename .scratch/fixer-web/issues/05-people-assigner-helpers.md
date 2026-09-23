# 05 — People, Assigner and Helpers

**What to build:** A People screen where the owner adds, edits and removes People, each with what they can help with (information, permission, skill) and an optional note. When receiving or editing a Mission, the owner picks the Assigner and the Helpers from this list. Roles belong to the Mission, so the same Person can be an Assigner on one Mission and a Helper on another. The Mission page shows its Helpers and what each can help with.

**Blocked by:** 04 — Full receive walkthrough and later edits

**Status:** ready-for-agent

- [ ] People can be added, edited and removed, and persist offline
- [ ] The walkthrough and edit form let the owner pick one Assigner and several Helpers
- [ ] One Person can hold different roles on different Missions
- [ ] The Mission page lists Helpers with `canHelpWith`
- [ ] Removing a Person who is referenced by Missions is handled gracefully (the Mission still renders)
- [ ] A UI test covers the People screen and picking Helpers

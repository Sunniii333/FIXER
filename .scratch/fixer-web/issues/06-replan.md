# 06 — Replan ("แผนพัง")

**What to build:** A "แผนพัง" button on an active Mission shows the Plan B and asks for the new Step and a reason from the fixed list (waiting on someone, missing access or info, scope changed, underestimated, other), plus an optional note. The current Step is marked abandoned and the new Step becomes current. The Done definition is never touched. The Mission shows how many times it was replanned and why.

**Blocked by:** 03 — The Step chain

**Status:** ready-for-agent

- [ ] A Replan records `at`, `reason`, `note?`, `abandonedStepId` and `newStepId`
- [ ] The abandoned Step keeps its history with outcome `abandoned`
- [ ] The Done definition is unchanged by a Replan
- [ ] The new Step is never labelled a First step
- [ ] The Mission page shows the Replan count and reasons
- [ ] Core tests cover Replan; a UI test covers the "แผนพัง" flow

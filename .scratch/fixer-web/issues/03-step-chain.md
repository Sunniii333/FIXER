# 03 — The Step chain

**What to build:** After finishing the current Step, the owner names the next Step straight away, so an active Mission always has exactly one current Step. The owner can fix the text of a Step already done: the original text stays in History and recorded times never change.

**Blocked by:** 02 — Five-minute clock and First-step tap

**Status:** ready-for-agent

- [ ] Completing a Step requires naming the next one (closing is the only exception; see 07)
- [ ] A new Step's `startedAt` is when it became current
- [ ] An active Mission always has exactly one current Step
- [ ] Editing a done Step's text writes (`at`, `field`, `oldValue`) to History and leaves `startedAt`/`doneAt` unchanged
- [ ] Core tests cover the one-current-Step rule and Step edit history

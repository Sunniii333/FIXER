# 08 — Status sentence and sharing

**What to build:** On any Mission, the owner can get a ready-to-send Status sentence in fixed Thai wording. There are four templates by state (not started, in progress, replanned, done), filled from the Instruction, the current Step and the latest Replan reason, with "ครับ" hardcoded. The done template addresses the Assigner. One tap shares it through the Share port: the native share sheet where available, otherwise a copy to the clipboard. Closing a Mission offers the done-sentence.

**Blocked by:** 05 — People, Assigner and Helpers; 06 — Replan; 07 — Close, drop, reopen, and delete with undo

**Status:** ready-for-agent

- [ ] The right template is chosen for each of the four states
- [ ] Slots are filled from the Instruction, the current Step and the latest Replan reason
- [ ] The done template names the Assigner, and still reads correctly when there is no Assigner
- [ ] The Share port uses `navigator.share` when present and falls back to the clipboard
- [ ] Core tests cover each template; a UI test using a fake Share port covers share and close-with-done-sentence

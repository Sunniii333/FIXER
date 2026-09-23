# 01 — Walking skeleton: quick capture to home list

**What to build:** The thinnest complete path through the app. The owner taps "receive", which creates a Draft at once and starts the Five-minute clock at `createdAt`. They type an Instruction and a First step, the Mission goes active, and it shows on the Missions home. It survives a reload and works with no connection. This ticket sets up the Next.js app (all Mission screens are client components), the pure Fixer core with its Clock and Storage ports, the IndexedDB Storage adapter, the core test harness (fake Clock plus in-memory Storage), the UI test harness in a phone-sized viewport, the light-theme neo-brutalist design tokens, and Thai UI copy.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] Tapping receive creates a Draft immediately with `createdAt` set from the Clock
- [ ] A Draft goes active only when it has both an Instruction and a First step
- [ ] Saving twice quickly creates exactly one Mission (idempotent per capture)
- [ ] Active Missions and Drafts appear on the home screen and persist across reloads
- [ ] Capture and the home list work offline
- [ ] Mission content never goes through a server component, Server Action or route handler
- [ ] Core tests use a fake Clock and in-memory Storage; one UI test covers quick capture end to end
- [ ] Main actions sit in the lower half of the screen; the desktop view is the same layout centred, not stretched
- [ ] Ready to type within one second of opening

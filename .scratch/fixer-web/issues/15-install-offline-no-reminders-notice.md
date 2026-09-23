# 15 — Install to home screen, offline shell, and "no reminders" notice

**What to build:** The app is an installable PWA whose shell loads with no connection. The owner is invited to install on first open and again the first time they'd rely on a reminder. On Android/Chrome this uses the standard install prompt; on iOS Safari the app shows the manual "Share → Add to Home Screen" steps. If notification permission is refused, or reminders can't arrive because the app isn't installed (iOS), a plain "no reminders" notice says so, with a way to grant permission or install later. The rest of the app keeps working.

**Blocked by:** 13 — Reminder tracer

**Status:** ready-for-agent

- [ ] A manifest and service worker make the app installable, and the app shell loads offline
- [ ] The install invite appears on first open and before the first reliance on a reminder, and can be skipped
- [ ] iOS is detected and shown manual instructions instead of a prompt
- [ ] A "no reminders" notice shows when permission is denied or the app isn't installed on iOS, and it offers a retry path
- [ ] UI tests cover the prompt flow, the iOS variant and the notice
- [ ] Checked by hand once on Android Chrome and once on iOS Safari (verify the current `beforeinstallprompt` behaviour and iOS Web Push support at build time)

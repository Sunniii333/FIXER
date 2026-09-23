# 11 — Export and import

**What to build:** The owner exports all Missions, People and Settings to a versioned JSON file, which updates `lastExportAt`. Importing validates the file first, shows a comparison of what's in the file against what's on the device, and replaces everything only after the owner confirms. Invalid or version-mismatched files are rejected with a clear message and nothing changed. There is no merging.

**Blocked by:** 05 — People, Assigner and Helpers

**Status:** ready-for-agent

- [ ] The export contains Missions, People, Settings and a format version
- [ ] Export sets `lastExportAt`
- [ ] Import shows file-vs-device counts before replacing anything
- [ ] Cancelling the comparison leaves the data untouched
- [ ] Invalid JSON, a wrong shape, or a version mismatch is rejected with nothing changed
- [ ] Core tests cover the round trip and every rejection case; a UI test covers export/import

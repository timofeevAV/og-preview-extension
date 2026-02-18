---
phase: 05-metadata-export
plan: 01
subsystem: infra
tags: [chrome-extension, manifest, permissions, clipboard, downloads, og-fields, typescript]

# Dependency graph
requires:
  - phase: 04-core-platform-previews
    provides: "extension foundation with working popup and OgData type"
provides:
  - "clipboardWrite and downloads Chrome manifest permissions for Phase 5 export features"
  - "ALL_OG_FIELDS registry (18 fields) for MetadataTab raw table, missing-fields, and HTML snippet generation"
affects: [05-02, 05-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ALL_OG_FIELDS separate from KNOWN_OG_FIELDS: full 18-field registry with required flag for Metadata tab; compact 6-field registry for MissingFields component — two registries, two purposes"

key-files:
  created: []
  modified:
    - wxt.config.ts
    - lib/og-display.ts

key-decisions:
  - "ALL_OG_FIELDS uses required: boolean flag; KNOWN_OG_FIELDS has no required flag — different shapes kept intentionally to avoid breaking existing MissingFields.tsx import"
  - "clipboardWrite needed for navigator.clipboard.writeText() in popup; downloads needed for chrome.downloads.download() — both fail silently without the manifest permission"

patterns-established:
  - "Extend lib/og-display.ts with new exports rather than creating new files for display-layer constants"

# Metrics
duration: 2min
completed: 2026-02-18
---

# Phase 5 Plan 01: Metadata Export Foundation Summary

**Chrome manifest extended with clipboardWrite + downloads permissions, and ALL_OG_FIELDS registry (18 og/twitter fields with required flags) added to lib/og-display.ts as typed source of truth for MetadataTab**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-18T13:51:36Z
- **Completed:** 2026-02-18T13:53:13Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `clipboardWrite` and `downloads` to the manifest permissions array in `wxt.config.ts`; `pnpm build` confirmed both appear in `.output/chrome-mv3/manifest.json`
- Appended `ALL_OG_FIELDS` constant to `lib/og-display.ts` with 18 typed entries (6 `required: true`, 12 `required: false`), all keys validated against `keyof OgData`
- `KNOWN_OG_FIELDS` (6-field compact registry used by MissingFields component) left completely untouched

## Task Commits

Each task was committed atomically:

1. **Task 1: Add clipboardWrite and downloads permissions to manifest** - `1339c10` (chore)
2. **Task 2: Add ALL_OG_FIELDS to lib/og-display.ts** - `1806bf2` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `wxt.config.ts` - permissions array updated from 2 to 4 entries; `clipboardWrite` and `downloads` added
- `lib/og-display.ts` - `ALL_OG_FIELDS` export appended after existing `KNOWN_OG_FIELDS`; 31 lines added

## Decisions Made

- `ALL_OG_FIELDS` uses a `required: boolean` flag field; `KNOWN_OG_FIELDS` has no such field — the different shapes are intentional to avoid a breaking shape mismatch in `MissingFields.tsx` which destructures only `{ key, label, description }`
- Both new permissions (`clipboardWrite`, `downloads`) fail silently without the manifest entry, so they must be declared before any export UI is built in Plan 02

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02 (`MetadataTab` UI) can now import `ALL_OG_FIELDS` with full type safety
- Clipboard and download APIs will work in the popup once the UI calls them
- `KNOWN_OG_FIELDS` + `MissingFields.tsx` in CompactCard view remain unaffected

## Self-Check: PASSED

- `wxt.config.ts` — FOUND
- `lib/og-display.ts` — FOUND
- `.planning/phases/05-metadata-export/05-01-SUMMARY.md` — FOUND
- Commit `1339c10` (Task 1) — FOUND
- Commit `1806bf2` (Task 2) — FOUND
- `.output/chrome-mv3/manifest.json` contains "clipboardWrite" and "downloads" — VERIFIED
- `pnpm typecheck` clean — VERIFIED
- `ALL_OG_FIELDS` has 18 entries — VERIFIED
- `KNOWN_OG_FIELDS` untouched (6 entries, no required flag) — VERIFIED

---
*Phase: 05-metadata-export*
*Completed: 2026-02-18*

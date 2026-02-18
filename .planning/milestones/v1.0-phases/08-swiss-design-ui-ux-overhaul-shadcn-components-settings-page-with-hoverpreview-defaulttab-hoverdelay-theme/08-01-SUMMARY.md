---
phase: 08-swiss-design-ui-ux-overhaul-shadcn-components-settings-page-with-hoverpreview-defaulttab-hoverdelay-theme
plan: "01"
subsystem: ui
tags: [react, typescript, chrome-extension, settings, chrome-storage-sync]

# Dependency graph
requires:
  - phase: 07-hover-tooltip
    provides: content script with tooltip; popup App.tsx view structure
provides:
  - OgPreviewSettings type with hoverPreview, defaultTab, hoverDelay, theme fields
  - getSettings() / setSetting() / onSettingsChanged() chrome.storage.sync helpers
  - App.tsx view state machine (main | settings) with placeholder settings view
  - Settings-aware theme initialization deferring popup render until theme applied

affects:
  - 08-02-shadcn-components
  - 08-03-settings-page
  - 08-04-content-script-settings-integration

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Settings module pattern: typed interface + DEFAULT_SETTINGS + storage helpers in lib/settings.ts"
    - "View state machine in App.tsx: view state guards full render swap at top of component"
    - "Async theme init: applyTheme() before ReactDOM.createRoot to prevent flash of wrong theme"

key-files:
  created:
    - lib/settings.ts
  modified:
    - entrypoints/popup/App.tsx
    - entrypoints/popup/main.tsx
    - entrypoints/popup/components/CompactCard.tsx
    - entrypoints/popup/components/ExpandedView.tsx

key-decisions:
  - "DEFAULT_SETTINGS.hoverPreview = false — hover preview off by default for new installs"
  - "getSettings spreads result[STORAGE_KEY] cast to Partial<OgPreviewSettings> — satisfies TS strict spread type requirement"
  - "App.tsx loads settings in parallel with OgData via Promise.all to avoid sequential latency"
  - "onOpenSettings is optional on CompactCard — no-op if unset, wired in Plan 08-03"
  - "ExpandedView.defaultTab defaults to 'previews' — backward compatible with existing callers"

patterns-established:
  - "Settings-aware theme: read stored theme before first React render; toggle .dark on <html>"
  - "Parallel async initialization: Promise.all([sendMessage, getSettings]) in single useEffect"

requirements-completed: []

# Metrics
duration: 3min
completed: 2026-02-19
---

# Phase 08 Plan 01: Settings Infrastructure Summary

**Typed settings module with chrome.storage.sync persistence, App.tsx view state machine routing to a settings placeholder, and settings-aware popup theme initialization preventing flash of wrong theme.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-19T08:21:46Z
- **Completed:** 2026-02-19T08:24:27Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- `lib/settings.ts` created with `OgPreviewSettings` type, `DEFAULT_SETTINGS` (hoverPreview: false), and `getSettings()` / `setSetting()` / `onSettingsChanged()` helpers
- `App.tsx` extended with `view: 'main' | 'settings'` state and settings placeholder rendering; settings loaded in parallel with OG data
- `main.tsx` now defers `ReactDOM.createRoot` until `applyTheme()` resolves, respecting stored theme preference over raw system preference

## Task Commits

Each task was committed atomically:

1. **Task 1: Create lib/settings.ts** - `6e7b7ae` (feat)
2. **Task 2: Add view state to App.tsx** - `e0e7829` (feat)
3. **Task 3: Update main.tsx theme initialization** - `7fc0306` (feat)

## Files Created/Modified
- `lib/settings.ts` - OgPreviewSettings interface, DEFAULT_SETTINGS, getSettings/setSetting/onSettingsChanged helpers
- `entrypoints/popup/App.tsx` - view state machine, settings state, parallel data+settings load, settings placeholder
- `entrypoints/popup/main.tsx` - async applyTheme() defers render until stored theme applied
- `entrypoints/popup/components/CompactCard.tsx` - added optional onOpenSettings prop
- `entrypoints/popup/components/ExpandedView.tsx` - added optional defaultTab prop wired to Tabs defaultValue

## Decisions Made
- `DEFAULT_SETTINGS.hoverPreview = false` — hover preview off by default to avoid surprising new users
- TypeScript spread fix: cast `result[STORAGE_KEY]` to `Partial<OgPreviewSettings>` — chrome type returns unknown, strict TS requires typed spread
- `Promise.all` for parallel load — avoids sequential network + storage latency on popup open
- `onOpenSettings` optional on CompactCard — allows calling code to opt in; wired fully in Plan 08-03

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript spread type error in getSettings()**
- **Found during:** Task 1 (Create lib/settings.ts)
- **Issue:** `result[STORAGE_KEY]` from chrome.storage.sync is typed as `unknown`; TS strict mode forbids spreading unknown
- **Fix:** Added `as Partial<OgPreviewSettings>` cast on the spread operand
- **Files modified:** lib/settings.ts
- **Verification:** `npx tsc --noEmit --skipLibCheck` passes with no errors
- **Committed in:** 6e7b7ae (Task 1 commit)

**2. [Rule 3 - Blocking] Added onOpenSettings prop to CompactCard and defaultTab prop to ExpandedView**
- **Found during:** Task 2 (Add view state to App.tsx)
- **Issue:** App.tsx passes onOpenSettings to CompactCard and defaultTab to ExpandedView, but those components did not accept those props — TypeScript errors would prevent compilation
- **Fix:** Added optional `onOpenSettings?: () => void` to CompactCard interface; added optional `defaultTab?: 'previews' | 'metadata'` to ExpandedView interface, wired to `<Tabs defaultValue>`
- **Files modified:** entrypoints/popup/components/CompactCard.tsx, entrypoints/popup/components/ExpandedView.tsx
- **Verification:** TypeScript clean after both changes
- **Committed in:** e0e7829 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes necessary for TypeScript correctness and compilation. No scope creep.

## Issues Encountered
None beyond the auto-fixed TypeScript issues above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Settings infrastructure complete; 08-02 can add shadcn components to the UI
- `onOpenSettings` prop on CompactCard is wired but has no button yet — Plan 08-03 will add the settings gear icon
- `defaultTab` flows from stored settings to ExpandedView — ready for Plan 08-03 to persist changes

---
*Phase: 08-swiss-design-ui-ux-overhaul-shadcn-components-settings-page-with-hoverpreview-defaulttab-hoverdelay-theme*
*Completed: 2026-02-19*

---
phase: 03-popup-shell
plan: 03
subsystem: ui
tags: [react, hugeicons, shadcn, tailwind, wxt, typescript]

# Dependency graph
requires:
  - phase: 03-01
    provides: shadcn/ui components (skeleton, empty, card) and Tailwind CSS variables
  - phase: 03-02
    provides: og-display helpers (getOgDataStatus, resolveDisplayData, KNOWN_OG_FIELDS) and OgData type
  - phase: 02-02
    provides: sendMessage/onMessage messaging API via @webext-core/messaging
provides:
  - Popup state machine (App.tsx) handling all 5 display states
  - CompactCard component with image banner, title, description, expand toggle
  - OgCardSkeleton loading placeholder matching compact card proportions
  - EmptyState component for empty and error variants using shadcn Empty
  - MissingFields component listing absent OG fields from KNOWN_OG_FIELDS
affects:
  - 03-04 (ExpandedView wires into App.tsx expanded state already in place)
  - 04-tooltip (similar state machine pattern for tooltip popup)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "OgData | null | undefined tri-state: undefined=loading, null=error, OgData=fetched"
    - "TypeScript narrowing via type assertion after status guard (ogData as OgData)"
    - "WXT browser global used directly in popup entrypoint (no import required)"
    - "HugeiconsIcon component accepts icon prop from @hugeicons/core-free-icons constants"

key-files:
  created:
    - entrypoints/popup/components/OgCardSkeleton.tsx
    - entrypoints/popup/components/EmptyState.tsx
    - entrypoints/popup/components/MissingFields.tsx
    - entrypoints/popup/components/CompactCard.tsx
  modified:
    - entrypoints/popup/App.tsx

key-decisions:
  - "OgData tri-state (undefined/null/OgData) for loading vs error vs fetched — undefined means not yet fetched (show skeleton), null means sendMessage returned null or threw (show error EmptyState)"
  - "TypeScript narrowing limitation: after getOgDataStatus 'error' guard, TypeScript cannot narrow OgData | null to OgData; resolved with explicit 'as OgData' assertion which is safe because null maps to 'error' status"
  - "FileSearchIcon (empty state) and LockIcon (error state) confirmed available in @hugeicons/core-free-icons@3.1.1 free tier"
  - "ArrowDown01Icon / ArrowUp01Icon used for expand/collapse toggle in CompactCard"

patterns-established:
  - "Popup components pattern: leaf components in entrypoints/popup/components/, imported by App.tsx"
  - "Image alt fallback chain: ogData.imageAlt ?? title ?? 'Page preview image'"
  - "Expand toggle pattern: local boolean state in App.tsx passed down to CompactCard, placeholder div for Plan 04 ExpandedView"

# Metrics
duration: 3min
completed: 2026-02-18
---

# Phase 3 Plan 03: Popup State Machine and Compact Card Summary

**React popup state machine with 5-state OgData handling (loading/error/empty/partial/complete), CompactCard image banner, and shadcn Empty-based status components**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-18T11:51:50Z
- **Completed:** 2026-02-18T11:54:39Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- App.tsx state machine: undefined (loading/skeleton), null (error), empty OgData, partial OgData, complete OgData — all states handled
- CompactCard: full-width 1.91:1 image banner with fallback, title (truncate), description (line-clamp-2), siteName, expand/collapse toggle with hugeicons arrows
- Four leaf components: OgCardSkeleton (Skeleton-based), EmptyState (shadcn Empty, two variants), MissingFields (KNOWN_OG_FIELDS filter), CompactCard
- TypeScript clean, build succeeds (420.75 kB bundle)

## Task Commits

Each task was committed atomically:

1. **Task 1: Leaf components — OgCardSkeleton, EmptyState, MissingFields** - `0fc2dbe` (feat)
2. **Task 2: CompactCard and App.tsx state machine** - `fdc1127` (feat)

**Plan metadata:** *(docs commit follows)*

## Files Created/Modified
- `entrypoints/popup/App.tsx` - Root state machine: loading/error/empty/partial/complete states, OgData fetch via sendMessage, expand toggle
- `entrypoints/popup/components/CompactCard.tsx` - Full-width image banner, title/description/siteName display, MissingFields for partial, expand/collapse button
- `entrypoints/popup/components/OgCardSkeleton.tsx` - Skeleton loading placeholder: 199px image + title/desc lines
- `entrypoints/popup/components/EmptyState.tsx` - shadcn Empty wrapper for 'empty' (FileSearchIcon) and 'error' (LockIcon) variants
- `entrypoints/popup/components/MissingFields.tsx` - Filters KNOWN_OG_FIELDS to missing keys, renders label + description list

## Decisions Made
- OgData tri-state (undefined/null/OgData): undefined = not yet fetched, null = error/restricted, OgData = success. Clean state machine without boolean flags.
- TypeScript narrowing: `ogData as OgData` assertion after 'error' status guard — safe because `getOgDataStatus(null) === 'error'` is invariant.
- Confirmed FileSearchIcon and LockIcon in @hugeicons/core-free-icons@3.1.1 free tier before writing EmptyState.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript narrowing on OgData | null | undefined after status guard**
- **Found during:** Task 2 (App.tsx state machine)
- **Issue:** TypeScript could not narrow `ogData` from `OgData | null | undefined` to `OgData` after status === 'error' and status === 'empty' guards for CompactCard props
- **Fix:** Added `ogData as OgData` type assertion with inline comment explaining why it is safe
- **Files modified:** entrypoints/popup/App.tsx
- **Verification:** `pnpm run typecheck` passes with zero errors
- **Committed in:** fdc1127 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - type narrowing bug)
**Impact on plan:** Single-line fix required for TypeScript correctness. No scope creep.

## Issues Encountered
None - both tasks executed cleanly after the TypeScript narrowing fix.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Popup state machine is complete and functional — all 5 states render correctly
- App.tsx already has `expanded` state and placeholder div for ExpandedView (Plan 04 can wire in without touching state logic)
- Fixed 380px popup width set on all root divs — no horizontal scroll
- No blockers for Plan 04 (ExpandedView)

---
*Phase: 03-popup-shell*
*Completed: 2026-02-18*

## Self-Check: PASSED

All files verified present:
- entrypoints/popup/components/OgCardSkeleton.tsx - FOUND
- entrypoints/popup/components/EmptyState.tsx - FOUND
- entrypoints/popup/components/MissingFields.tsx - FOUND
- entrypoints/popup/components/CompactCard.tsx - FOUND
- entrypoints/popup/App.tsx - FOUND

All commits verified:
- 0fc2dbe (Task 1 leaf components) - FOUND
- fdc1127 (Task 2 CompactCard + App.tsx) - FOUND

---
phase: 07-hover-tooltip
plan: 02
subsystem: ui
tags: [react, typescript, shadow-dom, tooltip, og-preview, viewport-clamping, state-machine]

# Dependency graph
requires:
  - phase: 07-01
    provides: Shadow DOM host, hover delegation wired, TooltipApp stub in place
  - phase: 02-01
    provides: OgProtocolMap with getOgData message type and sendMessage helper
  - phase: 03-02
    provides: resolveDisplayData function in lib/og-display.ts
provides:
  - Full tooltip state machine (hidden → loading → ready → error) in TooltipApp
  - OgTooltip positioning shell with viewport clamping and opacity fade-in
  - TooltipSkeleton loading state (TTIP-03)
  - TooltipErrorState for empty/failed pages (TTIP-04)
  - TooltipCard displaying OG image, title, description, and domain
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Stale-fetch guard pattern: staleRef counter incremented on each show()/hide() call to discard superseded async fetch results"
    - "Two-pass tooltip positioning: render invisible → measure height → clamp to viewport → set visible (useLayoutEffect)"
    - "Leaf component architecture: OgTooltip acts as phase-router, delegating to TooltipSkeleton / TooltipErrorState / TooltipCard"

key-files:
  created:
    - components/tooltip/OgTooltip.tsx
    - components/tooltip/TooltipSkeleton.tsx
    - components/tooltip/TooltipErrorState.tsx
    - components/tooltip/TooltipCard.tsx
  modified:
    - entrypoints/tooltip/TooltipApp.tsx

key-decisions:
  - "Stale-fetch guard via staleRef integer counter — @webext-core/messaging v2.3.0 has no AbortSignal support; counter is simple and correct"
  - "Empty OgData ({}) treated as error state — check data.title || data.description || data.image; empty object falls through to error"
  - "useLayoutEffect for viewport clamping — avoids visible jump by running synchronously before browser paint; re-runs on phase change since skeleton and card have different heights"
  - "og-tooltip-card CSS class on tooltip div — enables pointer-events: auto in shadow DOM stylesheet without inline style"

patterns-established:
  - "Phase-routing component: OgTooltip renders different leaf based on phase prop, keeps positioning logic in one place"
  - "Controller mutation pattern: TooltipApp assigns show/hide to controllerRef on every render to avoid stale closures"

# Metrics
duration: 3min
completed: 2026-02-18
---

# Phase 7 Plan 2: Hover Tooltip UI Summary

**Full OG preview tooltip state machine with four phases: skeleton while fetching, OG card with image/title/description/domain on success, error state for empty/failed pages, and viewport-clamped positioning shell**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-18T17:12:17Z
- **Completed:** 2026-02-18T17:14:31Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Built four tooltip components: OgTooltip (positioning shell), TooltipSkeleton, TooltipErrorState, TooltipCard
- Replaced TooltipApp stub with full async state machine managing hidden/loading/ready/error states
- Stale-fetch guard prevents race conditions when rapidly hovering multiple links
- Viewport clamping via two-pass useLayoutEffect keeps tooltip inside viewport on edges

## Task Commits

Each task was committed atomically:

1. **Task 1: Build OgTooltip positioning shell and three leaf components** - `eaae583` (feat)
2. **Task 2: Replace TooltipApp stub with full state machine** - `de402e9` (feat)

## Files Created/Modified
- `components/tooltip/OgTooltip.tsx` - Positioning shell with viewport clamping and phase-based child routing
- `components/tooltip/TooltipSkeleton.tsx` - Loading skeleton with image area placeholder and text lines
- `components/tooltip/TooltipErrorState.tsx` - Error/empty state with "No preview available" messaging
- `components/tooltip/TooltipCard.tsx` - OG data display with image, title, description, and domain
- `entrypoints/tooltip/TooltipApp.tsx` - Full state machine: fetches via sendMessage, stale-fetch guard, renders OgTooltip

## Decisions Made
- Stale-fetch guard via `staleRef` integer counter — `@webext-core/messaging` v2.3.0 has no AbortSignal support; counter is simple and correct
- Empty OgData `{}` treated as error state — check `data.title || data.description || data.image`; empty object falls through to error
- `useLayoutEffect` for viewport clamping — avoids visible jump by running synchronously before browser paint; re-runs on phase change since skeleton and card have different heights
- `og-tooltip-card` CSS class on tooltip div — enables `pointer-events: auto` in shadow DOM stylesheet without inline style

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 7 (Hover Tooltip) is now complete — all four TTIP acceptance criteria deliverable: skeleton (TTIP-03), error state (TTIP-04), OG card on success (TTIP-01), shadow DOM isolation (TTIP-05)
- TTIP-02 (dismiss on mouse-out) was wired in 07-01 via hover delegation; tooltip hides immediately when mouse leaves the link
- No further phases planned — this is the final plan of the final phase

---
*Phase: 07-hover-tooltip*
*Completed: 2026-02-18*

## Self-Check: PASSED

- All 5 component files exist on disk
- Task commits eaae583 and de402e9 verified in git log
- SUMMARY.md created at .planning/phases/07-hover-tooltip/07-02-SUMMARY.md

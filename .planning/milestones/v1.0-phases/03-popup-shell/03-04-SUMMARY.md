---
phase: 03-popup-shell
plan: 04
subsystem: ui
tags: [react, shadcn, tabs, radix-ui, extension-popup]

# Dependency graph
requires:
  - phase: 03-popup-shell
    provides: "03-03 App.tsx state machine, CompactCard with expand/collapse toggle, placeholder div for ExpandedView"
provides:
  - "ExpandedView.tsx: outer Previews/Metadata tab shell using shadcn Tabs"
  - "PreviewsTab.tsx: X / Facebook / LinkedIn sub-tabs with coming-soon placeholders"
  - "MetadataTab.tsx: Phase 5 placeholder"
  - "App.tsx: ExpandedView wired in, expand/collapse fully functional end-to-end"
  - "Phase 3 popup shell: visually verified in Chrome across 6 scenarios"
affects:
  - "04-platform-previews (renders into PreviewsTab platform slots)"
  - "05-metadata-view (renders into MetadataTab slot)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Nested shadcn Tabs: outer ExpandedView tabs contain inner PreviewsTab tabs"
    - "Platform sub-tabs as const array for type-safe iteration"
    - "Text label fallback for brand icons (pro-tier icons not used)"

key-files:
  created:
    - entrypoints/popup/components/ExpandedView.tsx
    - entrypoints/popup/components/PreviewsTab.tsx
    - entrypoints/popup/components/MetadataTab.tsx
  modified:
    - entrypoints/popup/App.tsx

key-decisions:
  - "Text labels (X, Facebook, LinkedIn) used for platform sub-tabs — brand icons are pro-only in hugeicons, text is reliable and sufficient for Phase 3"
  - "ExpandedView carries its own w-[380px] and border-t border-border to maintain fixed popup width and visual separation from CompactCard"

patterns-established:
  - "Nested Tabs pattern: shadcn Tabs inside shadcn Tabs with defaultValue on each level"
  - "Platform placeholder pattern: coming-soon copy in each TabsContent referencing the phase that will fill it"

# Metrics
duration: ~15min
completed: 2026-02-18
---

# Phase 3 Plan 04: ExpandedView Shell Summary

**Expand/collapse popup with nested shadcn Tabs (Previews + Metadata outer; X/Facebook/LinkedIn inner) wired into App.tsx and visually verified in Chrome across all 6 Phase 3 scenarios.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-02-18T11:57:13Z
- **Completed:** 2026-02-18T12:37:24Z
- **Tasks:** 2 of 2 complete
- **Files modified:** 4

## Accomplishments

- ExpandedView.tsx created with outer Previews/Metadata tab shell using shadcn Tabs
- PreviewsTab.tsx created with X / Facebook / LinkedIn nested sub-tabs, each showing a "coming in Phase 4" placeholder
- MetadataTab.tsx created with "coming in Phase 5" placeholder text
- App.tsx updated to import and render `<ExpandedView />` when `expanded === true`, replacing the Plan 03 placeholder div
- User visually verified all 6 scenarios in Chrome: compact card, expand/collapse, error state (chrome://newtab), partial state (Hacker News), dark mode, no horizontal scroll — all passed

## Task Commits

Each task was committed atomically:

1. **Task 1: ExpandedView, PreviewsTab, MetadataTab + App.tsx wiring** - `be89c64` (feat)
2. **Task 2: Visual verification checkpoint** - checkpoint:human-verify approved by user (no code commit)

**Plan metadata:** `9da9bc1` (docs: complete ExpandedView plan — at checkpoint:human-verify)

## Files Created/Modified

- `entrypoints/popup/components/ExpandedView.tsx` - Outer Previews/Metadata tab shell
- `entrypoints/popup/components/PreviewsTab.tsx` - Platform sub-tabs (X, Facebook, LinkedIn) with coming-soon placeholders
- `entrypoints/popup/components/MetadataTab.tsx` - Phase 5 placeholder
- `entrypoints/popup/App.tsx` - ExpandedView imported and conditionally rendered when expanded=true

## Decisions Made

- Text labels (X, Facebook, LinkedIn) used for platform sub-tabs — brand icons are pro-only in hugeicons free tier per prior research; text labels are sufficient for Phase 3 scaffolding
- ExpandedView carries its own `w-[380px]` and `border-t border-border` to maintain fixed popup width and visual separation from CompactCard

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 3 complete: all four Phase 3 success criteria visually verified by user
- Phase 4 can begin: platform preview cards render into PreviewsTab X/Facebook/LinkedIn slots
- Phase 5 can begin concurrently: metadata view renders into MetadataTab slot
- Phases 4 and 5 can run in parallel per Roadmap decision

---
*Phase: 03-popup-shell*
*Completed: 2026-02-18*

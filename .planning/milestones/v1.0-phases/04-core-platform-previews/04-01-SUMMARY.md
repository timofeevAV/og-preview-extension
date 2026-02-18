---
phase: 04-core-platform-previews
plan: "01"
subsystem: ui
tags: [react, typescript, tailwind, og-preview, platform-cards, xcard]

# Dependency graph
requires:
  - phase: 03-popup-shell
    provides: ExpandedView + PreviewsTab scaffolding without data props
  - phase: 02-data-pipeline
    provides: OgData type and resolveDisplayData helper in lib/og-display.ts
provides:
  - OgData prop threading: App.tsx → ExpandedView → PreviewsTab with full TypeScript safety
  - XCard component at entrypoints/popup/components/platform/XCard.tsx
  - summary_large_image layout (16:9 image + gradient overlay + domain/title)
  - summary layout (80x80 thumbnail-left + domain/title)
affects: [04-02-platform-cards, 04-03, any plan wiring XCard into PreviewsTab]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Platform card components live in entrypoints/popup/components/platform/
    - Cards accept OgData prop directly and call resolveDisplayData() internally
    - Domain extraction via URL.hostname with www. stripping, fallback to siteName
    - No hardcoded hex colors; Tailwind tokens for theme compatibility; white text intentional on dark gradient overlay

key-files:
  created:
    - entrypoints/popup/components/platform/XCard.tsx
  modified:
    - entrypoints/popup/App.tsx
    - entrypoints/popup/components/ExpandedView.tsx
    - entrypoints/popup/components/PreviewsTab.tsx

key-decisions:
  - "XCard uses twitterCard === 'summary' to switch between horizontal thumbnail and full 16:9 layouts"
  - "Platform cards directory: entrypoints/popup/components/platform/ established as home for all card components"
  - "XCard omits description — X only shows domain + title in feed for summary_large_image per research"
  - "White overlay text (text-white, text-white/60) intentional: sits on dark gradient over any image, readable in both themes"

patterns-established:
  - "Platform card pattern: accept OgData prop, call resolveDisplayData(), derive domain via extractDomain(), switch layout on twitterCard value"

# Metrics
duration: 8min
completed: 2026-02-18
---

# Phase 4 Plan 01: OgData Prop Threading and XCard Summary

**OgData prop wired from App.tsx through ExpandedView and PreviewsTab; XCard component built with accurate 16:9 summary_large_image and horizontal summary layouts using Tailwind tokens and gradient overlay.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-02-18T00:00:00Z
- **Completed:** 2026-02-18T00:08:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Threaded OgData prop from App.tsx through ExpandedView.tsx to PreviewsTab.tsx with full TypeScript safety (ExpandedViewProps + PreviewsTabProps interfaces added)
- Built XCard.tsx with summary_large_image layout: full-width 16:9 image, gradient overlay, domain + title at bottom
- Built XCard.tsx summary variant: horizontal 80x80px thumbnail-left layout with domain + title on right
- Both variants handle missing image gracefully with bg-muted placeholder
- Zero TypeScript errors; build succeeds

## Task Commits

Each task was committed atomically:

1. **Task 1: Thread ogData prop through App → ExpandedView → PreviewsTab** - `5e98fbf` (feat)
2. **Task 2: Build XCard.tsx — X/Twitter platform card** - `a7f511b` (feat)

## Files Created/Modified

- `entrypoints/popup/App.tsx` - Changed `<ExpandedView />` to `<ExpandedView ogData={ogData as OgData} />`
- `entrypoints/popup/components/ExpandedView.tsx` - Added ExpandedViewProps, accepts ogData, forwards to PreviewsTab
- `entrypoints/popup/components/PreviewsTab.tsx` - Added PreviewsTabProps, accepts ogData (ready for Plan 02 wiring)
- `entrypoints/popup/components/platform/XCard.tsx` - New X/Twitter card component with two layout variants

## Decisions Made

- XCard switches layout on `twitterCard === 'summary'`; all other values (including summary_large_image and undefined) use the full 16:9 default layout
- Platform card directory `entrypoints/popup/components/platform/` established; future Facebook, LinkedIn, iMessage cards will follow same pattern
- XCard omits description per X's actual feed behavior for summary_large_image (research-confirmed)
- White overlay text (`text-white`, `text-white/60`) is intentionally white in both light and dark themes — it sits on a dark gradient over the card image

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — TypeScript passed cleanly on first attempt, build succeeded without issues.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `ogData` is now in scope in PreviewsTab, ready for Plan 02 to wire XCard into the X platform tab
- Facebook and LinkedIn card components can be created following the same pattern as XCard
- PreviewsTab placeholder divs remain for Plan 02 replacement with actual card components

---
*Phase: 04-core-platform-previews*
*Completed: 2026-02-18*

## Self-Check: PASSED

- FOUND: entrypoints/popup/components/platform/XCard.tsx
- FOUND: entrypoints/popup/App.tsx
- FOUND: entrypoints/popup/components/ExpandedView.tsx
- FOUND: entrypoints/popup/components/PreviewsTab.tsx
- FOUND: .planning/phases/04-core-platform-previews/04-01-SUMMARY.md
- FOUND commit: 5e98fbf (Task 1)
- FOUND commit: a7f511b (Task 2)

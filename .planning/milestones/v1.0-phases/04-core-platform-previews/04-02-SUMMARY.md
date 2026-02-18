---
phase: 04-core-platform-previews
plan: "02"
subsystem: ui
tags: [react, typescript, tailwind, og-preview, platform-cards, facebook, linkedin]

# Dependency graph
requires:
  - phase: 04-core-platform-previews/04-01
    provides: XCard component, ogData prop threading through App → ExpandedView → PreviewsTab
  - phase: 02-data-pipeline
    provides: OgData type and resolveDisplayData helper in lib/og-display.ts
provides:
  - FacebookCard component at entrypoints/popup/components/platform/FacebookCard.tsx
  - LinkedInCard component at entrypoints/popup/components/platform/LinkedInCard.tsx
  - PreviewsTab wired with all three platform cards (XCard, FacebookCard, LinkedInCard)
affects: [04-03, any future plans referencing platform preview components]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - FacebookCard uses 1.91:1 full-width image with text block below (uppercase domain, bold title, description)
    - LinkedInCard uses horizontal flex layout with fixed 96x96 left thumbnail and title+domain text stack on right
    - Both cards follow established PlatformCardProps pattern from XCard (OgData prop + resolveDisplayData + extractDomain)
    - PreviewsTab uses explicit TabsContent entries per platform (not map) to wire different card components

key-files:
  created:
    - entrypoints/popup/components/platform/FacebookCard.tsx
    - entrypoints/popup/components/platform/LinkedInCard.tsx
  modified:
    - entrypoints/popup/components/PreviewsTab.tsx

key-decisions:
  - "PreviewsTab TabsContent switched from PLATFORMS.map to explicit entries — required to render different card component per platform"
  - "p-3 padding added to each TabsContent for card breathing room inside tab panel"
  - "LinkedInCard description rendered below domain (minor extension of spec) — title and domain ordering matches LinkedIn spec exactly"

patterns-established:
  - "Platform card pattern complete: accept OgData prop, call resolveDisplayData(), derive domain via extractDomain(), render per-platform visual layout"

# Metrics
duration: ~5min
completed: 2026-02-18
---

# Phase 4 Plan 02: FacebookCard, LinkedInCard, and PreviewsTab Wiring Summary

**FacebookCard (1.91:1 image + text block) and LinkedInCard (96x96 horizontal thumbnail) built and wired with XCard into PreviewsTab, completing all three platform preview cards.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-02-18T13:09:51Z
- **Completed:** 2026-02-18T13:17:40Z
- **Tasks:** 3 (2 auto + 1 checkpoint:human-verify — user approved)
- **Files modified:** 3

## Accomplishments

- Built FacebookCard.tsx: 1.91:1 full-width image, uppercase domain below, bold title, description — matches Facebook desktop link preview spec
- Built LinkedInCard.tsx: horizontal 96x96 square thumbnail left, title+domain text stack right — matches LinkedIn 2024 organic post card spec
- Both cards handle missing image with muted placeholder at correct dimensions (no layout breakage)
- Updated PreviewsTab.tsx to replace placeholder divs with XCard, FacebookCard, LinkedInCard in their respective tab panels
- Zero TypeScript errors; production build succeeds (450.9 kB)
- User visually verified all three platform cards in Chrome extension popup — confirmed accurate (Task 3 approved)

## Task Commits

Each task was committed atomically:

1. **Task 1: Build FacebookCard.tsx and LinkedInCard.tsx** - `ee84737` (feat)
2. **Task 2: Wire XCard, FacebookCard, LinkedInCard into PreviewsTab** - `976b553` (feat)
3. **Task 3: Visual verification of all three platform preview cards** - user approved (checkpoint:human-verify)

**Plan metadata:** `9c9bb66` (docs: checkpoint pause) + final docs commit (this update)

## Files Created/Modified

- `entrypoints/popup/components/platform/FacebookCard.tsx` - Facebook desktop card: 1.91:1 image, uppercase domain, bold title, description
- `entrypoints/popup/components/platform/LinkedInCard.tsx` - LinkedIn 2024 organic card: horizontal 96x96 thumbnail + title/domain
- `entrypoints/popup/components/PreviewsTab.tsx` - Wired with XCard, FacebookCard, LinkedInCard; placeholder text removed

## Decisions Made

- PreviewsTab TabsContent switched from PLATFORMS.map loop to explicit per-platform entries so each tab can render a distinct card component
- p-3 padding applied to each TabsContent for consistent card breathing room
- extractDomain defined locally in each card file (copy of 10-line pure function) — not shared at this stage per plan spec

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — TypeScript passed cleanly on first attempt, build succeeded without issues.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 4 is now complete: all three platform preview cards (X, Facebook, LinkedIn) built and user-verified
- Platform card pattern fully established at `entrypoints/popup/components/platform/` — Phase 5/6 iMessage and WhatsApp cards follow same pattern
- PreviewsTab fully wired; no placeholder text remains in any platform tab
- Known future concern: iMessage/WhatsApp specs are underdocumented (logged in STATE.md blockers)

---
*Phase: 04-core-platform-previews*
*Completed: 2026-02-18*

## Self-Check: PASSED

- FOUND: entrypoints/popup/components/platform/FacebookCard.tsx
- FOUND: entrypoints/popup/components/platform/LinkedInCard.tsx
- FOUND: entrypoints/popup/components/platform/XCard.tsx
- FOUND: entrypoints/popup/components/PreviewsTab.tsx
- FOUND: .planning/phases/04-core-platform-previews/04-02-SUMMARY.md
- FOUND commit: ee84737 (Task 1)
- FOUND commit: 976b553 (Task 2)
- Task 3 (checkpoint:human-verify): user approved — visual verification confirmed

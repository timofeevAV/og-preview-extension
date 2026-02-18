---
phase: 08-swiss-design-ui-ux-overhaul-shadcn-components-settings-page-with-hoverpreview-defaulttab-hoverdelay-theme
plan: "04"
subsystem: ui
tags: [react, typescript, chrome-extension, swiss-design, tailwind, shadow-dom, css-custom-properties]

# Dependency graph
requires:
  - phase: 08-01
    provides: CompactCard/ExpandedView with defaultTab prop; App.tsx settings-aware loading
  - phase: 08-02
    provides: onSettingsChanged listener in content.tsx; settings-aware hover delegation
provides:
  - Swiss Design underline tab navigation in ExpandedView (achromatic, uppercase, border-b-2 active indicator)
  - Swiss Design EmptyState (plain centered text, no decorative icons)
  - Swiss Design OgCardSkeleton (aspectRatio 1.91 matching CompactCard, px-4 py-3 spacing)
  - popup/style.css --radius reduced to 0.25rem (4px) for crisp corners throughout popup
  - tooltip/style.css forced theme selectors: :host([data-theme=light]) and :host([data-theme=dark])
  - content.tsx applyShadowTheme() reads settings.theme and sets data-theme on shadow host element

affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shadow DOM forced theme: data-theme attribute on custom element host; :host([data-theme=X]) selectors override media query"
    - "Swiss Design tabs: rounded-none, border-b-2, border-transparent default, border-foreground active"
    - "Achromatic active tab indicator: data-[state=active]:border-foreground data-[state=active]:bg-transparent"

key-files:
  created: []
  modified:
    - entrypoints/popup/components/ExpandedView.tsx
    - entrypoints/popup/components/EmptyState.tsx
    - entrypoints/popup/components/OgCardSkeleton.tsx
    - entrypoints/popup/style.css
    - entrypoints/tooltip/style.css
    - entrypoints/content.tsx

key-decisions:
  - "applyShadowTheme() placed after ui.mount() — shadow host must be mounted before querySelector can find it"
  - "theme change integrated into existing onSettingsChanged listener — no duplicate listener"
  - "EmptyState removed shadcn Empty components entirely — plain HTML sufficient for Swiss minimal aesthetic"
  - "OgCardSkeleton uses aspectRatio style prop instead of fixed px height — responsive to container width"

patterns-established:
  - "Shadow DOM forced theme: set data-theme attribute on custom element; :host([attr]) CSS selectors win over media query"

requirements-completed: []

# Metrics
duration: 2min
completed: 2026-02-19
---

# Phase 08 Plan 04: Swiss Design + Theme System Summary

**Swiss Design applied to all popup components (underline tabs, minimal EmptyState, skeleton proportions), 4px global radius, and tooltip shadow DOM forced theme via data-theme attribute + CSS :host selectors.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-19T08:29:42Z
- **Completed:** 2026-02-19T08:32:07Z
- **Tasks:** 5 (task 1 was pre-done by 08-01)
- **Files modified:** 6

## Accomplishments
- ExpandedView tabs rewritten to Swiss underline style: `rounded-none`, `text-[10px] uppercase tracking-widest`, `border-b-2 border-transparent`, active state uses `border-foreground bg-transparent shadow-none`
- EmptyState replaced shadcn decorative components with plain Swiss-minimal centered text layout (no icons)
- OgCardSkeleton skeleton proportions aligned to CompactCard layout (aspectRatio 1.91, px-4 py-3 spacing)
- `popup/style.css` `--radius` changed from `0.625rem` to `0.25rem` (4px) for global crisp Swiss corners; body gets `margin: 0; width: fit-content`
- Tooltip shadow DOM forced theme system: `applyShadowTheme()` in content.tsx sets `data-theme` attribute on `og-preview-tooltip` host element; tooltip/style.css has `:host([data-theme="light"])` and `:host([data-theme="dark"])` overrides that beat the media query

## Task Commits

Each task was committed atomically:

1. **Task 1: CompactCard Swiss Design** - pre-done by 08-01 (no commit needed)
2. **Task 2: ExpandedView Swiss tabs + defaultTab** - `3444ed0` (feat)
3. **Task 3: EmptyState + OgCardSkeleton** - `1763af2` (feat)
4. **Task 4: popup/style.css radius** - `c2441b1` (feat)
5. **Task 5: Tooltip theme override** - `c722a7e` (feat)

## Files Created/Modified
- `entrypoints/popup/components/ExpandedView.tsx` - Swiss underline tab styling via data-[state=active] classes
- `entrypoints/popup/components/EmptyState.tsx` - Removed shadcn Empty components; plain px-4 py-8 centered text
- `entrypoints/popup/components/OgCardSkeleton.tsx` - aspectRatio 1.91 + px-4 py-3 spacing matching CompactCard
- `entrypoints/popup/style.css` - --radius: 0.25rem; body margin:0 width:fit-content
- `entrypoints/tooltip/style.css` - :host([data-theme=light]) and :host([data-theme=dark]) forced theme selectors
- `entrypoints/content.tsx` - OgPreviewSettings type import; applyShadowTheme() function; theme branch in onSettingsChanged

## Decisions Made
- `applyShadowTheme()` defined after `ui.mount()` so shadow host exists when first called; querySelector will find `og-preview-tooltip`
- Theme change handling integrated into existing `onSettingsChanged` listener — instruction note warned not to create duplicate listener
- EmptyState fully removes shadcn Empty components — the Swiss spec requires no decorative icons, so the components added no value
- OgCardSkeleton uses `style={{ aspectRatio: '1.91' }}` instead of fixed `h-[199px]` — matches how CompactCard renders the image; auto-adjusts to container

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added OgPreviewSettings type import to content.tsx**
- **Found during:** Task 5 (Tooltip theme override)
- **Issue:** `applyShadowTheme(theme: OgPreviewSettings['theme'])` references the type but content.tsx only imported the value exports
- **Fix:** Added `type OgPreviewSettings` to the existing settings import
- **Files modified:** entrypoints/content.tsx
- **Verification:** Build passes with no TypeScript errors
- **Committed in:** c722a7e (Task 5 commit)

### Pre-completed Work

**Task 1 (CompactCard Swiss Design):** CompactCard.tsx already had the full Swiss Design implementation from 08-01 (rounded-none image, px-4 py-3 spacing, text-[10px] uppercase tracking-widest labels, EXPAND/COLLAPSE text buttons, border-t border-border). App.tsx already used w-[380px] wrappers. No changes were needed.

---

**Total deviations:** 1 auto-fixed (blocking type import) + 1 pre-completed task
**Impact on plan:** Auto-fix necessary for TypeScript correctness. Pre-done task from 08-01 means no rework needed.

## Issues Encountered
None beyond the auto-fixed type import.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 8 complete — all 4 plans executed
- Swiss Design applied throughout popup and tooltip
- Theme override system live: settings.theme controls tooltip appearance independently of OS preference
- `defaultTab` flows from storage through settings to ExpandedView
- Build compiles clean; extension ready for use

---
*Phase: 08-swiss-design-ui-ux-overhaul-shadcn-components-settings-page-with-hoverpreview-defaulttab-hoverdelay-theme*
*Completed: 2026-02-19*

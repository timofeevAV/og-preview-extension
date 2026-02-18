---
phase: 07-hover-tooltip
plan: 01
subsystem: ui
tags: [wxt, react, shadow-dom, tailwind, content-script, event-delegation]

# Dependency graph
requires:
  - phase: 02-data-pipeline
    provides: onMessage/getPageOgData handler already in content.ts; sendMessage protocol wired in messaging.ts
  - phase: 03-popup-shell
    provides: Tailwind v4 @import 'tailwindcss' pattern established in popup style.css
provides:
  - Shadow DOM host (og-preview-tooltip) mounted in document body via createShadowRootUi position:modal
  - Controller interface for show(url, x, y)/hide() wiring between content script and React component
  - Hover event delegation on document with 300ms debounce, same-origin filtering, child-element mouseout guard
  - Tooltip CSS file with @import 'tailwindcss' and pointer-events isolation for full-viewport overlay
  - TooltipApp stub that accepts controllerRef and wires show/hide no-ops (full state machine in Plan 02)
affects:
  - 07-02-PLAN.md (will replace TooltipApp stub with real state machine, sendMessage fetch, OgTooltip component)

# Tech tracking
tech-stack:
  added: [createShadowRootUi from wxt/utils/content-script-ui/shadow-root]
  patterns:
    - Controller object mutated in-place by React component to expose show/hide to content script
    - cssInjectionMode: 'ui' + CSS import pairing required for shadow root CSS injection
    - Single persistent shadow host created at init (never per-hover) because createShadowRootUi is async
    - Event delegation on document with mouseover/mouseout (bubbling) not mouseenter/mouseleave
    - content.tsx (not .ts) required when content script contains JSX

key-files:
  created:
    - entrypoints/tooltip/style.css
    - entrypoints/tooltip/TooltipApp.tsx
    - entrypoints/content.tsx
  modified:
    - entrypoints/content.ts (deleted; replaced by content.tsx)

key-decisions:
  - "content.ts renamed to content.tsx — JSX in content script requires .tsx extension for esbuild JSX transform"
  - "Controller pattern: plain object passed to createShadowRootUi onMount, mutated by TooltipApp on mount to wire real show/hide"
  - "position: modal chosen over overlay — creates fixed full-viewport shadow host; tooltip positions itself internally via coordinates"
  - "Same-origin links excluded from hover delegation — UX decision; can be reversed later without structural change"

patterns-established:
  - "Content script with JSX: use .tsx extension, cssInjectionMode: ui, import ./tooltip/style.css at top"
  - "Shadow DOM controller wiring: create empty controller object before createShadowRootUi, pass to React, React mutates it on mount"
  - "Hover delegation guard: if (url === activeUrl) return prevents rapid child-element mouseover spam"
  - "Child-element mouseout guard: link.contains(e.relatedTarget) prevents flicker on links with images"

# Metrics
duration: 3min
completed: 2026-02-18
---

# Phase 7 Plan 01: Shadow DOM Host + Hover Delegation Summary

**WXT shadow root UI mounted to body at content script init, with 300ms debounced hover delegation for external links and Controller interface wiring between content script and React stub**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-18T17:06:53Z
- **Completed:** 2026-02-18T17:09:05Z
- **Tasks:** 2
- **Files modified:** 3 (created 3, deleted 1)

## Accomplishments

- Created `entrypoints/tooltip/style.css` with Tailwind v4 import and `:host { pointer-events: none }` so the full-viewport shadow overlay doesn't block page mouse events
- Created `entrypoints/tooltip/TooltipApp.tsx` exporting the `Controller` interface and a no-op stub component that wires `controllerRef.show/hide` on render
- Extended content script (`content.tsx`) with `cssInjectionMode: 'ui'`, one persistent `createShadowRootUi` shadow host, and `setupHoverDelegation` with 300ms debounce, same-origin filtering, and child-element mouseout guard

## Task Commits

Each task was committed atomically:

1. **Task 1: Create tooltip CSS file and TooltipApp stub** - `ed5091a` (feat)
2. **Task 2: Extend content script with shadow host init and hover event delegation** - `fe3b412` (feat)

## Files Created/Modified

- `entrypoints/tooltip/style.css` - Tailwind v4 base styles for tooltip shadow root; `:host pointer-events: none`; `.og-tooltip-card pointer-events: auto`
- `entrypoints/tooltip/TooltipApp.tsx` - React stub accepting `{ controllerRef: Controller }`, wires show/hide no-ops; exports `Controller` interface
- `entrypoints/content.tsx` - Extended content script: cssInjectionMode ui, shadow host init via createShadowRootUi position:modal, setupHoverDelegation with 300ms timer
- `entrypoints/content.ts` - Deleted (replaced by content.tsx)

## Decisions Made

- **content.ts → content.tsx:** JSX in content script (`root.render(<TooltipApp .../>)`) requires `.tsx` extension for esbuild to apply the JSX transform. WXT confirmed `.tsx` is a valid entrypoint extension. Auto-fixed as Rule 3 (blocking issue).
- **Controller pattern:** Created a plain `controller` object before `createShadowRootUi`, passed it into `onMount` closure and to `setupHoverDelegation`. `TooltipApp` mutates `controllerRef.show` and `controllerRef.hide` on render. No React ref or module-level variable needed.
- **position: 'modal':** Fixed full-viewport overlay; tooltip positions itself internally using coordinates from `getBoundingClientRect()`. Avoids z-index and overflow stacking context conflicts with host page.
- **Same-origin exclusion:** `parsed.origin === location.origin` guard skips same-site links to avoid redundant previews of current site pages. Reversible in Plan 02 if needed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Renamed content.ts to content.tsx to enable JSX transform**
- **Found during:** Task 2 (extending content script with JSX render call)
- **Issue:** `root.render(<TooltipApp controllerRef={controller} />)` in a `.ts` file caused esbuild error: "Expected '>' but found 'controllerRef'" — esbuild does not apply JSX transform to `.ts` files
- **Fix:** Renamed `entrypoints/content.ts` to `entrypoints/content.tsx`; confirmed WXT recognizes `.tsx` as a valid content script extension (`.tsx` listed in entrypoints.mjs valid extensions)
- **Files modified:** `entrypoints/content.tsx` (created), `entrypoints/content.ts` (deleted)
- **Verification:** `pnpm build` succeeded; `pnpm typecheck` passed with no errors
- **Committed in:** `fe3b412` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required fix — JSX in content script cannot compile as `.ts`. File rename has no behavioral impact; WXT resolves the entrypoint identically.

## Issues Encountered

None beyond the auto-fixed Rule 3 deviation above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Shadow DOM host structure complete; `og-preview-tooltip` element appended to body at content script load
- `Controller` interface established; `TooltipApp` stub ready to receive full state machine in Plan 02
- `setupHoverDelegation` calls `controller.show(url, x, y)` and `controller.hide()` — Plan 02 only needs to replace the stubs with real state management
- Build is clean; no TypeScript errors; all hover edge cases (child elements, same-origin, rapid URL switching) handled in content script

---
*Phase: 07-hover-tooltip*
*Completed: 2026-02-18*

## Self-Check: PASSED

- entrypoints/tooltip/style.css: FOUND
- entrypoints/tooltip/TooltipApp.tsx: FOUND
- entrypoints/content.tsx: FOUND
- entrypoints/content.ts (deleted): CONFIRMED
- Commit ed5091a (Task 1): FOUND
- Commit fe3b412 (Task 2): FOUND

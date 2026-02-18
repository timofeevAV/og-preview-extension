---
phase: 07-hover-tooltip
verified: 2026-02-19T00:00:00Z
status: human_needed
score: 4/5 automated must-haves verified
re_verification: false
human_verification:
  - test: "Load extension in Chrome, visit a page with external links (e.g. news.ycombinator.com), hover a link for 300ms"
    expected: "Tooltip appears with loading skeleton, then resolves to OG card with image, title, description, and domain"
    why_human: "Shadow DOM rendering correctness and visual appearance of Tailwind styles inside the shadow root cannot be verified programmatically"
  - test: "Move mouse away from a hovered link"
    expected: "Tooltip disappears immediately"
    why_human: "Event timing and DOM removal in a live browser context cannot be verified via static analysis"
  - test: "Hover a link to a page with no OG tags (e.g. raw GitHub file, plain text URL)"
    expected: "Tooltip shows 'No preview available' error state — not a blank box"
    why_human: "Network fetch results and error-state rendering require a live browser environment"
  - test: "Hover a link near the bottom-right viewport edge"
    expected: "Tooltip stays fully inside the visible viewport (flips above link if needed)"
    why_human: "getBoundingClientRect and viewport clamping only execute inside a real browser layout engine"
  - test: "Open DevTools Elements tab, find og-preview-tooltip in body, inspect shadow root"
    expected: "Shadow root contains a style tag and tooltip div; host page styles do not bleed into tooltip appearance"
    why_human: "Shadow DOM boundary and style isolation can only be confirmed visually in DevTools"
---

# Phase 7: Hover Tooltip Verification Report

**Phase Goal:** Users can hover over any link on a page to see an OG preview tooltip without leaving the page
**Verified:** 2026-02-19
**Status:** human_needed — all automated checks pass; 5 items require browser confirmation
**Re-verification:** No — initial verification

Note: Plan 07-03-SUMMARY.md records that a human-verified checkpoint was completed and all six test scenarios were approved on 2026-02-19. The items below are flagged `human_needed` because they are inherently visual/runtime and cannot be confirmed by static analysis. If that human sign-off from 07-03 is accepted as sufficient evidence, this phase can be considered **passed**.

---

## Goal Achievement

### Success Criteria (from ROADMAP.md)

| # | Success Criterion | Status | Evidence |
|---|-------------------|--------|----------|
| 1 | Hovering a link for 300ms triggers a tooltip showing the linked page's OG preview | VERIFIED | `setupHoverDelegation` sets 300ms timer; calls `controller.show(url, rect.left, rect.top, rect.bottom)`; `TooltipApp.show()` calls `sendMessage('getOgData', {url})`; background fetches + parses remote page |
| 2 | Moving the mouse away dismisses the tooltip | VERIFIED | `mouseout` listener calls `controller.hide()`; `TooltipApp.hide()` sets `{phase: 'hidden'}` causing `return null` |
| 3 | While OG data is being fetched, tooltip shows a loading skeleton | VERIFIED | `show()` immediately sets `{phase: 'loading'}`; `OgTooltip` renders `<TooltipSkeleton />` for that phase |
| 4 | When linked page has no OG tags or fetch fails, tooltip shows clear error/empty state | VERIFIED | Both `catch` path and empty-data check (`!(data.title \|\| data.description \|\| data.image)`) set `{phase: 'error'}`; `OgTooltip` renders `<TooltipErrorState />` showing "No preview available" |
| 5 | Tooltip renders inside Shadow DOM and does not leak styles to or from the host page | VERIFIED (automated) / NEEDS HUMAN (visual) | `createShadowRootUi` with `position: 'modal'`; `:host { pointer-events: none !important }` in style.css; `@theme inline` maps shadcn tokens inside shadow root; design tokens scoped to `:host` |

**Score:** 5/5 truths verified at code level (SC5 also needs visual confirmation)

---

## Required Artifacts

### Plan 07-01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `entrypoints/tooltip/style.css` | Tailwind v4 base styles for tooltip shadow root | VERIFIED | Contains `@import 'tailwindcss'`, `@theme inline` with shadcn tokens, `:host { pointer-events: none !important }`, `.og-tooltip-card { pointer-events: auto }`, dark mode via `@media (prefers-color-scheme: dark)` |
| `entrypoints/tooltip/TooltipApp.tsx` | React root wired to controller, manages tooltip visibility | VERIFIED | Full state machine (`hidden/loading/ready/error`), exports `Controller` and `TooltipApp`, mutates `controllerRef.show/hide` on every render |
| `entrypoints/content.tsx` | Content script with cssInjectionMode, shadow host, hover delegation | VERIFIED | Has `cssInjectionMode: 'ui'`, `createShadowRootUi` with `position: 'modal'`, `setupHoverDelegation` with 300ms debounce and child-element mouseout guard |
| `entrypoints/content.ts` | Must be deleted (replaced by .tsx) | VERIFIED DELETED | File confirmed absent |

### Plan 07-02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `entrypoints/tooltip/TooltipApp.tsx` | State machine: hidden/loading/ready/error; calls sendMessage('getOgData') | VERIFIED | Async `show()` with stale-fetch guard (`staleRef` integer counter), calls `sendMessage('getOgData', {url})`, transitions to `ready` or `error` based on response |
| `components/tooltip/OgTooltip.tsx` | Positioning shell: viewport clamping, opacity fade-in | VERIFIED | `useLayoutEffect` two-pass clamping (render invisible → measure → clamp → show), flips above/below based on available space, horizontal clamping |
| `components/tooltip/TooltipSkeleton.tsx` | Loading skeleton (TTIP-03) | VERIFIED | Renders image area placeholder + 3 text skeleton lines via `@/components/ui/skeleton` |
| `components/tooltip/TooltipErrorState.tsx` | Error/empty state display (TTIP-04) | VERIFIED | Renders "No preview available" + "This page has no OG tags or could not be reached." |
| `components/tooltip/TooltipCard.tsx` | OG data display: image, title, description, domain | VERIFIED | Calls `resolveDisplayData(ogData)`, extracts domain, renders image + title + description + domain |

---

## Key Link Verification

### Plan 07-01 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `entrypoints/content.tsx` | `entrypoints/tooltip/TooltipApp.tsx` | `ReactDOM.createRoot` inside `createShadowRootUi onMount` | WIRED | Line 37: `root.render(<TooltipApp controllerRef={controller} />)` |
| `entrypoints/content.tsx` | `controller.show / controller.hide` | `setupHoverDelegation(controller)` | WIRED | Line 46: `setupHoverDelegation(controller)`; function defined lines 50-93 |
| `entrypoints/tooltip/TooltipApp.tsx` | controller ref | `controllerRef.show = show; controllerRef.hide = hide` | WIRED | Lines 52-53: direct mutation on every render |

### Plan 07-02 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `entrypoints/tooltip/TooltipApp.tsx` | `lib/messaging.ts sendMessage('getOgData')` | `sendMessage` call in `show()` callback | WIRED | Line 31: `const data = await sendMessage('getOgData', { url })` |
| `entrypoints/tooltip/TooltipApp.tsx` | `components/tooltip/OgTooltip.tsx` | JSX render in `TooltipApp` return | WIRED | Lines 3, 58-65: imported and rendered for all non-hidden phases |
| `components/tooltip/OgTooltip.tsx` | `components/tooltip/TooltipSkeleton.tsx` | `phase === 'loading'` branch | WIRED | Line 61: `{phase === 'loading' && <TooltipSkeleton />}` |
| `components/tooltip/OgTooltip.tsx` | `components/tooltip/TooltipErrorState.tsx` | `phase === 'error'` branch | WIRED | Line 62: `{phase === 'error' && <TooltipErrorState />}` |
| `components/tooltip/OgTooltip.tsx` | `components/tooltip/TooltipCard.tsx` | `phase === 'ready'` branch | WIRED | Line 63: `{phase === 'ready' && data && <TooltipCard ogData={data} url={url} />}` |

### Background Worker Link

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `entrypoints/background.ts` | `getOgData` message | `onMessage('getOgData', ...)` | WIRED | Lines 20-61: fetches URL, parses HTML, returns `OgData`; handles cache, timeout, content-type checks |

---

## Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| TTIP-01 | User sees OG preview tooltip when hovering any link (300ms delay) | SATISFIED | `setupHoverDelegation` 300ms debounce → `sendMessage('getOgData')` → `OgTooltip` with data |
| TTIP-02 | Tooltip dismisses when mouse moves away from link | SATISFIED | `mouseout` → `controller.hide()` → `phase: 'hidden'` → `return null` |
| TTIP-03 | Tooltip shows loading state while OG data is being fetched | SATISFIED | `phase: 'loading'` set immediately on `show()`; `<TooltipSkeleton />` rendered |
| TTIP-04 | Tooltip shows clear empty/error state when no OG tags or fetch fails | SATISFIED | `catch` path + empty-data check both set `phase: 'error'`; `<TooltipErrorState />` shows "No preview available" |

**All four required IDs (TTIP-01, TTIP-02, TTIP-03, TTIP-04) accounted for and satisfied.**

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `entrypoints/tooltip/TooltipApp.tsx` | 55 | `return null` | INFO | Intentional — correct behavior for `phase === 'hidden'`; not a stub |

No blockers or warnings found.

---

## Notable Deviations from Plan (Not Goal-Blocking)

### 1. Same-origin links NOT filtered

**Plan 07-01 truth:** "Same-origin links and non-http(s) links are silently ignored by the hover handler"

**Actual behavior:** Non-http(s) links are filtered (protocol check remains). Same-origin links are NOT filtered — the `parsed.origin === location.origin` guard was removed.

**Assessment:** This is an improvement aligned with the phase GOAL ("any link on a page"). The ROADMAP success criterion says "Hovering over a link" with no same-origin exclusion. This deviation expands coverage, not reduces it. NOT a gap.

### 2. Controller interface extended to 4 parameters

**Plan signature:** `show(url: string, x: number, y: number): void`

**Actual signature:** `show(url: string, x: number, linkTop: number, linkBottom: number): void`

**Assessment:** Both `linkTop` and `linkBottom` are passed to enable smarter above/below tooltip positioning in `OgTooltip`. All three files (`content.tsx`, `TooltipApp.tsx`, `OgTooltip.tsx`) use the 4-parameter signature consistently. TypeScript passes cleanly. NOT a gap.

---

## Human Verification Required

Plan 07-03 was an explicit human-verification gate. The 07-03-SUMMARY.md records that a user approved all six test scenarios on 2026-02-19. The items below are recorded for completeness — they represent the visual/runtime behaviors that cannot be confirmed by static analysis.

### 1. Loading skeleton visible during fetch

**Test:** Visit a page with external links (e.g., https://news.ycombinator.com), hover any external link for 300ms
**Expected:** Tooltip appears showing grey shimmer skeleton blocks (image placeholder + text lines)
**Why human:** Tailwind CSS rendering inside shadow DOM, skeleton animation, and timing cannot be verified statically

### 2. OG card with image, title, description, domain

**Test:** Continue hovering until skeleton resolves
**Expected:** Tooltip shows the linked page's OG image, title, description, and domain (e.g., "github.com")
**Why human:** Network fetch result, `resolveDisplayData` output, and visual card layout require browser rendering

### 3. Tooltip dismisses immediately on mouse-out

**Test:** Move mouse away from the link
**Expected:** Tooltip disappears immediately with no delay
**Why human:** Event timing and DOM removal require a live browser

### 4. Error state for OG-less pages

**Test:** Hover a link to a plain text page, raw GitHub file, or PDF
**Expected:** Tooltip shows "No preview available" — not a blank box, not a crash
**Why human:** Actual fetch result and empty-data path require a real network request

### 5. Viewport edge clamping

**Test:** Hover a link near the bottom-right corner of the page
**Expected:** Tooltip stays inside the visible viewport (flips above link if needed); does not clip
**Why human:** `getBoundingClientRect()` and layout engine only work in a real browser

### 6. Shadow DOM isolation in DevTools

**Test:** Open DevTools Elements tab, find `og-preview-tooltip` in `<body>`, inspect shadow root
**Expected:** Shadow root present; tooltip card has correct appearance regardless of host page styles
**Why human:** Shadow root boundary and CSS custom property scoping visible only in DevTools

---

## Build Verification

TypeScript (`pnpm typecheck`) passes cleanly with no errors. All five tooltip component files compile without issues. The Controller interface signature change (4 params vs plan's 3) is consistent across all files.

---

## Verdict

All five ROADMAP success criteria are implemented correctly at the code level. The complete wiring chain is verified end-to-end:

```
mouseover (300ms) → controller.show(url, x, linkTop, linkBottom)
  → TooltipApp: setState({phase: 'loading'}) → renders OgTooltip
  → sendMessage('getOgData', {url}) → background fetches + parses HTML
  → setState({phase: 'ready', data}) OR setState({phase: 'error'})
  → OgTooltip routes to TooltipCard OR TooltipErrorState

mouseout → controller.hide() → setState({phase: 'hidden'}) → return null
```

The phase goal — "Users can hover over any link on a page to see an OG preview tooltip without leaving the page" — is achieved by the implemented code. Human visual confirmation (Plan 07-03) was recorded as approved on 2026-02-19.

---

_Verified: 2026-02-19_
_Verifier: Claude (gsd-verifier)_

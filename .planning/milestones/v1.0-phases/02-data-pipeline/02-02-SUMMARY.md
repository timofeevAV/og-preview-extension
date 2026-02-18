---
phase: 02-data-pipeline
plan: 02
subsystem: api
tags: [webext-core-messaging, htmlparser2, fetch, abort-controller, chrome-storage-session, wxt, content-script, service-worker]

# Dependency graph
requires:
  - phase: 02-data-pipeline/02-01
    provides: "OgData types, OG parser (parseOgTags/normalizeOgData/extractOgFromDOM), messaging protocol (sendMessage/onMessage), session cache (getCachedOgData/setCachedOgData)"
provides:
  - "Content script that extracts OG meta tags from the live DOM and responds to getPageOgData messages"
  - "Service worker with fetch+parse pipeline: 8s AbortController timeout, HTML content-type validation, htmlparser2 parsing, session cache"
  - "Full end-to-end message routing: popup -> background getOgData -> remote fetch; popup -> background getPageOgData -> content script DOM read"
affects:
  - 03-popup-ui
  - 07-hover-tooltip

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Service worker message handlers registered synchronously inside defineBackground callback (no awaits before registration)"
    - "fetchWithTimeout: module-level stateless helper using AbortController, clearTimeout in finally block"
    - "Background relays getPageOgData to content script using sendMessage('getPageOgData', { tabId }, tabId) -- third arg routes to specific tab"
    - "Content script returns null (not empty OgData) when zero meta tags found"
    - "Cache only written when ogData.title || ogData.image is truthy (meaningful data guard)"

key-files:
  created: []
  modified:
    - entrypoints/content.ts
    - entrypoints/background.ts

key-decisions:
  - "sendMessage('getPageOgData', { tabId }, tabId) routes background -> content script; third arg is @webext-core/messaging tab routing, not part of message data"
  - "getPageOgData handler in background relays to content script using the same message type -- content script's handler ignores the tabId in data payload"
  - "wxt.config.ts unchanged -- storage permission already present, no new permissions needed"

patterns-established:
  - "Stateless module-level helpers only: no module-level state in service worker (ephemeral)"
  - "All error paths in background return null with console.error logging, never throw to caller"
  - "URL validation via try/catch new URL() before any fetch attempt"

# Metrics
duration: 15min
completed: 2026-02-18
---

# Phase 02 Plan 02: Data Pipeline Entrypoints Summary

**Content script DOM extraction + service worker fetch pipeline with AbortController timeout, htmlparser2 parsing, and session cache, all wired via @webext-core/messaging**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-02-18T00:00:00Z
- **Completed:** 2026-02-18T00:15:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Content script reads all og:* and twitter:* meta tags from the live DOM and returns structured OgData in response to getPageOgData messages
- Service worker handles getOgData with URL validation, 8s AbortController fetch timeout, HTML content-type check, htmlparser2 parse, and session cache write
- Service worker handles getPageOgData by relaying to the content script on the target tab via sendMessage with tab routing
- WXT build succeeds with htmlparser2 fully bundled in background.js (88.2 kB)

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire content script for DOM OG extraction via messaging** - `886f3c1` (feat)
2. **Task 2: Wire service worker with fetch+parse pipeline, cache, and message handling** - `ec85de1` (feat)

## Files Created/Modified
- `entrypoints/content.ts` - Registers getPageOgData onMessage handler; calls extractOgFromDOM + normalizeOgData; returns null if no tags found
- `entrypoints/background.ts` - fetchWithTimeout helper (AbortController, 8s); getOgData handler (cache check, fetch, content-type validation, parse, cache write); getPageOgData relay handler

## Decisions Made
- `sendMessage('getPageOgData', { tabId }, tabId)` — the @webext-core/messaging library routes to a specific tab when the third argument is a tabId number (confirmed from TypeScript types: `ExtensionSendMessageArgs = [arg?: number | SendMessageOptions]`). The data payload `{ tabId }` is also passed through but the content script handler ignores it.
- `wxt.config.ts` left unchanged — `storage` permission was already present from plan 02-01. No new permissions required for fetch or messaging.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. TypeScript compiled cleanly on first attempt for both tasks. Build succeeded immediately with htmlparser2 bundled correctly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Full data pipeline is complete: DOM extraction (content script), remote fetch+parse (service worker), session cache, and type-safe message passing
- Phase 03 popup UI can call `sendMessage('getOgData', { url })` for remote URLs or `sendMessage('getPageOgData', { tabId })` for the current tab's live DOM
- Phase 07 hover tooltip can use the same message interface without additional infrastructure work

---
*Phase: 02-data-pipeline*
*Completed: 2026-02-18*

## Self-Check: PASSED

- FOUND: entrypoints/content.ts
- FOUND: entrypoints/background.ts
- FOUND: .planning/phases/02-data-pipeline/02-02-SUMMARY.md
- FOUND: commit 886f3c1 (Task 1: content script)
- FOUND: commit ec85de1 (Task 2: background service worker)

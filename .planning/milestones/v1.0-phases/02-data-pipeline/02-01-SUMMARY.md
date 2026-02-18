---
phase: 02-data-pipeline
plan: 01
subsystem: api
tags: [htmlparser2, webext-core-messaging, wxt-storage, og-protocol, twitter-cards, browser-extension, chrome-mv3]

# Dependency graph
requires: []
provides:
  - OgData TypeScript interface covering all og:* and twitter:* fields
  - parseOgTags function parsing HTML strings via htmlparser2 (SAX-style, stops at </head>)
  - normalizeOgData mapping raw meta tag Record to typed OgData
  - extractOgFromDOM reading live DOM meta tags via querySelectorAll
  - getEffectiveTitle/Description/Image helpers with Twitter-over-OG fallback logic
  - Type-safe messaging protocol (getOgData, getPageOgData) via @webext-core/messaging
  - Session cache get/set for OgData keyed by URL using wxt/utils/storage with session: prefix
affects: [02-data-pipeline-02, 02-data-pipeline-03, 03-popup, 07-tooltips]

# Tech tracking
tech-stack:
  added:
    - htmlparser2 ^10.1.0 (SAX-style HTML parsing, no Node.js deps, browser-safe)
    - "@webext-core/messaging ^2.3.0 (type-safe extension messaging, same author as WXT)"
  patterns:
    - "OgData interface as canonical data shape across all extension contexts"
    - "Two-path OG extraction: htmlparser2 for fetched HTML (service worker), DOM API for live page (content script)"
    - "Protocol map function syntax for @webext-core/messaging type inference"
    - "session: prefix on wxt/utils/storage keys maps to chrome.storage.session"

key-files:
  created:
    - lib/types.ts
    - lib/og-parser.ts
    - lib/messaging.ts
    - lib/cache.ts
  modified:
    - package.json
    - pnpm-lock.yaml

key-decisions:
  - "Used wxt/utils/storage (not wxt/storage) — correct export path; storage is auto-imported in entrypoints but lib/ files need explicit import from wxt/utils/storage"
  - "Used boolean done flag instead of parser.pause() in parseOgTags — research noted pause() availability in htmlparser2 v10 was uncertain; flag approach is safe and equally performant"
  - "OgProtocolMap uses function syntax (name(data): Return) not ProtocolWithReturn — function syntax is current API, ProtocolWithReturn is deprecated per @webext-core/messaging v2.3.0 type definitions"

patterns-established:
  - "Pattern: Import OgData as type import (import type) in all lib files to avoid runtime overhead"
  - "Pattern: extractOgFromDOM is DOM-only and cannot be called in service worker context"
  - "Pattern: All session cache keys prefixed with session:ogcache: for namespace isolation"

# Metrics
duration: 4min
completed: 2026-02-18
---

# Phase 02 Plan 01: Shared Library Layer Summary

**OgData types, htmlparser2-based OG/Twitter meta tag parser, type-safe @webext-core/messaging protocol, and WXT session cache — four shared lib files consumed by all subsequent phases.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-02-18T10:36:30Z
- **Completed:** 2026-02-18T10:39:46Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Installed htmlparser2 ^10.1.0 and @webext-core/messaging ^2.3.0 as runtime dependencies
- Created `OgData` interface with 18 optional fields covering OG Protocol and Twitter Card specs
- Built `parseOgTags` with a custom htmlparser2 SAX handler (boolean `done` flag stops processing after `</head>`)
- Built `normalizeOgData` mapping raw meta tag keys to typed `OgData` fields with `og:image:url` and `twitter:image:src` fallbacks
- Built `extractOgFromDOM` using `querySelectorAll` for live DOM extraction in content scripts
- Defined type-safe `OgProtocolMap` with `getOgData` and `getPageOgData` messages using function syntax
- Implemented `getCachedOgData` / `setCachedOgData` using `wxt/utils/storage` with `session:ogcache:` prefix

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and create OgData types + OG parser** - `90379c0` (feat)
2. **Task 2: Create messaging protocol and session cache** - `14ded77` (feat)

**Plan metadata:** (see final commit below)

## Files Created/Modified
- `lib/types.ts` - OgData interface (18 optional fields: core OG, image OG, Twitter Card)
- `lib/og-parser.ts` - parseOgTags, normalizeOgData, extractOgFromDOM, 3 getEffective* helpers
- `lib/messaging.ts` - OgProtocolMap + sendMessage/onMessage from defineExtensionMessaging
- `lib/cache.ts` - getCachedOgData / setCachedOgData using wxt/utils/storage session prefix
- `package.json` - added htmlparser2 and @webext-core/messaging to dependencies
- `pnpm-lock.yaml` - lockfile updated

## Decisions Made

- **wxt/utils/storage not wxt/storage**: The plan specified `import { storage } from 'wxt/storage'` but that module path does not exist in the WXT package exports. The correct path is `wxt/utils/storage`, which WXT's auto-import system also uses internally. Fixed during Task 2.

- **Boolean `done` flag instead of `parser.pause()`**: Research noted that `pause()` availability in htmlparser2 v10 was uncertain. Used a `done` boolean checked in `onopentag` to skip processing after `</head>` closes — simpler, safer, identical performance for typical HTML pages.

- **Function syntax for OgProtocolMap**: `ProtocolWithReturn` is marked deprecated in @webext-core/messaging v2.3.0 type definitions. Used the current function syntax (`name(data: T): R`) which the library's `GetDataType`/`GetReturnType` utility types are built for.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed incorrect WXT storage import path**
- **Found during:** Task 2 (Create messaging protocol and session cache)
- **Issue:** Plan specified `import { storage } from 'wxt/storage'` but `wxt/storage` is not in WXT's package exports map. TypeScript error: `Cannot find module 'wxt/storage'`
- **Fix:** Changed import to `wxt/utils/storage` — the correct export path confirmed via WXT package.json exports field. The auto-imports.d.ts confirms this is the source of the `storage` global
- **Files modified:** lib/cache.ts
- **Verification:** `pnpm run typecheck` passes with zero errors
- **Committed in:** `14ded77` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking import path error)
**Impact on plan:** Necessary correctness fix. No scope creep.

## Issues Encountered

None beyond the import path fix documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All four shared lib files are ready for import by Phase 2 entrypoints (service worker and content script)
- `parseOgTags` + `normalizeOgData` ready for use in background.ts fetch pipeline
- `extractOgFromDOM` + `normalizeOgData` ready for use in content.ts
- `sendMessage` / `onMessage` ready for registering handlers in background.ts and sending from content.ts
- `getCachedOgData` / `setCachedOgData` ready for cache-first pattern in service worker

---
*Phase: 02-data-pipeline*
*Completed: 2026-02-18*

## Self-Check: PASSED

- FOUND: lib/types.ts
- FOUND: lib/og-parser.ts
- FOUND: lib/messaging.ts
- FOUND: lib/cache.ts
- FOUND commit: 90379c0 (Task 1)
- FOUND commit: 14ded77 (Task 2)

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start Chrome dev server with HMR
pnpm dev:edge     # Start Edge dev server with HMR
pnpm build        # Production build for Chrome
pnpm build:edge   # Production build for Edge
pnpm zip          # Build + package for Chrome Web Store submission
pnpm typecheck    # TypeScript type check (tsc --noEmit)
pnpm test         # Run Vitest unit tests
```

Build output: `.output/chrome-mv3/`

## Architecture

A Chromium MV3 extension built with WXT + React 19 + TypeScript + Tailwind v4.

### Three Entrypoints

**Background service worker** (`entrypoints/background.ts`)
- Handles two message types: `getOgData` (fetches + parses remote URL OG data via htmlparser2) and `getPageOgData` (relays to the content script on a given tab)
- Uses session storage for caching parsed OG data (`lib/cache.ts`)

**Content script** (`entrypoints/content.tsx`)
- Responds to `getPageOgData` by extracting OG meta tags from the live DOM (`lib/og-parser.ts`)
- Creates one persistent Shadow DOM tooltip host (`og-preview-tooltip`) via WXT's `createShadowRootUi`
- Implements hover delegation with event listeners on `document`; delay configurable via settings
- Reads/subscribes to `chrome.storage.sync` settings; restarts delegation on hoverDelay change

**Popup** (`entrypoints/popup/`)
- React 19 SPA, fixed 380px width
- `App.tsx` orchestrates state: fetches OG data + settings in parallel, renders one of: skeleton → error/empty state → CompactCard + ExpandedView (with previews/metadata tabs) → SettingsPage
- Platform card components in `components/platform/` render pixel-accurate simulations for X, Facebook (desktop + mobile), LinkedIn, iMessage, WhatsApp

### Shared Library (`lib/`)

| File | Purpose |
|------|---------|
| `types.ts` | `OgData` interface (OG + Twitter card fields) |
| `messaging.ts` | Type-safe `OgProtocolMap` via `@webext-core/messaging` |
| `settings.ts` | `getSettings()`, `setSetting()`, `onSettingsChanged()` — chrome.storage.sync |
| `og-parser.ts` | DOM extraction (`extractOgFromDOM`) + htmlparser2 parsing (`parseOgFromHtml`) |
| `og-display.ts` | Resolves display data (Twitter fields fall back to OG equivalents) |
| `cache.ts` | Session storage OG cache keyed by URL |

### Messaging Flow

```
Popup           → getPageOgData  → Background → Content script (DOM extraction)
Tooltip (hover) → getOgData      → Background (fetch + parse remote URL)
```

### Key Patterns

- **`@` alias** resolves to project root (not `src/`) — configured in `wxt.config.ts`
- **OgData tri-state**: `undefined` = loading, `null` = error/restricted page, `OgData` = fetched (may be `{}` if no tags)
- **Slider writes**: `SettingsPage.tsx` uses Radix `onValueCommit` (fires once on release) for storage writes, `onValueChange` updates local state only — prevents `chrome.storage.sync` quota errors
- **Tooltip theme**: applied via `data-theme` attribute on `<og-preview-tooltip>` shadow host; content script syncs on settings change
- **shadcn components** use the `radix-ui` consolidated package (not `@radix-ui/react-*`)

### Known Tech Debt (before Chrome Web Store submission)

- `wxt.config.ts:20` uses `host_permissions: ['<all_urls>']` — must change to `optional_host_permissions` before CWS submission
- `components/theme-provider.tsx` system-preference listener can override explicit user `theme` setting

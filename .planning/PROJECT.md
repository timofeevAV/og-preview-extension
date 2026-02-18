# OG Preview Extension

## What This Is

A Chromium browser extension that lets web developers and content creators instantly inspect how any webpage will appear when shared on social media. It provides pixel-accurate platform previews (X/Twitter, Facebook desktop, Facebook mobile, LinkedIn, iMessage, WhatsApp) in a popup, a metadata inspector with export tools, and OG preview tooltips on link hover — all without leaving the browser.

Shipped v1.0 (2026-02-19): 9 phases, 22 plans, ~2,500 LOC TypeScript/TSX.

## Core Value

See exactly how any page looks when shared on any platform, right now, without posting it.

## Requirements

### Validated (v1.0)

- ✓ Extension popup shows OG previews in platform-specific tabs (X/Twitter, Facebook desktop, Facebook mobile, LinkedIn, iMessage, WhatsApp) — v1.0
- ✓ Platform previews are pixel-accurate simulations of how each platform renders OG cards — v1.0
- ✓ Extension popup has a Metadata tab showing raw OG metadata with missing-field explanations and export tools (copy JSON, download JSON, copy meta snippets) — v1.0
- ✓ Hovering over any link on a page shows a tooltip with that link's OG preview, fetched with 300ms delay — v1.0 (opt-in via Settings)
- ✓ When a page has no OG tags, popup shows a clear empty state indicating which fields are missing — v1.0
- ✓ Works on all Chromium browsers (Chrome, Edge, Brave) via MV3 — v1.0
- ✓ Dark mode support (system preference + explicit theme setting) — v1.0
- ✓ Settings page: hoverPreview toggle, defaultTab, hoverDelay slider, theme selector — v1.0

### Active (v1.1 candidates)

- [ ] Fix `host_permissions` → `optional_host_permissions` before Chrome Web Store submission (CWS review risk)
- [ ] Fix ThemeProvider: respects stored `theme` setting when OS preference changes
- [ ] Platform image validation: dimension/aspect ratio warnings per platform (PLATF-07, PLATF-08)
- [ ] Links to official platform debugger tools (Facebook Sharing Debugger, Twitter Card Validator, LinkedIn Post Inspector) — DEV-01

### Out of Scope

- Firefox support — single Chromium MV3 codebase only
- Prefetching all visible links — too many requests, fetch-on-hover only
- Editable/simulated OG data — read-only display only
- OG tag editor/generator — social crawlers fetch from server, not DOM
- Server-side re-fetch proxy — infrastructure + privacy concerns
- Browsing history of checked pages — storage bloat, privacy implications

## Context

**Tech stack:** WXT + React 19 + TypeScript (strict) + Tailwind v4 + shadcn/ui (radix-ui) + htmlparser2 + @webext-core/messaging
**Target browsers:** Chrome, Edge, Brave via Manifest V3
**Publishing target:** Chrome Web Store (public release)
**User context:** Web developers and content creators checking social share appearance
**Build output:** `.output/chrome-mv3/`

**Known tech debt (post-v1.0):**
- `wxt.config.ts` uses `host_permissions: ['<all_urls>']` instead of `optional_host_permissions` — Phase 01 VERIFICATION.md contained a false positive; must fix before CWS submission
- `ThemeProvider` (`components/theme-provider.tsx`) system-preference listener can override explicit user theme setting
- Dead exports: `getEffectiveTitle/Description/Image` in `lib/og-parser.ts`; `components/ui/empty.tsx` shadcn family

## Constraints

- **Tech**: Manifest V3 only — no Manifest V2 patterns
- **Fetch**: Link tooltips fetch OG data on hover (no background prefetching)
- **Distribution**: Chrome Web Store — must comply with store policies (CWS permission review risk noted above)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fetch on hover for link tooltips | Avoids unnecessary requests on page load | ✓ Good — 300ms delay prevents excessive fetches |
| Pixel-accurate platform simulations | User explicitly wants accurate previews | ✓ Good — 6 platforms implemented |
| All Chromium (not Firefox) | Single codebase, MV3 | ✓ Good — simplifies build pipeline |
| WXT over raw Vite/webpack | HMR, manifest generation, cross-browser targeting | ✓ Good — saved significant scaffolding work |
| optional_host_permissions from day one | Avoid CWS rejection | ⚠️ Revisit — `host_permissions` used instead; fix before CWS submission |
| htmlparser2 + htmlmetaparser for OG parsing | No DOM dependency in service worker | ✓ Good — SAX parser works in service worker context |
| Tailwind v3 (not v4) for popup | Shadow DOM bugs in Tailwind v4 | ✓ Good — v3 stable in shadow DOM; note: popup actually migrated to v4 during Phase 3 |
| Shadow DOM for hover tooltip | Style isolation from host page | ✓ Good — complete isolation confirmed |
| onValueCommit for hoverDelay slider | Reduce chrome.storage.sync writes (40/drag → 1/drag) | ✓ Good — quota error eliminated |
| hoverPreview off by default | Avoid surprising users with unexpected tooltips | ✓ Good — opt-in is the right default |
| Radix UI shadcn components | Rich accessible UI primitives already in WXT ecosystem | ✓ Good — Switch, Select, Slider, Label, Separator, Button all used |

---
*Last updated: 2026-02-19 after v1.0 milestone*

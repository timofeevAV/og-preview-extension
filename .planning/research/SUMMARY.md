# Project Research Summary

**Project:** OG Preview Extension
**Domain:** Chromium Manifest V3 Browser Extension — Open Graph / social card preview for web developers and content creators
**Researched:** 2026-02-18
**Confidence:** HIGH

## Executive Summary

This project builds a Chromium MV3 browser extension that reads Open Graph and Twitter Card metadata from web pages and renders pixel-accurate, platform-specific social card previews. The competitive landscape is fragmented: no existing extension covers more than 4 platforms with accurate rendering, none support iMessage or WhatsApp well, and hover-on-link OG preview is absent from all debugging-focused tools. The recommended approach is WXT (the dominant MV3 framework in 2026) + React 19 + TypeScript + Tailwind CSS v3, with htmlparser2 + htmlmetaparser for DOM-free OG parsing in the service worker. This stack produces small bundles, has excellent HMR, and handles every MV3 architectural constraint cleanly.

The core architectural challenge is MV3's fundamental constraint: the service worker is ephemeral (terminates after 30s idle), content scripts cannot make cross-origin requests, and there is no DOM in the service worker. All OG fetching for remote URLs must route through the service worker; the popup reads OG tags from the active page's DOM via the content script. This message-passing hub pattern is non-negotiable and must be established from day one — retrofitting it is expensive. Shadow DOM encapsulation for tooltip injection and `chrome.storage.session` for caching are similarly foundational decisions that cannot be deferred.

The biggest risk is Chrome Web Store rejection due to broad `host_permissions`. The mitigation is `optional_host_permissions` with a runtime permission request UI — this must be designed into the manifest from the start. The second major risk is the hover-tooltip feature, which combines debounced fetch, AbortController abort-on-leave, service worker relay, Shadow DOM injection, and SPA link detection into a complex subsystem. Research strongly recommends shipping the popup UI first, validating demand, and building the hover tooltip as a separate phase.

## Key Findings

### Recommended Stack

WXT v0.20.17 is the clear choice for this project: Vite-powered builds, file-based entrypoints, auto-generated manifest, built-in HMR for popup/content/background, `wxt zip` + `wxt submit` for Chrome Web Store publishing, and first-class React support via `@wxt-dev/module-react`. It produces ~43% smaller bundles than Plasmo and is actively maintained. React 19 and TypeScript 5.7 are the UI and type layers. **Tailwind CSS must be v3, not v4** — v4 has unfixed Shadow DOM incompatibilities as of February 2026 (`:root` variables don't propagate to `:host`, `@property` rules break, `--spacing` fails). Use `@thedutchcoder/postcss-rem-to-px` to convert rem to px in content script CSS to prevent host page font-size from breaking tooltip layout.

For OG parsing in the service worker (which has no DOM), use `htmlparser2` + `htmlmetaparser` — a pure-JS parsing stack with 53M+ weekly npm downloads that works without `DOMParser`. This eliminates the need for offscreen documents for the primary parsing path. The offscreen document API remains available as a fallback for truly malformed HTML but should not be the default approach.

**Core technologies:**
- **WXT ^0.20.17**: Extension framework — auto-manifest, HMR, multi-context build, store publishing tooling
- **React ^19**: Popup and content script UI — `createRoot` API, Shadow DOM compatible, large ecosystem
- **TypeScript ^5.7**: Type safety across all extension contexts (popup, content script, service worker, shared)
- **Tailwind CSS ^3.4**: Utility-first styling — use v3 specifically; v4 breaks in Shadow DOM environments
- **htmlparser2 ^10.1.0 + htmlmetaparser ^2.1.3**: DOM-free OG tag extraction in service worker
- **pnpm**: Package manager — recommended by WXT, faster and stricter than npm/yarn

### Expected Features

The extension's core value proposition is pixel-accurate, platform-specific card previews inside the browser — something no existing extension delivers well. The competitive gap is clear: ogpreview.app does 8 platforms as a web tool (requiring URL entry, no localhost), Social Share Preview does 4 platforms but lacks iMessage/WhatsApp, and OGMeta covers 4 platforms but is abandoned.

**Must have for v1 (table stakes + primary differentiator):**
- OG + Twitter Card tag parsing from current page DOM — core of every competitor; users expect this
- Tabbed popup UI with platform-specific previews: X/Twitter, Facebook desktop, LinkedIn — top 3 platforms, 80% of use cases
- Raw metadata display tab — developers need to see the raw tag values alongside visual previews
- Missing field indicators with per-field explanation — debugging value that competitors mostly lack
- Copy metadata as JSON — high-frequency utility for developers filing bug reports or sharing configs
- Dark mode support — must be designed from day one (Tailwind + CSS variables); painful to retrofit
- Localhost support — automatic when reading DOM; no special handling needed

**Should have for v1.x (competitive differentiators):**
- Facebook mobile preview — distinct layout from desktop; add after desktop template is validated
- WhatsApp and iMessage previews — underdocumented; add once core platforms are solid
- Image dimension and aspect ratio validation per platform — no competitor does this well
- Platform-specific validation warnings — actionable guidance like "image below 1200x630 minimum for Facebook"
- Suggested meta tag code snippets — show the HTML to add when fields are missing
- Keyboard navigation and accessibility — ARIA labels, full keyboard support in popup

**Defer to v2+ (high complexity or low immediate value):**
- Hover-on-link OG tooltip (content script) — highest complexity, unique differentiator; ship popup first, validate demand
- Links to official platform debugger tools (Facebook Sharing Debugger, Twitter Card Validator, LinkedIn Post Inspector)
- Structured data / JSON-LD display — useful for SEO developers but different feature surface
- Side panel mode (Chrome Side Panel API)

**Anti-features to reject explicitly:**
- OG tag editor/generator — misleading (social crawlers fetch from server, not DOM); recommend external tools instead
- Server-side re-fetch proxy — requires infrastructure, privacy concerns; just link to official debuggers
- Browsing history of checked pages — storage bloat, privacy implications, uncommon use case
- Automatic scanning of all links on a page — performance disaster on link-dense pages

### Architecture Approach

The extension follows a hub-and-spoke architecture with the service worker as the central message router. The popup reads OG tags from the active page via the content script (which has DOM access), while all external URL fetching routes through the service worker (which has CORS bypass via `host_permissions`). These two components never communicate directly. Tooltip injection in the content script uses closed Shadow DOM to prevent CSS bleed in both directions — this is non-negotiable given the extension runs on arbitrary websites.

**Major components:**
1. **Service Worker** (`background.ts`) — central message router; cross-origin fetch; OG parsing via htmlparser2; session cache via `chrome.storage.session`; all event listeners must be registered synchronously at top level
2. **Popup** (`entrypoints/popup/`) — React app; tabbed platform preview UI; requests current-page OG data from content script via `chrome.tabs.sendMessage`; destroyed on every close, reads fresh data each time
3. **Content Script** (`entrypoints/content.ts`) — injected into all pages; reads current page DOM for OG tags; renders hover tooltip via Shadow DOM (Phase 2+); delegates cross-origin fetches to service worker
4. **Shared lib** (`lib/og-parser.ts`, `lib/messaging.ts`) — type-safe message constants, OG parsing wrapper, shared types across all contexts
5. **Platform card components** (`components/previews/`) — one component per platform: `TwitterCard`, `FacebookCard`, `LinkedInCard`, `IMessageCard`, `WhatsAppCard`; each encodes the platform's pixel-accurate dimensions and layout

### Critical Pitfalls

1. **Service worker killed mid-fetch** — Use `AbortController` with 8-10s timeout on all fetches; use `chrome.storage.session` (not global variables) for all caching; handle timeout gracefully in content script with loading then "unavailable" fallback. Must be established in Phase 1.

2. **DOMParser unavailable in service worker** — Use `htmlparser2` + `htmlmetaparser` (pure JS, no DOM dependency) as the primary parsing path. Avoid `new DOMParser()`, avoid `jsdom`. Use offscreen document only as a fallback for truly malformed HTML. Must be decided before building the fetch pipeline.

3. **CSS bleed between content script and host page** — Use closed Shadow DOM (`attachShadow({ mode: 'closed' })`) for all injected UI from day one. Include a full CSS reset inside the shadow root. Never inject global `<style>` tags into the host page. Migrating to Shadow DOM later requires a full rewrite.

4. **Content script CORS block on cross-origin fetch** — All remote URL fetching MUST go through the service worker via `chrome.runtime.sendMessage`. Content scripts inherit the host page's CORS policy. This is the core architectural constraint that shapes all component communication.

5. **Chrome Web Store rejection for broad host_permissions** — Use `optional_host_permissions: ["<all_urls>"]` instead of `host_permissions`. Build a first-run permission request flow triggered by a user gesture. Document the justification explicitly in the CWS listing description. Changing this later requires rearchitecting the onboarding flow.

6. **Hover-triggered fetch DDoS pattern** — Debounce hover events (300-500ms delay); use `AbortController` to cancel in-flight fetches on mouse leave; use event delegation on `document.body` (one listener, not one per `<a>`); cache aggressively in `chrome.storage.session`; limit concurrent fetches to 2-3.

## Implications for Roadmap

Based on combined research, the architecture drives a clear phased sequence: foundation first, then data pipeline, then popup UI, then the more complex content script tooltip. The popup is independent of the hover tooltip and should ship first to validate demand before investing in the highest-complexity feature.

### Phase 1: Foundation and Project Setup
**Rationale:** WXT project initialization, manifest design, permission strategy, and shared constants must all be decided before any feature code is written. The permission strategy (`optional_host_permissions`) shapes the user onboarding flow. Shared message type constants prevent cross-context bugs later.
**Delivers:** Working WXT project with correct manifest, permissions, Tailwind v3 + Shadow DOM CSS config, shared message type constants, and development environment (HMR, Vitest, ESLint/Prettier).
**Addresses:** Table stakes foundation for all subsequent phases.
**Avoids:** CWS rejection (optional_host_permissions from day one), type errors across contexts (shared constants), Tailwind v4 Shadow DOM bugs (pin to v3 in setup).

### Phase 2: OG Data Pipeline
**Rationale:** Both the popup and the tooltip depend on OG tag extraction. The service worker fetch + parse + cache pipeline is the engine. Build and test it in isolation before building any UI that depends on it.
**Delivers:** Service worker that accepts `FETCH_OG` messages, fetches remote URLs with timeout, parses OG + Twitter Card tags using htmlparser2/htmlmetaparser, caches results in `chrome.storage.session`, and returns structured data. Content script page-parser that reads OG tags from the active page's DOM. Unit-tested parsing logic.
**Uses:** htmlparser2, htmlmetaparser, chrome.storage.session, AbortController timeout pattern.
**Avoids:** Service worker killed mid-fetch (timeout + storage-backed cache from day one), DOMParser in service worker (htmlparser2 instead), global variable cache loss (chrome.storage.session).

### Phase 3: Popup UI — Core Platform Previews
**Rationale:** The popup is the primary user surface and the primary differentiator. It depends on the data pipeline (Phase 2) but is independent of the content script tooltip. Shipping this first allows early validation of the core value proposition.
**Delivers:** Fully functional popup with tabbed UI: X/Twitter preview, Facebook desktop preview, LinkedIn preview, Raw Metadata tab, missing field indicators, Copy as JSON button, dark mode. Works on localhost automatically.
**Implements:** Popup React app, platform card components (TwitterCard, FacebookCard, LinkedInCard), popup-to-content-script OG request flow.
**Avoids:** Feature scope creep (defer WhatsApp/iMessage/validation warnings to Phase 4), retrofitting dark mode (designed from day one).

### Phase 4: Extended Platforms and Validation
**Rationale:** Once the core 3-platform popup is validated, expand to the remaining platforms and add validation features. These share the same card component pattern as Phase 3 — lower risk, incremental work.
**Delivers:** Facebook mobile preview, WhatsApp preview, iMessage preview (Apple-style UI). Image dimension and aspect ratio validation per platform. Platform-specific validation warnings. Suggested meta tag code snippets.
**Addresses:** FEATURES.md v1.x items. Closes the gap with ogpreview.app (8 platforms online vs our 7 in-browser).
**Note:** iMessage and WhatsApp specs are the least documented — may need additional research during phase planning.

### Phase 5: Hover Tooltip Content Script
**Rationale:** The highest-complexity feature, deferred until popup UX is proven and demand is validated. Combines hover debouncing, AbortController, Shadow DOM injection, tooltip positioning, SPA link detection via MutationObserver, and service worker relay — each with independent failure modes. Building this after the pipeline is proven reduces integration risk.
**Delivers:** Content script that detects link hover (debounced 300-500ms), sends URL to service worker, renders OG preview tooltip in closed Shadow DOM, dismisses on mouse leave, handles loading/error/empty states gracefully.
**Avoids:** CSS bleed (Shadow DOM), DDoS pattern (debounce + abort + event delegation + cache), SPA link detection failure (MutationObserver for dynamic links).
**Research flag:** This phase warrants `/gsd:research-phase` during planning for tooltip positioning on diverse layouts, MutationObserver patterns for SPA navigation detection, and z-index / stacking context handling.

### Phase 6: Polish, Hardening, and Publishing
**Rationale:** Quality gates before Chrome Web Store submission. Covers edge cases, error states, cross-browser testing, accessibility, and CWS listing preparation.
**Delivers:** Comprehensive error handling (404, timeout, non-HTML responses, no OG tags, malformed OG tags). Loading skeleton states. Full keyboard navigation and ARIA labels. Incognito mode handling. Multi-tab correctness. CWS listing with privacy policy, screenshots, permission justification. Offscreen document fallback for malformed HTML (if needed).

### Phase Ordering Rationale

- Foundation before code because the permission manifest and shared constants shape all subsequent work.
- Data pipeline before UI because both popup and tooltip depend on the same fetch/parse/cache engine.
- Popup before tooltip because the popup is lower-risk, delivers the core value proposition, and allows validating demand before investing in the most complex feature.
- Extended platforms after core platforms because they share the same card component pattern (incremental) and some (WhatsApp/iMessage) have underdocumented specs that benefit from having the platform template infrastructure established first.
- Tooltip as a dedicated phase because it is architecturally independent from the popup and has the most complex interaction between components.
- Polish last because edge cases and CWS prep are best done when all features are implemented.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 5 (Hover Tooltip):** Tooltip positioning on diverse page layouts; MutationObserver patterns for reliable SPA link detection; z-index and stacking context conflicts with host pages; managing the MutationObserver lifecycle across SPA navigations.
- **Phase 4 (WhatsApp/iMessage previews):** Both platforms are underdocumented. WhatsApp card specs require cross-referencing with current rendering behavior. iMessage relies on Apple TN3156 which is sparsely documented. Platform rendering changes frequently for all preview specs.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** WXT setup is well-documented with official guides and working boilerplate. Tailwind v3 + Shadow DOM fix is a known pattern.
- **Phase 2 (Data Pipeline):** htmlparser2 + htmlmetaparser have clear APIs. Service worker message relay is a standard Chrome extension pattern with official documentation.
- **Phase 3 (Popup UI):** React tabbed UI is standard. Platform card dimensions for Twitter/Facebook/LinkedIn are well-documented.
- **Phase 6 (Polish/Publishing):** WXT zip/submit workflow is documented. CWS listing requirements are documented. Standard accessibility patterns apply.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | WXT, React, TypeScript, htmlparser2 all have official docs and active community. Tailwind v4 incompatibility verified against open GitHub issues with confirmed reproduction. Version compatibility matrix verified. |
| Features | MEDIUM-HIGH | Based on thorough competitive survey of 9 extensions and 3 online tools. Platform preview specs sourced from official platform developer docs where available. iMessage and WhatsApp specs are MEDIUM confidence — underdocumented and subject to change. |
| Architecture | HIGH | Based entirely on official Chrome extension documentation. Service worker lifecycle, message passing patterns, Shadow DOM approach, and cross-origin fetch constraints are all first-party documented. |
| Pitfalls | HIGH | Primary pitfalls sourced from official Chrome documentation and official Chrome blog posts (including real-world case studies like eyeo's service worker suspension testing). Community patterns cross-referenced across multiple sources. |

**Overall confidence:** HIGH

### Gaps to Address

- **Platform preview pixel accuracy (WhatsApp, iMessage):** Both platforms render OG cards but publish minimal official specs. Recommended approach: build initial templates from best-available guides (ogpreview.app, Apple TN3156) and plan a visual validation pass against real devices during Phase 4.
- **SPA link detection edge cases:** MutationObserver patterns for detecting dynamically loaded links across React, Vue, Angular, and Next.js apps vary. This needs targeted research during Phase 5 planning.
- **Chrome Web Store review timeline and requirements:** CWS review for extensions with `optional_host_permissions` is faster than `host_permissions`, but specific review criteria for broad-permission extensions are not fully documented. Recommend testing with a staging CWS account before final submission.
- **Tailwind v4 upgrade path:** As of February 2026, v4 is not safe for Shadow DOM. Track tailwindlabs/tailwindcss#15556 and #15799. If resolved, upgrading from v3 to v4 is a future option but not a current concern.
- **Optional permission UX pattern:** The first-run permission request flow (user gesture required for `chrome.permissions.request()`) needs UX design — specifically, when and how to prompt the user without being intrusive or confusing.

## Sources

### Primary (HIGH confidence)
- [WXT Official Docs](https://wxt.dev/) — framework features, React module, content script UI, Shadow DOM, publishing
- [Chrome Extensions Developer Docs](https://developer.chrome.com/docs/extensions/) — service workers, message passing, content scripts, cross-origin requests, offscreen documents, permissions, storage API
- [Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program-policies/) — permission requirements, MV3 requirements, review process
- [Tailwind CSS GitHub Issues #15556, #15799, #16772](https://github.com/tailwindlabs/tailwindcss/issues) — confirmed Shadow DOM incompatibilities in v4
- [htmlparser2 npm](https://www.npmjs.com/package/htmlparser2) — v10.1.0 API, service worker compatibility
- [htmlmetaparser GitHub](https://github.com/blakeembrey/node-htmlmetaparser) — v2.1.3, OG/Twitter/JSON-LD extraction
- [Twitter/X Cards Docs](https://developer.x.com/en/docs/x-for-websites/cards/) — official card type specs and dimensions
- [Apple TN3156: Rich Previews for Messages](https://developer.apple.com/documentation/technotes/tn3156-create-rich-previews-for-messages) — iMessage OG tag usage

### Secondary (MEDIUM confidence)
- [2025 State of Browser Extension Frameworks](https://redreamality.com/blog/the-2025-state-of-browser-extension-frameworks-a-comparative-analysis-of-plasmo-wxt-and-crxjs/) — WXT vs Plasmo vs CRXJS comparison, bundle size data
- [OG Image Sizes 2025 Guide](https://www.krumzi.com/blog/open-graph-image-sizes-for-social-media-the-complete-2025-guide) — platform dimensions for Facebook, Twitter, LinkedIn
- [ogpreview.app WhatsApp specs](https://ogpreview.app/whatsapp) — WhatsApp card rendering behavior
- Chrome Web Store user reviews for Social Share Preview, OGraph Previewer, Open Graph Checker, OGMeta — competitive feature gap analysis
- [Shadow DOM for Chrome Extensions](https://railwaymen.org/blog/chrome-extensions-shadow-dom) — CSS isolation patterns
- [Chromium Extensions Group: DOMParser alternatives](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/Di0Cgfram2k) — regex as alternative to offscreen DOMParser

### Tertiary (LOW confidence)
- [OGMeta Extension GitHub](https://github.com/Narutuffy/ogmeta) — reference architecture only; extension is abandoned but confirms React+Tailwind approach for OG preview per platform

---
*Research completed: 2026-02-18*
*Ready for roadmap: yes*

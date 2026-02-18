# Feature Research

**Domain:** Browser extension -- Open Graph / social card preview for web developers and content creators
**Researched:** 2026-02-18
**Confidence:** MEDIUM-HIGH (based on extensive competitive survey of 10+ extensions and online tools, cross-referenced with user reviews and GitHub repos)

## Competitive Landscape Summary

The OG preview extension space is fragmented. Most extensions do one thing passably but none do everything well. Key competitors surveyed:

| Extension | Users (est.) | Rating | Platforms Previewed | Notable Strength | Notable Weakness |
|-----------|-------------|--------|---------------------|------------------|------------------|
| **Social Share Preview** (Placid.app) | Medium | 4.8 | Facebook, Twitter, LinkedIn, Pinterest | Clean UI, reliable | No WhatsApp/iMessage, tied to Placid ecosystem |
| **OGraph Previewer** | Low | 4.6 | Generic preview only | Lightweight, copy OG data | No per-platform previews, no localhost images |
| **Open Graph Checker** (Coywolf) | Medium | 4.5 | Generic preview only | Privacy-focused, non-cached | Deliberately avoids per-platform previews |
| **OGMeta** (Narutuffy) | Low | N/A | Twitter, Facebook, WhatsApp, LinkedIn | Multi-platform, localhost-friendly | 3 commits, abandoned, React+Webpack stack |
| **Social Media Link Preview** (akzhy) | Low | N/A | Facebook, Twitter, LinkedIn, Discord | Svelte-based, clean | Stale (2021), limited platforms |
| **Open Graph** (ridemountainpig) | Low | N/A | Generic only | TypeScript+Vite, modern stack | No platform-specific previews |
| **Social Preview - Hover Cards** | Low | N/A | Generic hover cards | Hover-on-link preview | Not OG-debugging focused, general link previews |
| **Open Graph Preview** (Firefox) | Low | 4.0 | Generic preview | Cross-browser (Firefox) | Image stretching issues (fixed in 1.0.3) |
| **Localhost OG Debugger** | Low | N/A | OG + Twitter cards | Localhost-focused | Niche use case only |

**Online tools** (not extensions) like opengraph.xyz, metatags.io, and ogpreview.app are more feature-rich (8 platforms on ogpreview.app) but require leaving the page, entering URLs manually, and cannot work with localhost without tunneling.

### Key Gaps in Existing Extensions

1. **No extension covers 7+ platforms** -- most do 0-4. None cover iMessage or WhatsApp with pixel-accurate previews.
2. **No extension shows pixel-accurate, platform-specific card rendering** -- they show generic previews or rough approximations.
3. **Hover-on-link OG preview is nearly nonexistent** in the debugging-focused extensions. Social Preview does hover cards but for general link previews, not OG debugging.
4. **Missing metadata validation** -- most just show what exists, few highlight what is missing and why it matters.
5. **No copy-as-code functionality** -- developers cannot copy suggested meta tag snippets to fix issues.
6. **Localhost support is inconsistent** -- a top user complaint across multiple extensions.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or unusable for its stated purpose.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Read OG meta tags from current page** | Core purpose of the extension. Every competitor does this. | LOW | Parse `<meta property="og:*">` and `<meta name="twitter:*">` from page DOM |
| **Display og:title, og:description, og:image, og:url** | The four fundamental OG properties. Users check these on every page. | LOW | Show raw values with labels |
| **Show Twitter Card meta tags** | Twitter uses its own `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image` alongside OG fallbacks. Developers need both. | LOW | Parse `twitter:*` meta tags; show which values fall back to OG equivalents |
| **Image preview** | Users need to see the actual image, not just the URL string. | LOW | Render `og:image` inline in the popup |
| **Missing tag indicators** | Users need to know what is absent, not just what is present. Core debugging value. Open Graph Checker does this; users praise it. | LOW | Red/warning state for missing required fields: title, description, image, url |
| **Works on the current tab automatically** | Click extension icon, see data immediately. No URL entry required. Users expect zero-friction. | LOW | Content script reads DOM and sends to popup on activation |
| **Extension popup UI** | Standard interaction model for this type of tool. Every competitor uses popup. | LOW | Standard Chrome extension popup; 400-600px wide |
| **Platform-specific card previews (at least Facebook + Twitter)** | This is the project's core promise. ogpreview.app does 8 platforms online; Social Share Preview does 4. Users expect at least the top 2 platforms. | MEDIUM | Requires per-platform CSS/HTML templates with correct aspect ratios and typography |
| **Works on localhost** | Top user complaint across multiple extensions. Developers test OG tags locally before deploying. OGMeta and Localhost OG Debugger exist specifically for this. | LOW | No special handling needed if reading from DOM (not fetching external URL) |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required for basic functionality, but create clear reasons to choose this extension over competitors.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **7-platform pixel-accurate previews** (X/Twitter, Facebook desktop, Facebook mobile, LinkedIn, iMessage, WhatsApp) | No extension covers this many platforms with accurate rendering. ogpreview.app does 8 online but requires URL entry. This would be the single biggest differentiator. | HIGH | Each platform needs its own template with correct dimensions, fonts, border-radius, padding. Facebook desktop vs mobile are different layouts. iMessage and WhatsApp card formats are underdocumented. |
| **Tabbed platform preview UI** | Clean way to show 7 previews without overwhelming the popup. Competitors show either one generic preview or a long scroll. | MEDIUM | Tab bar with platform icons; lazy-render inactive tabs |
| **Content script: hover-on-link OG tooltip** | No OG-debugging extension offers this. Social Preview does generic hover cards but not OG-focused. Fetching OG data for arbitrary links on hover is unique and valuable for content creators browsing their own sites. | HIGH | Requires background service worker fetch (CORS), DOM injection of tooltip, debounced hover handling, loading states. Technical risk around Manifest V3 cross-origin fetch. |
| **Empty state with missing-field diagnosis** | Most extensions show a blank or "no data" message. Showing exactly which fields are missing, with an explanation of what each field does, is debugging gold. | LOW | Checklist of required/recommended OG properties with present/missing status |
| **Copy raw metadata as JSON** | OGraph Previewer offers copying OG data; no extension offers structured JSON export. Developers frequently need to paste OG data into bug reports or Slack messages. | LOW | One-click copy button; format all parsed meta tags as JSON object |
| **Image dimension and aspect ratio display** | Show actual image dimensions and whether they meet platform requirements. No extension does this well. Platforms have specific requirements (1200x630 for Facebook, 1200x628 for Twitter, etc.) | MEDIUM | Fetch image, read naturalWidth/naturalHeight, compare against per-platform recommendations |
| **Validation warnings per platform** | "Image too small for LinkedIn" or "Missing twitter:card tag, will fall back to summary" -- actionable, platform-specific guidance. | MEDIUM | Rule engine mapping OG values against each platform's requirements |
| **Dark mode support** | Developer tools should respect system preferences. Most competitor extensions have no theme support. | LOW | CSS `prefers-color-scheme` media query; design both light and dark variants |
| **Keyboard navigation in popup** | Tab through platforms, copy with keyboard shortcut. Accessibility feature that zero competitors implement. | LOW | Standard focus management, `tabindex`, keyboard event handlers |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems: scope creep, maintenance burden, privacy concerns, or fundamental architectural conflicts.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **OG tag editor / generator** | Developers want to test changes without modifying source code | Extension cannot modify server-side meta tags. Injecting modified tags into the DOM is misleading because social media crawlers fetch from the server, not the DOM. Creates false confidence. Online tools like metatags.io already do this well. | Show a "suggested meta tags" code snippet that developers can copy and add to their source code manually |
| **Server-side re-fetch / "see what Facebook sees"** | Developers want to see what the crawler actually fetches, not just what the DOM shows (SPAs may differ) | Requires a proxy server or external API to fetch pages server-side. Adds infrastructure cost, privacy concerns (sending URLs to a third party), and maintenance burden. Facebook/Twitter/LinkedIn all have their own free debugger tools for this. | Link to official debugger tools (Facebook Sharing Debugger, Twitter Card Validator, LinkedIn Post Inspector) from within the extension |
| **History of previously checked pages** | Developers want to track OG changes over time | Storage bloat, privacy implications (browsing history), sync complexity. Solves an uncommon use case with significant complexity. | Show current page data only. For tracking changes over time, recommend a CI/CD integration or monitoring service. |
| **Automatic scanning of all links on a page** | Content managers want to audit all outbound links | Performance nightmare on link-heavy pages. Fetching OG data for 50+ links simultaneously hammers servers and slows the browser. Potentially triggers rate limiting or IP blocks. | The hover-on-link tooltip solves this incrementally -- check links one at a time as needed |
| **Share directly to social media** | "Preview and share in one click" | Scope creep into social media management territory. Requires OAuth flows for each platform, token storage, permission management. Completely different product category. | Keep the extension focused on previewing/debugging. Users share through the platforms directly. |
| **Custom platform templates** | "Let me add Mastodon/Bluesky/Threads previews" | Template maintenance burden shifts to users who cannot create pixel-accurate previews. Each platform changes its rendering frequently. | Maintain official templates for the 7 supported platforms. Accept community PRs for additional platforms on a case-by-case basis if the extension is open-source. |
| **Notification/badge for pages missing OG tags** | "Alert me when OG tags are broken" | Runs on every page load, consuming resources for a rarely-needed check. Most pages users visit are not their own. Badge/notification fatigue. | Extension activates only when user clicks it. No passive monitoring. |
| **PDF/screenshot export of previews** | "Generate a report for clients" | Adds html2canvas or similar dependency. Bloats extension size. Niche use case. | Users can screenshot the popup natively (Cmd+Shift+4 on macOS, browser screenshot tools). |

## Feature Dependencies

```
[OG Tag Parsing]
    +-- requires --> [Content Script DOM Access]
    +-- enables  --> [Raw Metadata Display Tab]
    +-- enables  --> [Platform-Specific Preview Tabs]
    +-- enables  --> [Missing Field Diagnosis]
    +-- enables  --> [Copy as JSON]
    +-- enables  --> [Validation Warnings]

[Platform-Specific Preview Tabs]
    +-- requires --> [OG Tag Parsing]
    +-- requires --> [Per-Platform HTML/CSS Templates]
    +-- enhances --> [Image Dimension Checking] (show per-platform fit)

[Hover Tooltip on Links]
    +-- requires --> [Content Script Injection]
    +-- requires --> [Background Service Worker Fetch] (cross-origin)
    +-- requires --> [OG Tag Parsing] (reuse parsing logic)
    +-- independent of --> [Popup UI] (separate entry point)

[Image Dimension Checking]
    +-- requires --> [OG Tag Parsing] (need og:image URL)
    +-- enhances --> [Validation Warnings] (per-platform size checks)

[Dark Mode]
    +-- independent of --> all features (CSS-only concern)
    +-- should be --> designed from day 1, not retrofitted
```

### Dependency Notes

- **Hover Tooltip requires Background Service Worker:** Content scripts in Manifest V3 cannot make cross-origin fetches. The content script must message the background service worker to fetch the target URL, parse its HTML for OG tags, and return the result. This is the most technically complex feature.
- **Platform previews require OG parsing first:** The preview templates consume parsed OG data. Build the parser, then the templates.
- **Dark mode must be designed from the start:** Retrofitting dark mode after building all templates is painful. Design the color system with both themes from day one.
- **Popup UI and Content Script (hover tooltip) are independent entry points:** They share the OG parsing logic but have separate UI codebases. Can be built and shipped in separate phases.

## MVP Definition

### Launch With (v1)

Minimum viable product -- what is needed to be useful and distinct from competitors.

- [ ] **OG + Twitter Card tag parsing from current page DOM** -- core functionality, every competitor has this
- [ ] **Tabbed popup UI with platform-specific previews** for X/Twitter, Facebook (desktop), LinkedIn -- the top 3 platforms cover 80% of use cases and are the primary differentiator
- [ ] **Raw metadata display tab** showing all parsed OG/Twitter meta tags with values -- developers want to see the raw data alongside visual previews
- [ ] **Missing field indicators** with explanation of what each missing field affects -- immediate debugging value over competitors that just show blank space
- [ ] **Copy metadata as JSON** -- one-click utility that developers will use daily
- [ ] **Dark mode support** -- design from the start, costs little if planned upfront
- [ ] **Works on localhost** -- table stakes for the developer audience, achieved automatically by reading DOM

### Add After Validation (v1.x)

Features to add once core is working and initial user feedback is collected.

- [ ] **Facebook mobile preview** -- different layout from desktop; add once desktop template is validated
- [ ] **WhatsApp preview** -- underdocumented card format, may need reverse-engineering; add after core platforms are solid
- [ ] **iMessage preview** -- uses only og:title and og:image (per Apple docs); simpler template but needs Apple-style UI
- [ ] **Image dimension and aspect ratio validation** -- show actual dimensions, compare against per-platform recommendations, warn when images are too small or wrong ratio
- [ ] **Platform-specific validation warnings** -- "Image below 1200x630 minimum for Facebook", "Missing twitter:card defaults to summary type"
- [ ] **Keyboard navigation and accessibility** -- full keyboard support in popup, ARIA labels
- [ ] **Suggested meta tag code snippets** -- when fields are missing, show the HTML the developer should add

### Future Consideration (v2+)

Features to defer until product-market fit is established and v1 is stable.

- [ ] **Hover-on-link OG tooltip (content script)** -- highest complexity, highest differentiation, but independent of popup. Ship popup first, validate demand, then build hover tooltips. Technical risk around Manifest V3 cross-origin fetch needs dedicated research.
- [ ] **Links to official platform debugger tools** -- deep links to Facebook Sharing Debugger, Twitter Card Validator, LinkedIn Post Inspector for the current URL
- [ ] **Structured data display** (JSON-LD, Schema.org) -- adjacent to OG tags, useful for SEO developers, but different feature surface
- [ ] **Side panel mode** (Chrome Side Panel API) -- alternative to popup for persistent display while navigating; useful for content audit workflows

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| OG + Twitter Card tag parsing | HIGH | LOW | P1 |
| Raw metadata display tab | HIGH | LOW | P1 |
| Platform preview: X/Twitter | HIGH | MEDIUM | P1 |
| Platform preview: Facebook desktop | HIGH | MEDIUM | P1 |
| Platform preview: LinkedIn | HIGH | MEDIUM | P1 |
| Missing field indicators | HIGH | LOW | P1 |
| Copy metadata as JSON | MEDIUM | LOW | P1 |
| Dark mode | MEDIUM | LOW | P1 |
| Localhost support | HIGH | LOW (free) | P1 |
| Platform preview: Facebook mobile | MEDIUM | MEDIUM | P2 |
| Platform preview: WhatsApp | MEDIUM | MEDIUM | P2 |
| Platform preview: iMessage | MEDIUM | MEDIUM | P2 |
| Image dimension validation | MEDIUM | MEDIUM | P2 |
| Per-platform validation warnings | MEDIUM | MEDIUM | P2 |
| Keyboard navigation | LOW | LOW | P2 |
| Suggested meta tag snippets | MEDIUM | LOW | P2 |
| Hover-on-link OG tooltip | HIGH | HIGH | P3 |
| Links to official debuggers | LOW | LOW | P3 |
| Structured data display | LOW | MEDIUM | P3 |
| Side panel mode | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch -- defines the product and differentiates from competitors
- P2: Should have, add in v1.x -- enhances core value, manageable complexity
- P3: Nice to have, future consideration -- high complexity or niche value, defer until validated

## Competitor Feature Analysis

| Feature | Social Share Preview | OGraph Previewer | Open Graph Checker | OGMeta | ogpreview.app (online) | **Our Extension** |
|---------|---------------------|------------------|-------------------|--------|----------------------|-------------------|
| Platforms previewed | 4 (FB, TW, LI, Pinterest) | 0 (generic only) | 0 (generic only) | 4 (TW, FB, WA, LI) | 8 (FB, TW, LI, Slack, Discord, WA, Telegram, iMessage) | **7 (TW, FB desktop, FB mobile, LI, iMessage, WA)** -- in extension, not online |
| Pixel-accurate templates | Approximate | No | No | Approximate | Yes | **Yes -- primary differentiator** |
| Raw metadata view | No | Yes (copy) | Partial | No | Yes | **Yes (dedicated tab)** |
| Missing field diagnosis | No | No | Yes (basic) | No | Partial | **Yes (detailed, per-field)** |
| Copy as JSON | No | Copy raw text | No | No | No | **Yes** |
| Image validation | No | No | No | No | Basic (1200x630) | **Yes (per-platform)** |
| Hover tooltip on links | No | No | No | No | N/A (web tool) | **Yes (v2)** |
| Localhost support | Unknown | No (user complaint) | Yes | Yes | No (needs tunnel) | **Yes (automatic)** |
| Dark mode | No | No | No | No | N/A | **Yes** |
| Privacy (no data collection) | Unknown | Unknown | Yes (stated) | Unknown | No (URL sent to server) | **Yes (all local, no external calls for popup)** |

## Platform Preview Specifications

Reference dimensions for pixel-accurate templates:

| Platform | Card Width | Image Aspect Ratio | Image Size (recommended) | Shows Domain | Shows Description | Card Style |
|----------|-----------|-------------------|-------------------------|--------------|-------------------|------------|
| X/Twitter (summary_large_image) | ~506px in feed | 1.91:1 | 1200 x 628 | Yes (below title) | Yes (2 lines) | Large image top, text below |
| X/Twitter (summary) | ~506px in feed | 1:1 | 144 x 144 min | Yes | Yes (2 lines) | Small square image left, text right |
| Facebook (desktop) | ~500px in feed | 1.91:1 | 1200 x 630 | Yes (above title) | Yes (1-2 lines) | Large image top, gray metadata bar below |
| Facebook (mobile) | Full-width | 1.91:1 | 1200 x 630 | Yes | Yes (shorter) | Full-bleed image, overlay text |
| LinkedIn | ~552px in feed | 1.91:1 | 1200 x 627 | Yes (below desc) | Yes (2 lines) | Large image top, text below |
| iMessage | Bubble width | ~1.91:1 | 1200 x 630 | No | No | Image with title overlay at bottom |
| WhatsApp | Chat width | ~1.91:1 | 1200 x 630 | Yes (URL) | Yes (short) | Small preview card in chat bubble |

**Confidence:** MEDIUM -- platform rendering changes frequently. These specs are based on 2025 guides and may need updating. iMessage and WhatsApp are the least documented.

## Sources

### Extensions Analyzed (Chrome Web Store / GitHub)
- [Social Share Preview](https://socialsharepreview.com/browser-extensions) -- Placid.app, FB/TW/LI/Pinterest
- [OGraph Previewer](https://chromewebstore.google.com/detail/ograph-previewer/ggcfeakcnodgcmmllfdbmngekljbhiim) -- lightweight, copy OG data
- [Open Graph Checker](https://chromewebstore.google.com/detail/open-graph-checker/lkjaebkedoblfeglnhbgbjbdodjdogpe) -- Coywolf, privacy-focused
- [OGMeta](https://github.com/Narutuffy/ogmeta) -- React, TW/FB/WA/LI (GitHub, 28 stars)
- [Social Media Link Preview](https://github.com/akzhy/social-media-link-preview) -- Svelte (GitHub, 8 stars)
- [Open Graph Chrome Extension](https://github.com/ridemountainpig/open-graph-chrome-extension) -- TypeScript+Vite
- [Social Preview - Hover Cards](https://chromewebstore.google.com/detail/social-preview-link-previ/mfimbaebglkccligldobfbdkmdeklncd) -- hover-based link previews
- [Open Graph Preview (Firefox)](https://addons.mozilla.org/en-US/firefox/addon/open-graph-preview-and-debug/reviews/) -- 12 reviews, image stretching complaints
- [Localhost Open Graph Debugger](https://chromewebstore.google.com/detail/localhost-open-graph-debu/kckjjmiilgndeaohcljonedmledlnkij)

### Online Tools (Broader Feature Context)
- [ogpreview.app](https://ogpreview.app/) -- 8-platform preview, manual tag editing
- [metatags.io](https://metatags.io/) -- preview + meta tag generator, FB/TW/Google
- [opengraph.xyz](https://www.opengraph.xyz/) -- preview + OG image generator

### Platform Specifications
- [OG Image Sizes 2025 Guide](https://www.krumzi.com/blog/open-graph-image-sizes-for-social-media-the-complete-2025-guide) -- FB/TW/LI/Pinterest dimensions
- [Twitter Summary Large Image Docs](https://developer.x.com/en/docs/x-for-websites/cards/overview/summary-card-with-large-image) -- official X developer docs
- [iMessage Link Previews](https://scottbartell.com/2019/03/05/implementing-imessage-link-previews/) -- og:title + og:image only
- [Apple TN3156: Rich Previews for Messages](https://developer.apple.com/documentation/technotes/tn3156-create-rich-previews-for-messages) -- official Apple docs
- [WhatsApp OG Preview Guide](https://ogpreview.app/whatsapp) -- WEBP preference, aspect ratios
- [Open Graph Checker Review](https://coywolf.com/news/social-media/open-graph-checker/) -- deliberate non-feature: no per-platform previews

### User Feedback Sources
- [Firefox Open Graph Preview Reviews](https://addons.mozilla.org/en-US/firefox/addon/open-graph-preview-and-debug/reviews/) -- 12 reviews, image stretching primary complaint
- OGraph Previewer Chrome Web Store reviews -- localhost image preview missing
- Open Graph Checker -- praised for privacy, missing field detection

### Technical References
- [Manifest V3 Cross-Origin Fetch](https://www.chromium.org/Home/chromium-security/extension-content-script-fetches/) -- content scripts cannot fetch cross-origin; must use background service worker
- [Chrome Cross-Origin Network Requests](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests) -- host_permissions pattern for background script fetches

---
*Feature research for: OG Preview Browser Extension*
*Researched: 2026-02-18*

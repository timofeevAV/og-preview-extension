# Architecture Research

**Domain:** Chromium MV3 Browser Extension (OG Preview with Popup UI + Content Script Tooltips)
**Researched:** 2026-02-18
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
MV3 Extension Component Model
==============================

  Browser Chrome (toolbar)
  ┌──────────────────────────────────────────────────────────────────┐
  │  [Extension Icon]  click -->  ┌─────────────────────────────┐   │
  │                               │     POPUP (popup.html)      │   │
  │                               │  - Tabbed OG card previews  │   │
  │                               │  - Platform preview cards   │   │
  │                               │  - Raw metadata tab         │   │
  │                               │  Destroyed on close.        │   │
  │                               └──────────┬──────────────────┘   │
  └──────────────────────────────────────────┼──────────────────────┘
                                             │ chrome.runtime
                                             │ .sendMessage()
                                             v
  Extension Background
  ┌──────────────────────────────────────────────────────────────────┐
  │                    SERVICE WORKER (background.js)                │
  │                                                                  │
  │  - Central message router                                        │
  │  - Cross-origin fetch() (bypasses CORS via host_permissions)     │
  │  - OG metadata parsing (regex on raw HTML)                       │
  │  - Caching layer (chrome.storage.session)                        │
  │  - Coordinates all components                                    │
  │                                                                  │
  │  Lifecycle: event-driven, terminates after 30s idle              │
  └───────┬───────────────────────────────────────────┬──────────────┘
          │ chrome.tabs                               │ chrome.runtime
          │ .sendMessage()                            │ .sendMessage()
          v                                           v
  Web Page Context                           (Optional, only if needed)
  ┌──────────────────────────────────┐   ┌──────────────────────────┐
  │     CONTENT SCRIPT (content.js)  │   │  OFFSCREEN DOCUMENT      │
  │                                  │   │  (offscreen.html)        │
  │  - Injected into all pages       │   │                          │
  │  - Listens for link hover events │   │  - DOMParser for complex │
  │  - Reads current page OG tags    │   │    HTML edge cases       │
  │  - Renders tooltip via Shadow DOM│   │  - Fallback parser only  │
  │  - Messages SW for external URLs │   │                          │
  │                                  │   │  One per profile.        │
  │  Isolated world. No CORS bypass. │   │  Has full DOM API.       │
  └──────────────────────────────────┘   └──────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **manifest.json** | Extension configuration: permissions, content script injection rules, service worker registration, popup definition | Static JSON file, entry point for everything |
| **Service Worker** (background.js) | Central event handler: cross-origin fetching, OG parsing, caching, message routing between popup and content scripts | Single JS file, event-driven, no DOM access |
| **Popup** (popup.html + popup.js) | User-facing UI: tabbed interface showing OG card previews per platform, raw metadata tab | HTML page + JS, destroyed each time popup closes |
| **Content Script** (content.js) | Page interaction: hover detection on links, current-page OG tag extraction, tooltip rendering | JS injected into matching pages, isolated world |
| **Offscreen Document** (offscreen.html) | DOM parsing fallback for edge-case HTML that regex cannot handle | Hidden HTML document, created on-demand, has DOMParser |

## Recommended Project Structure

```
src/
├── manifest.json              # Extension manifest (MV3)
├── background/                # Service worker
│   ├── service-worker.js      # Entry point, event listeners at top level
│   ├── fetcher.js             # Cross-origin fetch logic
│   ├── parser.js              # OG meta tag extraction (regex-based)
│   ├── cache.js               # chrome.storage.session cache layer
│   └── message-router.js      # Message handling dispatch
├── popup/                     # Popup UI
│   ├── popup.html             # Popup entry HTML
│   ├── popup.js               # Popup logic (or framework entry)
│   ├── popup.css              # Popup styles
│   └── components/            # UI components for each platform card
│       ├── twitter-card.js
│       ├── facebook-card.js
│       ├── linkedin-card.js
│       ├── imessage-card.js
│       ├── whatsapp-card.js
│       └── metadata-tab.js
├── content/                   # Content script
│   ├── content.js             # Entry point: hover listeners + messaging
│   ├── hover-detector.js      # Link hover event handling with debounce
│   ├── tooltip.js             # Shadow DOM tooltip creation and positioning
│   ├── tooltip.css            # Tooltip styles (injected into shadow root)
│   └── page-parser.js         # Extract OG tags from current page DOM
├── offscreen/                 # Offscreen document (optional fallback)
│   ├── offscreen.html         # Minimal HTML shell
│   └── offscreen.js           # DOMParser message handler
├── shared/                    # Shared between all contexts
│   ├── constants.js           # Message types, storage keys
│   ├── types.js               # TypeScript interfaces / JSDoc types
│   └── og-schema.js           # OG tag field definitions per platform
└── icons/                     # Extension icons
    ├── icon-16.png
    ├── icon-48.png
    └── icon-128.png
```

### Structure Rationale

- **background/**: Modular service worker code. The entry file (`service-worker.js`) registers all event listeners at the top level (MV3 requirement) and imports handlers. Each concern (fetch, parse, cache, routing) is a separate module for testability.
- **popup/**: Self-contained popup app. Destroyed on every close, so it must fetch fresh data each time or read from `chrome.storage`. Components map 1:1 to platform preview cards.
- **content/**: Injected into web pages. Hover detection is separated from tooltip rendering for maintainability. Shadow DOM encapsulation is critical to prevent style conflicts.
- **shared/**: Constants and type definitions shared across all contexts. Message type enums prevent typo-based bugs in cross-context messaging.
- **offscreen/**: Minimal footprint. Only created when regex parsing fails on malformed HTML. Most OG tag extraction will not need this.

## Architectural Patterns

### Pattern 1: Service Worker as Central Message Hub

**What:** All cross-context communication routes through the service worker. Content scripts and popup never communicate directly -- they both send messages to the service worker, which coordinates responses.

**When to use:** Always in MV3 extensions with multiple UI surfaces. The service worker is the only component that persists across popup opens/closes and can reach all tabs.

**Trade-offs:** Single point of coordination (good for consistency), but the service worker's 30-second idle termination means you cannot rely on in-memory state.

**Example:**
```typescript
// shared/constants.js
const MSG = {
  FETCH_OG: 'FETCH_OG',
  OG_RESULT: 'OG_RESULT',
  GET_CURRENT_PAGE_OG: 'GET_CURRENT_PAGE_OG',
  CURRENT_PAGE_OG: 'CURRENT_PAGE_OG',
};

// content/content.js — content script sends request to service worker
async function onLinkHover(url) {
  const response = await chrome.runtime.sendMessage({
    type: MSG.FETCH_OG,
    url: url,
  });
  showTooltip(response.data);
}

// background/service-worker.js — service worker handles and responds
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === MSG.FETCH_OG) {
    fetchAndParseOG(message.url).then(sendResponse);
    return true; // Keep channel open for async response
  }
});
```

### Pattern 2: Shadow DOM Encapsulation for Tooltip Injection

**What:** Content script creates a custom element with a closed shadow root to render the tooltip. All tooltip CSS is injected inside the shadow root. The host page's styles cannot leak in, and tooltip styles cannot leak out.

**When to use:** Always when injecting visible UI from a content script into arbitrary web pages.

**Trade-offs:** Closed shadow root prevents host page from manipulating your UI (good for security/isolation), but also prevents user custom CSS overrides. Open shadow root allows DevTools inspection (use during development, consider closed for production).

**Example:**
```typescript
// content/tooltip.js
function createTooltip() {
  const host = document.createElement('og-preview-tooltip');
  const shadow = host.attachShadow({ mode: 'closed' });

  // Inject isolated styles
  const style = document.createElement('style');
  style.textContent = tooltipCSS; // imported from tooltip.css as string
  shadow.appendChild(style);

  // Create tooltip content container
  const container = document.createElement('div');
  container.className = 'tooltip-container';
  shadow.appendChild(container);

  document.body.appendChild(host);
  return { host, container };
}
```

### Pattern 3: Regex-Based OG Parsing in Service Worker (No DOM Required)

**What:** Parse OG meta tags using regex directly in the service worker, avoiding the overhead of offscreen documents. OG meta tags follow a predictable `<meta property="og:..." content="...">` pattern that regex handles reliably.

**When to use:** For the primary parsing path. OG tags are well-structured meta elements -- regex is sufficient for 99%+ of real-world pages.

**Trade-offs:** Regex cannot handle deeply malformed HTML or unusual encoding edge cases. For those, fall back to the offscreen document with DOMParser. But the vast majority of pages with OG tags emit them in standard formats.

**Example:**
```typescript
// background/parser.js
function parseOGTags(html) {
  const tags = {};
  // Match <meta property="og:..." content="..."> and twitter:... variants
  const metaRegex = /<meta\s+(?=[^>]*(?:property|name)\s*=\s*["']?(og:|twitter:)([^"'\s>]+)["']?)(?=[^>]*content\s*=\s*["']?([^"'>]+)["']?)[^>]*\/?>/gi;

  let match;
  while ((match = metaRegex.exec(html)) !== null) {
    const prefix = match[1]; // "og:" or "twitter:"
    const key = prefix + match[2]; // e.g., "og:title"
    const value = match[3].trim();
    if (!tags[key]) tags[key] = value; // First occurrence wins
  }
  return tags;
}
```

### Pattern 4: Session-Scoped Caching with chrome.storage.session

**What:** Cache fetched OG data in `chrome.storage.session` keyed by URL. Session storage persists across service worker restarts but clears when the browser session ends. This prevents re-fetching the same URL within a session.

**When to use:** For all fetched OG data. Service worker global variables are lost on termination (30s idle), so in-memory caches are unreliable.

**Trade-offs:** `chrome.storage.session` has a 10 MB quota (expandable to ~unlimited with `setAccessLevel`). Reads are asynchronous but fast. Survives service worker restarts within the same browser session.

**Example:**
```typescript
// background/cache.js
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getCachedOG(url) {
  const key = `og:${url}`;
  const result = await chrome.storage.session.get(key);
  if (result[key] && Date.now() - result[key].timestamp < CACHE_TTL_MS) {
    return result[key].data;
  }
  return null;
}

async function setCachedOG(url, data) {
  const key = `og:${url}`;
  await chrome.storage.session.set({
    [key]: { data, timestamp: Date.now() },
  });
}
```

## Data Flow

### Primary Flow: Link Hover in Content Script --> Tooltip Display

```
User hovers over <a href="https://example.com">
    |
    v
[Content Script: hover-detector.js]
    |  1. Debounce (300ms) to avoid spam
    |  2. Extract href from hovered link
    |  3. Send message to service worker
    |
    v  chrome.runtime.sendMessage({ type: FETCH_OG, url })
[Service Worker: message-router.js]
    |  4. Check chrome.storage.session cache
    |  5. Cache hit? --> Return cached data (skip to step 8)
    |  6. Cache miss? --> fetch(url) with host_permissions CORS bypass
    |
    v  fetch('https://example.com') -- cross-origin, no CORS issue
[Service Worker: parser.js]
    |  7. Extract OG tags via regex from response HTML
    |  8. Store in chrome.storage.session cache
    |  9. Return parsed OG data via sendResponse()
    |
    v  sendResponse({ data: { title, description, image, ... } })
[Content Script: tooltip.js]
    | 10. Receive OG data
    | 11. Render tooltip in Shadow DOM near cursor
    | 12. Show tooltip with fade-in
    |
    v
User sees OG preview tooltip on hover
    |
    v  (mouse leaves link or moves to different link)
[Content Script: tooltip.js]
    | 13. Remove/hide tooltip
```

### Secondary Flow: Popup Requests Current Page OG Data

```
User clicks extension icon
    |
    v
[Popup: popup.js]
    |  1. Popup HTML loads fresh (no persisted state)
    |  2. Get active tab ID via chrome.tabs.query()
    |  3. Send message to content script in active tab
    |
    v  chrome.tabs.sendMessage(tabId, { type: GET_CURRENT_PAGE_OG })
[Content Script: page-parser.js]
    |  4. Query DOM: document.querySelectorAll('meta[property^="og:"]')
    |  5. Also extract twitter:card meta tags
    |  6. Return structured OG data via sendResponse()
    |
    v  sendResponse({ ogTags: { ... } })
[Popup: popup.js]
    |  7. Receive OG data for current page
    |  8. Render platform-specific preview cards
    |  9. Show raw metadata in metadata tab
    |
    v
User sees OG card previews per platform
```

### Tertiary Flow: Popup Requests OG for External URL

```
[Popup: popup.js]
    |  1. User pastes URL in popup input (optional feature)
    |  2. Send to service worker
    |
    v  chrome.runtime.sendMessage({ type: FETCH_OG, url })
[Service Worker]
    |  (Same as hover flow steps 4-9)
    v
[Popup: popup.js]
    |  3. Render preview cards
```

### Key Data Flows Summary

1. **Hover --> Tooltip:** Content script detects hover, asks service worker to fetch + parse, renders result in Shadow DOM tooltip.
2. **Popup --> Current page OG:** Popup asks content script (already injected in active tab) to read DOM directly, renders platform previews.
3. **Popup --> External URL OG:** Popup asks service worker to fetch + parse remote URL, renders platform previews.

## MV3-Specific Architectural Constraints

### Service Worker Lifecycle (Critical)

**Constraint:** The service worker terminates after 30 seconds of inactivity. All global variables are lost on termination.

**Architectural impact:**
- Never store state in global variables. Use `chrome.storage.session` or `chrome.storage.local`.
- All event listeners must be registered synchronously at the top level of the service worker file. Do not register listeners inside `setTimeout`, promises, or conditional blocks.
- Active message handling and `fetch()` calls keep the worker alive, but long chains of async work risk termination mid-operation.
- `return true` from `onMessage` listeners keeps the message channel open for async responses and keeps the worker alive while processing.

### Content Script Isolation

**Constraint:** Content scripts run in an "isolated world" -- they share the DOM with the page but have a separate JavaScript execution context. They cannot make cross-origin requests (subject to the page's CORS policy).

**Architectural impact:**
- Content scripts must delegate all cross-origin fetching to the service worker.
- Content scripts can read the current page's DOM (for extracting OG tags from the active page).
- Content scripts should never expose extension internals to the page's JavaScript context.

### No Persistent Background Page

**Constraint:** MV3 has no persistent background page. The service worker is the replacement, but it is ephemeral.

**Architectural impact:**
- Cannot maintain WebSocket connections or long-lived state.
- Must design for "cold start" on every interaction -- the service worker may need to re-initialize on each message.
- Caching strategy must be storage-backed, not memory-backed.

### Single Offscreen Document Limit

**Constraint:** Only one offscreen document can exist per profile at a time.

**Architectural impact:**
- If using offscreen for DOM parsing, it must be shared/reused, not created per-request.
- Check `chrome.offscreen.hasDocument()` before creating.
- For this project, prefer regex parsing in the service worker and only use offscreen as a fallback for truly malformed HTML.

### Cross-Origin Fetching

**Constraint:** Only the service worker (and popup/options pages) can bypass CORS. Content scripts inherit the host page's CORS policy.

**Architectural impact:**
- All external URL fetching for OG data must go through the service worker.
- `host_permissions` in manifest.json must include the domains to fetch, or use `"<all_urls>"` for universal OG previewing.
- The `fetch()` API is preferred over `XMLHttpRequest` in service workers.

## Anti-Patterns

### Anti-Pattern 1: Storing State in Service Worker Global Variables

**What people do:** Save fetched OG data in a global `Map` or `Object` in the service worker, then read it later.

**Why it's wrong:** The service worker terminates after 30s of inactivity. All global state is lost. The next message will arrive at a fresh worker instance with empty globals.

**Do this instead:** Use `chrome.storage.session` for ephemeral cached data. Use `chrome.storage.local` for persistent user preferences. Always read from storage, never from globals, for any data that must survive worker restarts.

### Anti-Pattern 2: Direct Cross-Origin Fetch from Content Script

**What people do:** Call `fetch('https://external-site.com')` from the content script to get OG data.

**Why it's wrong:** Content scripts are subject to the host page's CORS policy. The fetch will be blocked by the browser unless the target server sends appropriate CORS headers (most sites do not).

**Do this instead:** Content script sends a message to the service worker with the URL. The service worker performs the fetch (which bypasses CORS via `host_permissions`), parses the result, and sends the data back.

### Anti-Pattern 3: Injecting Tooltip with Regular DOM (No Shadow DOM)

**What people do:** Append a `<div>` directly to the page's DOM and style it with regular CSS classes.

**Why it's wrong:** Host page styles bleed into your tooltip (fonts, colors, resets, `!important` rules). Your tooltip styles can also break the host page's layout. Different websites will render your tooltip completely differently.

**Do this instead:** Use Shadow DOM (preferably closed mode) to fully encapsulate tooltip markup and styles. Inject CSS directly into the shadow root via `<style>` elements.

### Anti-Pattern 4: Registering Event Listeners Inside Async Code

**What people do:** Register `chrome.runtime.onMessage.addListener()` inside a promise `.then()` or after an `await`.

**Why it's wrong:** Chrome may fire events before async initialization completes. If the listener is not registered synchronously at the top level, events are dropped and the service worker may not wake up for those events at all.

**Do this instead:** Register all event listeners at the top level of the service worker script, synchronously. Move async initialization inside the handler functions themselves.

### Anti-Pattern 5: Creating Offscreen Documents Per Request

**What people do:** Create a new offscreen document for each HTML parsing request, then close it.

**Why it's wrong:** Only one offscreen document can exist per profile. Creating/destroying it per request is slow and error-prone. If creation races with a pending close, you get errors.

**Do this instead:** Create the offscreen document once when first needed. Reuse it for all subsequent parsing requests via messaging. Only close it when truly idle.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Any website (OG fetch targets) | `fetch()` from service worker, declared in `host_permissions` | Use `"<all_urls>"` or `"https://*/*"` for universal previewing. Returns raw HTML for parsing. |
| OG image URLs | `<img src="...">` in popup/tooltip UI | Images referenced by `og:image` are loaded directly by the browser in popup context. For content script tooltips, load via shadow DOM `<img>` tag (same-origin policy applies to image display, but `<img>` tags are not subject to CORS for display). |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Content Script <--> Service Worker | `chrome.runtime.sendMessage()` / `chrome.runtime.onMessage` | One-time messages. Content script requests OG data; SW responds. Always `return true` for async. |
| Popup <--> Service Worker | `chrome.runtime.sendMessage()` / `chrome.runtime.onMessage` | Popup requests external URL OG data from SW. Same API as content script communication. |
| Popup <--> Content Script | `chrome.tabs.sendMessage(tabId, ...)` from popup | Popup asks content script to extract current page's OG tags from DOM. Popup must first get active tab ID. |
| Service Worker <--> Offscreen Doc | `chrome.runtime.sendMessage()` (both directions) | SW sends HTML string to offscreen doc for DOMParser parsing. Offscreen returns parsed tags. Only if regex parsing fails. |
| Service Worker <--> chrome.storage | `chrome.storage.session.get()` / `.set()` | Cache layer. Async reads/writes. Survives worker restart within session. |

### manifest.json Configuration

```json
{
  "manifest_version": 3,
  "name": "OG Preview",
  "version": "1.0.0",
  "description": "Preview Open Graph cards for any link",

  "permissions": [
    "activeTab",
    "storage",
    "offscreen"
  ],

  "host_permissions": [
    "https://*/*",
    "http://*/*"
  ],

  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  },

  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },

  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/content.js"],
      "css": [],
      "run_at": "document_idle"
    }
  ],

  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

## Build Order Implications

The following build order reflects architectural dependencies:

### Phase 1: Foundation (must come first)

1. **manifest.json** -- everything depends on this
2. **Service worker skeleton** -- message router with handler stubs
3. **Shared constants** -- message types, storage keys

**Rationale:** The service worker is the hub. Nothing else works without it registered and handling messages.

### Phase 2: Core Data Pipeline

4. **Cross-origin fetcher** in service worker
5. **OG tag parser** (regex-based, in service worker)
6. **Cache layer** (chrome.storage.session)

**Rationale:** The fetch-parse-cache pipeline is the engine. Both popup and content script features depend on it.

### Phase 3: Popup UI

7. **Popup HTML/CSS structure** with tab navigation
8. **Current-page OG extraction** (content script page-parser --> popup)
9. **Platform preview card components** (Twitter, Facebook, LinkedIn, iMessage, WhatsApp)
10. **Raw metadata tab**

**Rationale:** Popup is the simplest surface to test the data pipeline end-to-end. Current-page extraction only needs DOM queries (no cross-origin fetch), so it is the fastest path to visible output.

### Phase 4: Content Script Tooltip

11. **Hover detection** with debouncing
12. **Shadow DOM tooltip rendering**
13. **Tooltip positioning** near cursor/link
14. **Integration with service worker** (hover triggers fetch via message)

**Rationale:** Tooltip injection into arbitrary pages is the most complex and fragile feature. Shadow DOM styling, positioning on varied layouts, and debouncing all require careful implementation. Build this after the data pipeline is proven.

### Phase 5: Polish and Edge Cases

15. **Offscreen document fallback** for malformed HTML (if regex fails)
16. **Error handling** (network failures, missing OG tags, invalid URLs)
17. **Loading states** in both popup and tooltip
18. **Rate limiting / throttling** for rapid hover sequences

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Personal use (1 user) | Current architecture is sufficient. No caching concerns. |
| Published extension (1k-10k users) | Add telemetry opt-in. Consider cache size limits. Monitor `host_permissions` review process (broad permissions slow Chrome Web Store review). |
| Popular extension (100k+ users) | Consider a companion web service for OG fetching to reduce direct page fetches. Evaluate using a CORS proxy instead of `<all_urls>` host permissions. This changes the architecture significantly (server component required). |

### Scaling Priorities

1. **First concern:** Chrome Web Store review. `"<all_urls>"` host permissions trigger extra scrutiny. Justify clearly in the extension description and review notes. Consider optional permissions with `chrome.permissions.request()` for a smoother review.
2. **Second concern:** Memory pressure from caching. If users hover many links, `chrome.storage.session` can accumulate. Implement LRU or TTL-based eviction in the cache layer.

## Sources

- [Chrome Extensions Service Workers](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers) -- HIGH confidence, official docs
- [Service Worker Lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) -- HIGH confidence, official docs (30s idle timeout, event registration requirements)
- [Message Passing](https://developer.chrome.com/docs/extensions/develop/concepts/messaging) -- HIGH confidence, official docs (sendMessage, connect, ports)
- [Content Scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts) -- HIGH confidence, official docs (isolated world, limited API access)
- [Cross-Origin Network Requests](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests) -- HIGH confidence, official docs (host_permissions CORS bypass, content script restrictions)
- [Offscreen Documents API](https://developer.chrome.com/docs/extensions/reference/api/offscreen) -- HIGH confidence, official docs (DOM_PARSER reason, one-per-profile limit)
- [Offscreen Documents Blog Post](https://developer.chrome.com/blog/Offscreen-Documents-in-Manifest-v3) -- HIGH confidence, official blog (creation API, lifecycle, messaging)
- [Changes to Cross-Origin Requests in Content Scripts](https://www.chromium.org/Home/chromium-security/extension-content-script-fetches/) -- HIGH confidence, Chromium.org (content scripts cannot bypass CORS)
- [Shadow DOM for Chrome Extensions](https://railwaymen.org/blog/chrome-extensions-shadow-dom) -- MEDIUM confidence, third-party blog (encapsulation best practices)
- [MV3 DOMParser Alternatives](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/Di0Cgfram2k) -- MEDIUM confidence, official Chromium Extensions group (regex as alternative to DOMParser)
- [ogmeta Extension](https://github.com/Narutuffy/ogmeta) -- LOW confidence, reference architecture (React + TailwindCSS approach for OG preview per platform)

---
*Architecture research for: Chromium MV3 Browser Extension (OG Preview)*
*Researched: 2026-02-18*

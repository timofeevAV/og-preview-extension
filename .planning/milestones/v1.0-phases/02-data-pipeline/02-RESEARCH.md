# Phase 2: Data Pipeline - Research

**Researched:** 2026-02-18
**Domain:** Browser extension data extraction, OG metadata parsing, service worker messaging and caching
**Confidence:** HIGH

## Summary

This phase implements the core data pipeline for extracting Open Graph and Twitter Card metadata from web pages. There are two extraction paths: (1) a content script that reads meta tags directly from the current page DOM, and (2) a service worker that fetches arbitrary URLs, parses the HTML response with htmlparser2, and extracts OG/Twitter meta tags. Parsed data is cached in `chrome.storage.session` via WXT's built-in `storage` utility.

**CRITICAL FINDING:** The originally planned `htmlmetaparser` library does NOT extract `og:` prefixed meta tags. Its source code only handles `twitter:`, `al:` (AppLinks), `dc.`, `dcterms.`, and `sailthru.` prefixes -- Open Graph tags are silently discarded. The recommended approach is to use `htmlparser2` directly with a lightweight custom handler (approximately 30 lines) that captures both `og:*` and `twitter:*` meta tags from the `property` and `name` attributes of `<meta>` elements.

**Primary recommendation:** Use htmlparser2 v10 with a custom ~30-line OG/Twitter meta tag handler. Use `@webext-core/messaging` for type-safe content-script-to-service-worker communication. Use WXT's built-in `storage` utility with `session:` prefix for caching.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| htmlparser2 | ^10.1.0 | Parse HTML strings in service worker to extract meta tags | 53M+ weekly downloads, zero Node.js built-in deps, works when bundled for browser, fast SAX-style callback API |
| @webext-core/messaging | ^2.3.0 | Type-safe messaging between content script and service worker | Recommended by WXT docs, same author as WXT (aklinker1), 30K weekly downloads, lightweight |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| WXT `storage` utility | built-in | Cache OG data in `chrome.storage.session` | Always -- auto-imported by WXT, type-safe, supports `session:` prefix |
| WXT `browser` global | built-in | Unified browser API access | Always -- auto-imported, wraps chrome/browser API differences |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| htmlparser2 + custom handler | htmlmetaparser | **Does NOT capture og: tags** -- only twitter, applinks, dublincore. Disqualified. |
| htmlparser2 + custom handler | open-graph-scraper-lite | Depends on cheerio (heavy), 11.3MB unpacked, low downloads (677/wk) |
| htmlparser2 + custom handler | @jcottam/html-metadata | Also depends on cheerio, 88 downloads/wk, overkill for meta-tag-only extraction |
| htmlparser2 + custom handler | Regex-based parsing | Fragile with non-standard HTML, attribute quoting edge cases, entity encoding. Not worth the risk. |
| @webext-core/messaging | chrome.runtime.onMessage raw API | No type safety, manual serialization, boilerplate-heavy |
| @webext-core/messaging | trpc-chrome | Overkill for simple request/response messaging |
| WXT storage utility | Raw chrome.storage.session API | WXT storage is auto-imported, type-safe, and handles key prefixing |

**Installation:**
```bash
pnpm add htmlparser2 @webext-core/messaging
```

## Architecture Patterns

### Recommended Project Structure
```
lib/
├── types.ts              # OgData interface, message protocol map
├── og-parser.ts          # htmlparser2-based OG+Twitter meta tag parser
├── messaging.ts          # @webext-core/messaging protocol definition
└── cache.ts              # WXT storage items for session cache

entrypoints/
├── background.ts         # Service worker: message handler, fetch+parse, cache
└── content.ts            # Content script: DOM meta tag reader
```

### Pattern 1: Type-Safe Message Protocol
**What:** Define a TypeScript protocol map that enforces message types across content script and service worker.
**When to use:** All inter-context messaging.
**Example:**
```typescript
// lib/messaging.ts
// Source: @webext-core/messaging docs
import { defineExtensionMessaging } from '@webext-core/messaging';
import type { OgData } from './types';

interface OgProtocolMap {
  // Content script sends current page's tab URL, background returns OG data
  getOgData(url: string): OgData | null;
  // Content script reads DOM and sends structured data to background
  reportPageOgData(data: { url: string; ogData: OgData }): void;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<OgProtocolMap>();
```

### Pattern 2: Content Script DOM Extraction
**What:** Read og:* and twitter:* meta tags directly from the page DOM using querySelectorAll.
**When to use:** Extracting metadata from the current page (no fetch needed).
**Example:**
```typescript
// Source: Standard DOM API
function extractOgFromDOM(): OgData {
  const data: Record<string, string> = {};

  // OG tags use property attribute
  document.querySelectorAll('meta[property^="og:"]').forEach((el) => {
    const property = el.getAttribute('property');
    const content = el.getAttribute('content');
    if (property && content) {
      data[property] = content;
    }
  });

  // Twitter tags use either name or property attribute
  document.querySelectorAll('meta[name^="twitter:"], meta[property^="twitter:"]').forEach((el) => {
    const name = el.getAttribute('name') || el.getAttribute('property');
    const content = el.getAttribute('content');
    if (name && content) {
      data[name] = content;
    }
  });

  return normalizeOgData(data);
}
```

### Pattern 3: Service Worker Fetch + Parse Pipeline
**What:** Fetch a URL in the service worker (bypassing CORS), parse HTML with htmlparser2, extract meta tags.
**When to use:** Fetching OG data for remote URLs (link previews).
**Example:**
```typescript
// Source: htmlparser2 callback API + Chrome extension fetch behavior
import { Parser } from 'htmlparser2';

function parseOgTags(html: string, baseUrl: string): Record<string, string> {
  const tags: Record<string, string> = {};

  const parser = new Parser({
    onopentag(name, attributes) {
      if (name !== 'meta') return;
      const property = attributes.property || attributes.name;
      const content = attributes.content;
      if (!property || !content) return;
      if (property.startsWith('og:') || property.startsWith('twitter:')) {
        tags[property] = content;
      }
    },
    // Stop parsing after </head> for performance
    onclosetag(name) {
      if (name === 'head') {
        parser.pause();
      }
    },
  }, { decodeEntities: true, lowerCaseTags: true, lowerCaseAttributeNames: true });

  parser.write(html);
  parser.end();
  return tags;
}
```

### Pattern 4: Session Cache with WXT Storage
**What:** Cache parsed OG data using WXT's storage utility with session prefix.
**When to use:** Avoid re-fetching the same URL within a browser session.
**Example:**
```typescript
// Source: WXT storage docs
// lib/cache.ts
import type { OgData } from './types';

// WXT storage with session prefix -- cleared on browser restart
// Cannot use defineItem for dynamic keys, use storage.getItem/setItem directly

const CACHE_PREFIX = 'session:ogcache:';

export async function getCachedOgData(url: string): Promise<OgData | null> {
  return await storage.getItem<OgData>(`${CACHE_PREFIX}${url}`);
}

export async function setCachedOgData(url: string, data: OgData): Promise<void> {
  await storage.setItem(`${CACHE_PREFIX}${url}`, data);
}
```

### Pattern 5: Fetch with AbortController Timeout
**What:** All fetches in the service worker must have a timeout via AbortController.
**When to use:** Every fetch() call in the service worker.
**Example:**
```typescript
async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        // Identify as a bot/preview tool to get proper OG tags
        'Accept': 'text/html',
      },
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

### Anti-Patterns to Avoid
- **Fetching from content scripts:** Content scripts CANNOT make cross-origin requests. All remote fetching MUST go through the service worker.
- **Global variables in service worker:** Service worker is ephemeral (killed after 30s idle). Use `chrome.storage.session` (via WXT `storage`) instead of module-level variables for any state that must survive restarts.
- **Parsing full HTML body:** Stop parsing after `</head>` tag closes. OG/Twitter meta tags are always in `<head>`. Parsing the entire document body wastes CPU.
- **Not handling non-HTML responses:** The fetched URL might return JSON, images, PDFs etc. Always check `Content-Type` header before parsing.
- **Synchronous top-level awaits in service worker:** All event listeners (onMessage, etc.) MUST be registered synchronously at the top level. Async initialization can happen inside handlers.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Message passing | Raw chrome.runtime.onMessage with manual type casting | @webext-core/messaging | Type safety, error serialization, handles response promises correctly |
| Session storage access | Direct chrome.storage.session.get/set with manual key management | WXT `storage` utility with `session:` prefix | Auto-imported, type-safe generics, watch API for reactivity |
| HTML entity decoding | Manual entity decoder | htmlparser2 `{ decodeEntities: true }` option | Handles all HTML entities including numeric, named, and hex |
| Browser API compatibility | Conditional chrome vs browser checks | WXT's `browser` global (auto-imported) | Handles Chrome/Firefox/Safari differences automatically |
| URL validation | Manual regex URL checking | `new URL()` constructor in try/catch | Standard API, handles all edge cases |

**Key insight:** The actual OG tag extraction is simple enough to hand-roll (~30 lines with htmlparser2 callbacks), but messaging, storage, and browser API compatibility have subtle cross-browser edge cases that libraries handle correctly.

## Common Pitfalls

### Pitfall 1: htmlmetaparser Silently Drops OG Tags
**What goes wrong:** You install htmlmetaparser expecting it to parse og:title, og:image, etc., but the result object contains no OG data.
**Why it happens:** htmlmetaparser's source code only processes `twitter:`, `al:`, `dc.`, `dcterms.`, and `sailthru.` prefixes. The `og:` prefix has no matching conditional branch and is silently discarded.
**How to avoid:** Use htmlparser2 directly with a custom `onopentag` handler that explicitly checks for `og:` and `twitter:` prefixes.
**Warning signs:** Result object has `twitter` and `html` keys but no `og` key.

### Pitfall 2: Service Worker Killed Mid-Fetch
**What goes wrong:** Service worker starts a fetch, browser kills it after 30s idle, fetch never completes.
**Why it happens:** Chrome MV3 service workers are ephemeral -- they are terminated after 30 seconds of inactivity.
**How to avoid:** Use AbortController with 8-10 second timeout on all fetches. Never rely on long-running operations in the service worker.
**Warning signs:** Fetch requests silently failing or timing out, inconsistent behavior.

### Pitfall 3: Content Script CORS Restrictions
**What goes wrong:** Content script tries to fetch a cross-origin URL and gets a CORS error.
**Why it happens:** Content scripts run in the web page's origin context and are subject to CORS restrictions. Only the service worker (with host_permissions) can bypass CORS.
**How to avoid:** All remote URL fetching MUST go through the service worker via messaging.
**Warning signs:** "Access to fetch has been blocked by CORS policy" errors in console.

### Pitfall 4: Event Listeners Not Registered Synchronously
**What goes wrong:** Message handler is registered inside an async function or after an await. Messages sent before registration completes are lost.
**Why it happens:** Service worker event listeners must be registered synchronously at the top level during the initial execution.
**How to avoid:** Register `onMessage` handlers at the top level of the `defineBackground` callback, before any async operations.
**Warning signs:** Messages intermittently not received, especially on first load.

### Pitfall 5: chrome.storage.session Not Accessible from Content Scripts
**What goes wrong:** Content script tries to read from session storage and gets an error or undefined.
**Why it happens:** `chrome.storage.session` is NOT exposed to content scripts by default. You must call `chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' })` from the service worker.
**How to avoid:** Either (a) call setAccessLevel in the service worker on startup, or (b) only access session storage from the service worker and use messaging to relay data to content scripts. Option (b) is simpler and recommended.
**Warning signs:** Content script storage operations silently returning null/undefined.

### Pitfall 6: Fetching Non-HTML Content
**What goes wrong:** URL points to an image, PDF, or API endpoint. Trying to parse the response as HTML fails or produces garbage.
**Why it happens:** Not all URLs return HTML content.
**How to avoid:** Check `response.headers.get('content-type')` before parsing. Only parse responses that include `text/html` or `application/xhtml+xml`.
**Warning signs:** Parser producing empty results or errors on certain URLs.

### Pitfall 7: Session Storage Quota (10MB)
**What goes wrong:** After caching many URLs, storage operations start failing.
**Why it happens:** `chrome.storage.session` has a 10MB quota (since Chrome 112).
**How to avoid:** Implement a simple eviction strategy -- limit cache entries (e.g., 200 URLs), remove oldest entries when limit is reached. Store only the normalized OgData structure, not raw HTML.
**Warning signs:** `chrome.runtime.lastError` set after storage operations.

### Pitfall 8: Localhost/Local Dev URLs
**What goes wrong:** Extension cannot fetch OG data from localhost or 127.0.0.1 URLs.
**Why it happens:** Host permissions might not cover localhost, or the local server might not have meta tags.
**How to avoid:** The manifest has `optional_host_permissions: ["<all_urls>"]` which covers localhost. Ensure the content script matches pattern `<all_urls>` (already configured). The fetch in service worker uses the standard fetch API which can reach localhost.
**Warning signs:** Extension works on public URLs but not on local development servers.

## Code Examples

### Complete OG Data Type Definition
```typescript
// lib/types.ts
// Source: Open Graph Protocol (ogp.me) + Twitter Card specification

export interface OgData {
  // Core OG properties
  title?: string;
  description?: string;
  url?: string;
  siteName?: string;
  type?: string;
  locale?: string;

  // Image
  image?: string;
  imageAlt?: string;
  imageWidth?: string;
  imageHeight?: string;
  imageType?: string;

  // Twitter Card overrides (when different from OG)
  twitterCard?: string;       // summary, summary_large_image, app, player
  twitterSite?: string;       // @username
  twitterCreator?: string;    // @username
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  twitterImageAlt?: string;
}
```

### Normalizing Raw Meta Tags to OgData
```typescript
// lib/og-parser.ts
// Source: OG Protocol spec + Twitter Card fallback behavior

// Twitter falls back to OG tags when its own tags are missing
export function normalizeOgData(raw: Record<string, string>): OgData {
  return {
    title: raw['og:title'],
    description: raw['og:description'],
    url: raw['og:url'],
    siteName: raw['og:site_name'],
    type: raw['og:type'],
    locale: raw['og:locale'],
    image: raw['og:image'] || raw['og:image:url'],
    imageAlt: raw['og:image:alt'],
    imageWidth: raw['og:image:width'],
    imageHeight: raw['og:image:height'],
    imageType: raw['og:image:type'],
    twitterCard: raw['twitter:card'],
    twitterSite: raw['twitter:site'],
    twitterCreator: raw['twitter:creator'],
    twitterTitle: raw['twitter:title'],
    twitterDescription: raw['twitter:description'],
    twitterImage: raw['twitter:image'] || raw['twitter:image:src'],
    twitterImageAlt: raw['twitter:image:alt'],
  };
}

// Effective values (Twitter falls back to OG)
export function getEffectiveTitle(data: OgData): string | undefined {
  return data.twitterTitle || data.title;
}

export function getEffectiveDescription(data: OgData): string | undefined {
  return data.twitterDescription || data.description;
}

export function getEffectiveImage(data: OgData): string | undefined {
  return data.twitterImage || data.image;
}
```

### Complete Service Worker Message Handler
```typescript
// entrypoints/background.ts (conceptual structure)
// Source: WXT defineBackground + @webext-core/messaging docs

import { onMessage } from '../lib/messaging';
import { parseOgTags, normalizeOgData } from '../lib/og-parser';
import { getCachedOgData, setCachedOgData } from '../lib/cache';

export default defineBackground(() => {
  // MUST register synchronously at top level
  onMessage('getOgData', async (message) => {
    const url = message.data;

    // 1. Check cache first
    const cached = await getCachedOgData(url);
    if (cached) return cached;

    // 2. Fetch with timeout
    try {
      const response = await fetchWithTimeout(url, 8000);

      // 3. Validate content type
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
        return null;
      }

      // 4. Parse HTML and extract OG tags
      const html = await response.text();
      const rawTags = parseOgTags(html, url);
      const ogData = normalizeOgData(rawTags);

      // 5. Cache result
      if (ogData.title || ogData.image) {
        await setCachedOgData(url, ogData);
      }

      return ogData;
    } catch (error) {
      console.error('Failed to fetch OG data:', url, error);
      return null;
    }
  });
});
```

### DOM Meta Tag Extraction for Content Script
```typescript
// Source: Standard DOM API + OG/Twitter meta tag conventions
function extractOgFromCurrentPage(): Record<string, string> {
  const tags: Record<string, string> = {};

  // OG tags: <meta property="og:..." content="...">
  // Twitter tags: <meta name="twitter:..." content="..."> or <meta property="twitter:..." content="...">
  const metas = document.querySelectorAll(
    'meta[property^="og:"], meta[property^="twitter:"], meta[name^="twitter:"]'
  );

  metas.forEach((meta) => {
    const key = meta.getAttribute('property') || meta.getAttribute('name');
    const content = meta.getAttribute('content');
    if (key && content) {
      tags[key] = content;
    }
  });

  return tags;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| MV2 background pages (persistent) | MV3 service workers (ephemeral) | Chrome 109 (Jan 2023) | Must use storage for state, no global vars, 30s idle timeout |
| chrome.storage.session 1MB limit | 10MB limit | Chrome 112 (Apr 2023) | Adequate for caching hundreds of OG results |
| webextension-polyfill required | WXT built-in browser shim | WXT 0.15+ | No need for separate polyfill package |
| Manual chrome.runtime.onMessage | @webext-core/messaging type-safe wrapper | 2023+ | Type safety, error handling, promise support built-in |
| htmlmetaparser for OG parsing | Custom htmlparser2 handler | N/A (htmlmetaparser never supported og:) | Must write custom handler -- htmlmetaparser only handles twitter:, al:, dc: |

**Deprecated/outdated:**
- **htmlmetaparser for OG extraction:** Despite its README mentioning "rich metadata," it does NOT capture og: prefixed tags. Do not use for this purpose.
- **Global variables in service workers:** Service workers are killed after 30s idle. Any state stored in module-level variables is lost on restart.
- **Content script cross-origin fetch:** As of MV3, content scripts' cross-origin requests are subject to CORS. All cross-origin fetching must go through the service worker.

## Open Questions

1. **Cache eviction strategy**
   - What we know: chrome.storage.session has 10MB limit, no built-in TTL mechanism, data persists until browser restart
   - What's unclear: Whether a simple entry-count limit (e.g., 200) is sufficient, or if we need LRU eviction
   - Recommendation: Start with a simple max-entries limit. Store a timestamp with each entry. On cache miss, if at capacity, remove oldest entry. This is simple and the 10MB limit is generous for structured OG data (~1-5KB per entry).

2. **optional_host_permissions runtime grant flow**
   - What we know: Manifest declares `optional_host_permissions: ["<all_urls>"]`. Service worker can only fetch URLs for which permission has been granted.
   - What's unclear: Whether `activeTab` permission is sufficient for the current tab's URL fetch, or if the user must explicitly grant host permission via `chrome.permissions.request()`
   - Recommendation: For Phase 2, rely on `activeTab` for the current tab (content script DOM extraction). For remote URL fetching, the permission grant flow will need to be implemented (likely in a later phase when popup UI exists). For now, implement the fetch pipeline and handle permission errors gracefully.

3. **htmlparser2 `pause()` method availability**
   - What we know: The Parser class historically had a `pause()` method to stop parsing mid-stream
   - What's unclear: Whether `pause()` is still available in htmlparser2 v10
   - Recommendation: If `pause()` is not available, use a boolean flag in the handler to skip processing after `</head>` is encountered. The performance difference is minimal for typical HTML pages.

## Sources

### Primary (HIGH confidence)
- [htmlparser2 npm](https://www.npmjs.com/package/htmlparser2) - v10.1.0, 53M+ weekly downloads, dependencies verified (no Node built-ins)
- [htmlparser2 GitHub](https://github.com/fb55/htmlparser2) - callback API documentation
- [htmlmetaparser source code](https://raw.githubusercontent.com/blakeembrey/node-htmlmetaparser/main/src/index.ts) - **Verified: og: prefix NOT handled**
- [Chrome storage API docs](https://developer.chrome.com/docs/extensions/reference/api/storage) - session storage 10MB limit, setAccessLevel
- [Chrome network requests docs](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests) - extension service worker CORS bypass with host_permissions
- [WXT messaging guide](https://wxt.dev/guide/essentials/messaging) - recommends @webext-core/messaging
- [WXT storage guide](https://wxt.dev/storage) - session: prefix, defineItem, auto-imported storage global
- [WXT extension APIs](https://wxt.dev/guide/essentials/extension-apis) - browser global, auto-imports
- [OG Protocol spec](https://ogp.me/) - required and optional OG properties
- [@webext-core/messaging npm](https://www.npmjs.com/package/@webext-core/messaging) - v2.3.0, API documentation
- [@webext-core/messaging docs](https://webext-core.aklinker1.io/messaging/installation) - installation and guide

### Secondary (MEDIUM confidence)
- [Twitter/X Card markup](https://developer.x.com/en/docs/x-for-websites/cards/overview/markup) - twitter: meta tag names (page redirected, info from search results)
- [Chrome service worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) - 30s idle timeout behavior

### Tertiary (LOW confidence)
- htmlparser2 `pause()` method in v10 -- not verified against current source, may need runtime testing

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - verified npm packages, read source code for htmlmetaparser disqualification, confirmed htmlparser2 has no Node.js deps
- Architecture: HIGH - patterns based on WXT docs, Chrome extension docs, and verified library APIs
- Pitfalls: HIGH - htmlmetaparser issue verified by reading source code, service worker lifecycle from Chrome docs, CORS from Chrome docs
- OG/Twitter tag fields: HIGH - from official OG Protocol spec and Twitter Card docs

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (stable domain -- browser extension APIs and these libraries are mature)

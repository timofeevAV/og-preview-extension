# Stack Research

**Domain:** Chromium Manifest V3 Browser Extension (OG Preview)
**Researched:** 2026-02-18
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| WXT | ^0.20.17 | Extension framework | The definitive MV3 framework for 2025/2026. Vite-powered, framework-agnostic, file-based entrypoints, auto-generates manifest, built-in HMR for popup/content/background, built-in `wxt zip` and `wxt submit` for Chrome Web Store publishing. Produces ~43% smaller bundles than Plasmo. Actively maintained with regular releases (latest: Feb 2025). |
| React | ^19 | Popup UI rendering | Mature ecosystem, wide developer familiarity, `createRoot` API works cleanly with Shadow DOM for content script UIs. WXT has first-class React support via `@wxt-dev/module-react`. React 19 is production-ready and fully compatible with Chrome extensions. |
| TypeScript | ^5.7 | Type safety | WXT is TypeScript-first with full type declarations. Essential for a multi-context extension (popup, content script, service worker, offscreen document) where message types must be consistent across boundaries. |
| Tailwind CSS | ^3.4 | Utility-first styling | Use v3, NOT v4. Tailwind v4 has significant Shadow DOM compatibility issues: CSS variables use `:root` instead of `:host`, `@property` rules break in shadow DOM, and there is no clean workaround. Tailwind v3 is stable, well-documented, and works with the `postcss-rem-to-px` fix needed for content script Shadow DOM. |
| Vite | ^6 (bundled with WXT) | Build tooling | WXT uses Vite internally. No separate Vite config needed -- WXT's `wxt.config.ts` wraps it. Provides fast HMR, tree-shaking, and the entire Vite plugin ecosystem. |

### HTML Parsing (OG Tag Extraction)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| htmlparser2 | ^10.1.0 | Parse fetched HTML in service worker | The fastest HTML parser (53M+ weekly npm downloads). Works in service workers without DOM access -- pure JS, no DOMParser needed. Callback-based interface means you can extract just `<meta>` tags without parsing the full document tree. Avoids the complexity of offscreen documents for DOM parsing. |
| htmlmetaparser | ^2.1.3 | Extract OG/Twitter/meta from parsed HTML | An htmlparser2 handler purpose-built for extracting Open Graph, Twitter Cards, JSON-LD, and standard HTML metadata. Feed it htmlparser2's parser and get structured OG data back. Eliminates writing custom meta tag extraction logic. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @wxt-dev/module-react | latest | WXT React integration | Always -- configures Vite React plugin, enables JSX/TSX in all entrypoints |
| @thedutchcoder/postcss-rem-to-px | ^1 | Convert rem to px in CSS | Content script Shadow DOM only -- host page font-size makes rem unreliable; convert to px at build time |
| postcss-prefix-selector | ^2 | Scope Tailwind to shadow root | Content script Shadow DOM -- prevents Tailwind reset/base styles from leaking into host page |
| clsx | ^2 | Conditional class names | Popup UI -- lightweight (228B) utility for dynamic Tailwind classes |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| WXT CLI | Dev server, build, zip, submit | `wxt dev` for development with HMR; `wxt build` for production; `wxt zip` for store packaging |
| pnpm | Package manager | Recommended by WXT. Faster installs, strict dependency resolution, smaller node_modules via symlinks |
| ESLint + Prettier | Code quality | Standard setup. Use `@typescript-eslint/parser` for TS files |
| Vitest | Unit testing | Ships with Vite compatibility, works with WXT's build pipeline. Test OG parsing logic and message handlers |

## MV3-Specific Constraints and Solutions

### Service Worker (Background Script)

MV3 replaces persistent background pages with event-driven service workers.

**Constraint:** No DOM access in service workers. `DOMParser`, `document`, `window` are unavailable.

**Solution:** Use `htmlparser2` + `htmlmetaparser` directly in the service worker. These are pure JS parsers that do not require DOM APIs. This is simpler and faster than the offscreen document pattern.

**Why not offscreen documents?** The `chrome.offscreen` API (Chrome 109+, `DOM_PARSER` reason) works but adds complexity: you can only have one offscreen document at a time, it requires message passing between service worker and offscreen document, and it requires a bundled HTML file. Since we only need to parse `<meta>` tags (not render full DOM), `htmlparser2` is the right tool.

### Cross-Origin Fetching

**Constraint:** Content scripts cannot make cross-origin requests to arbitrary URLs.

**Solution:** Content script sends a message to the service worker with the URL to fetch. The service worker makes the `fetch()` call (allowed with `host_permissions`), parses the HTML for OG tags using htmlparser2, and returns structured metadata to the content script.

**Permissions strategy:**
```json
{
  "permissions": ["activeTab", "offscreen"],
  "optional_host_permissions": ["<all_urls>"]
}
```
Use `optional_host_permissions` instead of blanket `host_permissions` to avoid scary install warnings. Request permission at runtime when the user first triggers a link hover. The `activeTab` permission covers reading the current page's OG tags without any host permission.

### No Remote Code

**Constraint:** MV3 prohibits loading or executing remotely hosted JavaScript.

**Solution:** All code (React, Tailwind, parsers) is bundled at build time by WXT/Vite. No CDN imports, no eval(), no remote script loading. WXT handles this automatically.

### Content Security Policy

**Constraint:** MV3 enforces strict CSP. No inline scripts, no `unsafe-eval`.

**Solution:** WXT generates CSP-compliant output. React and Tailwind are compiled to static JS/CSS bundles. No runtime code generation needed.

## Installation

```bash
# Initialize project
pnpm dlx wxt@latest init og-preview-extension --template react

# Core dependencies
pnpm install react react-dom
pnpm install htmlparser2 htmlmetaparser
pnpm install clsx

# Dev dependencies
pnpm install -D @wxt-dev/module-react
pnpm install -D tailwindcss@3 postcss autoprefixer
pnpm install -D @thedutchcoder/postcss-rem-to-px
pnpm install -D @types/react @types/react-dom
pnpm install -D typescript
pnpm install -D vitest @testing-library/react @testing-library/jest-dom
pnpm install -D eslint prettier @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

## Project Structure (WXT Convention)

```
og-preview-extension/
  entrypoints/
    popup/               # Popup UI (React app)
      index.html
      main.tsx
      App.tsx
      style.css
    background.ts        # Service worker (fetch + parse OG)
    content.ts           # Content script (hover tooltips)
    content/             # Content script UI components
      App.tsx
      style.css
  components/            # Shared React components
    previews/
      TwitterCard.tsx
      FacebookCard.tsx
      LinkedInCard.tsx
      IMessageCard.tsx
      WhatsAppCard.tsx
  lib/
    og-parser.ts         # htmlparser2 + htmlmetaparser wrapper
    messaging.ts         # Type-safe message passing utilities
  assets/                # Icons, static assets
  wxt.config.ts          # WXT configuration
  tailwind.config.ts     # Tailwind v3 config
  postcss.config.cjs     # PostCSS with rem-to-px for content scripts
  tsconfig.json
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| WXT | Plasmo | Only if you need Plasmo's specific features like CSUI framework or its messaging SDK. Plasmo is heavier (~800KB vs ~400KB output), uses Parcel (2-3x slower builds), and appears to be entering maintenance mode as of 2026. |
| WXT | CRXJS Vite Plugin | Only if you want minimal abstraction and direct Vite control. CRXJS nearly got archived in 2025 due to maintenance issues. v2.3.0 (Dec 2025) shows revival, but long-term commitment is uncertain. |
| WXT | Manual Vite + manifest.json | Only for very simple extensions. You lose auto-manifest generation, HMR for content scripts, multi-browser build support, and publish tooling. Not worth it for a project of this complexity. |
| React | Svelte | If bundle size is the absolute top priority and the team knows Svelte well. Svelte compiles away the runtime, producing smaller bundles. However, WXT's HMR is optimized for React (Svelte gets full reloads), React's ecosystem is larger, and content script Shadow DOM integration has more React examples and tooling. |
| React | Vanilla JS/HTML | For trivial popups only. This extension has tabbed UI, multiple platform previews, and content script tooltips -- too much UI complexity for vanilla. |
| Tailwind v3 | Tailwind v4 | When shadow DOM compatibility is resolved upstream. Track tailwindlabs/tailwindcss#15556 and #15799. As of Feb 2026, v4 is NOT safe for content script shadow DOM injection. |
| htmlparser2 | Offscreen Document + DOMParser | When you need full DOM manipulation of fetched pages (e.g., running querySelectorAll with complex selectors, manipulating DOM trees). For meta tag extraction, htmlparser2 is simpler and faster. |
| htmlparser2 | linkedom | When you need a full DOM-like API in the service worker. linkedom is heavier but provides document.querySelector etc. Overkill for meta tag extraction. |
| htmlparser2 | Regex parsing | Never. HTML parsing with regex is fragile, breaks on edge cases, and is a maintenance nightmare. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Manifest V2 | Deprecated. Chrome stopped accepting new MV2 extensions. MV2 extensions being disabled in stable Chrome. | Manifest V3 (WXT handles this) |
| webpack | Slower builds, more complex configuration, no native HMR for extensions. | Vite (via WXT) |
| Plasmo (for new projects) | Entering maintenance mode, Parcel bundler is 2-3x slower than Vite, larger output bundles. | WXT |
| CRXJS | Maintenance uncertainty -- nearly archived in 2025. Even with revival, risky for production. | WXT |
| Tailwind CSS v4 | Shadow DOM incompatibility: `:root` variables don't propagate to shadow DOM, `@property` rules break, `--spacing` utility fails. No official fix as of Feb 2026. | Tailwind CSS v3.4 |
| jsdom | Too heavy for service workers (~2MB), designed for Node.js, not browsers. Google's own docs acknowledge it doesn't work in browsers out of the box. | htmlparser2 |
| `<all_urls>` in host_permissions | Triggers scary "Read and change all your data on all websites" warning at install. Users abandon installs. | `optional_host_permissions` with runtime permission requests |
| innerHTML for rendering fetched content | XSS vulnerability. Never inject fetched HTML directly into the DOM. | Parse with htmlparser2, extract only structured data, render via React components |

## Stack Patterns by Variant

**If building tooltip content script UI:**
- Use WXT's `createShadowRootUi` with `cssInjectionMode: "ui"`
- Use `@thedutchcoder/postcss-rem-to-px` to convert Tailwind's rem units to px
- This prevents host page font-size from breaking your tooltip layout
- Style isolation is automatic via Shadow DOM

**If reading OG tags from the CURRENT page (no fetch needed):**
- Use content script to read `document.querySelectorAll('meta[property^="og:"]')` directly
- No permissions needed beyond `activeTab`
- Send extracted data to popup via `chrome.runtime.sendMessage`

**If reading OG tags from a REMOTE page (fetch needed):**
- Content script sends URL to service worker via `chrome.runtime.sendMessage`
- Service worker calls `fetch(url)` (requires host permission for that URL)
- Service worker parses response HTML with htmlparser2 + htmlmetaparser
- Service worker sends structured OG data back to content script

**If publishing to Chrome Web Store:**
- Use `wxt zip` to create distribution package
- Use `wxt submit init` to configure Chrome Web Store API credentials
- Use `wxt submit --chrome-zip .output/chrome-mv3.zip` to submit
- Set up GitHub Actions for automated submissions on release tags

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| WXT ^0.20.17 | Vite 5-6, React 18-19, TypeScript 5.x | WXT pins its own Vite version internally |
| React 19 | @types/react ^19, react-dom ^19 | createRoot API only (ReactDOM.render removed) |
| Tailwind CSS 3.4 | PostCSS 8, autoprefixer 10 | Do NOT upgrade to v4 until shadow DOM issues resolved |
| htmlparser2 10.x | htmlmetaparser 2.x | htmlmetaparser is a handler for htmlparser2's Parser |
| @wxt-dev/module-react | WXT ^0.20, React 18-19 | Configures Vite's React plugin automatically |
| Chrome MV3 | Chrome 109+ (offscreen), Chrome 88+ (base MV3) | Target Chrome 109+ to have offscreen as fallback option |

## Sources

- [WXT Official Site](https://wxt.dev/) -- Framework features, version 0.20.17, project structure, content script UI modes, publishing workflow (HIGH confidence)
- [WXT GitHub Releases](https://github.com/wxt-dev/wxt/releases) -- Version timeline, recent features (HIGH confidence)
- [WXT Frontend Frameworks Guide](https://wxt.dev/guide/essentials/frontend-frameworks) -- React module setup, `@wxt-dev/module-react` configuration (HIGH confidence)
- [WXT Content Script UI Guide](https://wxt.dev/guide/key-concepts/content-script-ui.html) -- Shadow root UI, CSS injection modes, `createShadowRootUi` API (HIGH confidence)
- [WXT Publishing Guide](https://wxt.dev/guide/essentials/publishing.html) -- `wxt zip`, `wxt submit`, Chrome Web Store env vars (HIGH confidence)
- [Chrome Cross-Origin Network Requests](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests) -- host_permissions, fetch in service workers, security (HIGH confidence)
- [Chrome Offscreen API Reference](https://developer.chrome.com/docs/extensions/reference/api/offscreen) -- DOM_PARSER reason, limitations, Chrome 109+ (HIGH confidence)
- [Chrome MV3 Overview](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3) -- Service workers, no remote code, declarativeNetRequest (HIGH confidence)
- [Chrome Declare Permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions) -- optional_host_permissions, minimal permissions (HIGH confidence)
- [Chrome Message Passing](https://developer.chrome.com/docs/extensions/develop/concepts/messaging) -- runtime.sendMessage, content script relay pattern (HIGH confidence)
- [htmlparser2 on npm](https://www.npmjs.com/package/htmlparser2) -- v10.1.0, 53M weekly downloads, fastest HTML parser (HIGH confidence)
- [htmlmetaparser on GitHub](https://github.com/blakeembrey/node-htmlmetaparser) -- v2.1.3, OG/Twitter/JSON-LD extraction, htmlparser2 handler (HIGH confidence)
- [2025 State of Browser Extension Frameworks](https://redreamality.com/blog/the-2025-state-of-browser-extension-frameworks-a-comparative-analysis-of-plasmo-wxt-and-crxjs/) -- WXT vs Plasmo vs CRXJS comparison, bundle sizes, maintenance status (MEDIUM confidence)
- [Top 5 Chrome Extension Frameworks 2026](https://extensionbooster.com/blog/best-chrome-extension-frameworks-compared/) -- Framework rankings, feature comparison (MEDIUM confidence)
- [Tailwind v4 Shadow DOM Issue #15556](https://github.com/tailwindlabs/tailwindcss/discussions/15556) -- :root vs :host, CSS variable scoping (HIGH confidence)
- [Tailwind v4 Shadow DOM Issue #15799](https://github.com/tailwindlabs/tailwindcss/issues/15799) -- --spacing broken in shadow DOM (HIGH confidence)
- [Tailwind v4 @property Shadow DOM Issue #16772](https://github.com/tailwindlabs/tailwindcss/discussions/16772) -- box-shadow fails due to @property reliance (HIGH confidence)
- [WXT + React + shadcn + Tailwind boilerplate](https://github.com/imtiger/wxt-react-shadcn-tailwindcss-chrome-extension) -- Proves the WXT+React+Tailwind+shadcn stack works (MEDIUM confidence)
- [Chrome Web Store MV3 Requirements](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements) -- No remote code, code discernibility (HIGH confidence)
- [Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies) -- Publishing requirements, 2-step verification (HIGH confidence)

---
*Stack research for: Chromium MV3 Browser Extension (OG Preview)*
*Researched: 2026-02-18*

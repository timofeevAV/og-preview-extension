# Phase 7: Hover Tooltip - Research

**Researched:** 2026-02-18
**Domain:** WXT content script Shadow DOM UI, Tailwind v4 in shadow roots, tooltip hover lifecycle, React component injection
**Confidence:** HIGH

---

## Summary

This is the highest-complexity phase. It combines five distinct technical concerns: (1) injecting a React component via WXT's Shadow DOM isolation API, (2) applying Tailwind v4 styles inside the shadow root, (3) attaching event listeners to all links on any host page, (4) tooltip positioning with viewport boundary clamping, and (5) a debounced hover lifecycle with async data fetching.

The good news is that WXT 0.20.17 (the version installed in this project) already handles the two most feared problems: it automatically replaces `:root` with `:host` in Tailwind-generated CSS, and it automatically moves `@property` and `@font-face` rules out of the shadow root and injects them into the document `<head>`. This means Tailwind v4 utilities including `border`, `shadow-*`, and `ring-*` work inside the shadow root without any additional workarounds, provided `cssInjectionMode: 'ui'` is set in `defineContentScript`.

The tooltip should NOT use WXT's built-in `position: 'overlay'` for placement — that mode positions relative to the shadow host anchor element. Instead, use a single persistent shadow host appended to `<body>` with `position: modal` (which creates a fixed, full-viewport overlay), then position the actual React tooltip element via inline `style` using coordinates computed from the link's `getBoundingClientRect()` + viewport clamping logic inside the React component.

**Primary recommendation:** Use `createShadowRootUi` with `cssInjectionMode: 'ui'`, mount once to `<body>`, pass tooltip state via a React ref-backed controller, and handle all hover logic in the content script's main() using event delegation on `document`.

---

## Critical Finding: Tailwind v4 + WXT 0.20.17 Shadow DOM Status

**This is the most important factual finding in this research.**

The phase brief says "Tailwind v3 installed (NOT v4) due to Shadow DOM bugs." This is incorrect based on the actual codebase. The installed version is `tailwindcss@4.1.18` with `@tailwindcss/vite@4.1.18`. The `style.css` uses `@import 'tailwindcss'` (v4 syntax).

The concern about v4 shadow DOM bugs is legitimate, but WXT 0.20.17 already mitigates it. Here is the exact behavior verified from the installed source at `node_modules/wxt/dist/utils/content-script-ui/shadow-root.mjs`:

```javascript
// 1. :root → :host replacement happens automatically
const entryCss = await loadCss();
css.push(entryCss.replaceAll(":root", ":host"));

// 2. @property and @font-face rules are split out and injected into document.head
const { shadowCss, documentCss } = splitShadowRootCss(css.join("\n").trim());
// documentCss goes to document.head; shadowCss stays in shadow root
```

From `node_modules/wxt/dist/utils/split-shadow-root-css.mjs`:
```javascript
const AT_RULE_BLOCKS = /(\s*@(property|font-face)[\s\S]*?{[\s\S]*?})/gm;
```

**Conclusion:** `@property` rules (which Tailwind v4 uses for `border`, `shadow-*`, `ring-*`) are automatically moved to the document. `:root` theme variables are automatically converted to `:host`. No manual CSS workaround is needed when using `cssInjectionMode: 'ui'`.

**Confidence:** HIGH (verified from installed source code)

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| wxt | 0.20.17 (installed) | `createShadowRootUi` for isolated Shadow DOM injection | WXT's official API for content script UI |
| react | ^19.2.4 (installed) | Tooltip React component rendering | Already the project's UI framework |
| react-dom | ^19.2.4 (installed) | `ReactDOM.createRoot` inside shadow root | Pairs with react |
| tailwindcss | ^4.1.18 (installed) | Utility classes for tooltip styling | Already used in project; works with WXT 0.20.17 |
| @webext-core/messaging | ^2.3.0 (installed) | `sendMessage('getOgData', { url })` to fetch OG data | Already wired up in background.ts |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @webext-core/isolated-element | (transitive dep of wxt) | Underlying Shadow DOM element creation | Used internally by createShadowRootUi, not directly |

### Not Needed
- **floating-ui / popper.js** — Would be ideal for tooltip positioning in a normal web context, but adds complexity when operating inside a Shadow DOM where the reference element is outside the shadow. Manual `getBoundingClientRect` + viewport clamping is simpler and sufficient.
- **Twind** — Runtime CSS-in-JS for shadow DOM. Not needed since WXT 0.20.17 already handles the Tailwind v4 + shadow root compatibility.

**Installation:** No new packages required. All dependencies are already installed.

---

## Architecture Patterns

### Recommended Project Structure
```
entrypoints/
├── content.ts                    # EXISTING — extend this file
└── tooltip/                      # NEW — tooltip-specific files
    └── TooltipApp.tsx            # React root: tooltip state + rendering

components/
└── tooltip/
    ├── OgTooltip.tsx             # Main tooltip shell (position + visibility)
    ├── TooltipCard.tsx           # OG data display (reuse popup card pattern)
    ├── TooltipSkeleton.tsx       # Loading skeleton
    └── TooltipErrorState.tsx     # Error/empty state
```

### Pattern 1: Single Persistent Shadow Host with Internal State Controller

**What:** Create one `createShadowRootUi` instance at content script load time, append to `<body>`. React component inside manages its own visibility via state. The content script's hover event listeners call a controller function (exposed via a ref or module-level variable) to show/hide the tooltip.

**Why this approach:** WXT's `createShadowRootUi` is async and fetches CSS via network. It must not be called on every hover. Create once, reuse for all tooltips.

**Example:**
```typescript
// entrypoints/content.ts
import './tooltip/style.css';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import ReactDOM from 'react-dom/client';
import { TooltipApp } from './tooltip/TooltipApp';

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',    // REQUIRED: injects CSS into shadow root, not manifest
  runAt: 'document_idle',

  async main(ctx) {
    // Phase 2 message handler — keep existing
    onMessage('getPageOgData', (_message) => { /* ... existing ... */ });

    // Create one persistent shadow host in body
    const ui = await createShadowRootUi(ctx, {
      name: 'og-preview-tooltip',
      position: 'modal',   // position: fixed full-viewport; tooltip positions itself internally
      onMount: (container) => {
        const wrapper = document.createElement('div');
        container.append(wrapper);
        const root = ReactDOM.createRoot(wrapper);
        const controller = { show: (_url: string, _x: number, _y: number) => {}, hide: () => {} };
        root.render(<TooltipApp controllerRef={controller} />);
        return { root, controller };
      },
      onRemove: ({ root }) => {
        root.unmount();
      },
    });
    ui.mount();

    // Hover event delegation — attach to document, not to each link
    setupHoverListeners(ui);
  },
});
```

**Why `position: 'modal'`:** Sets `position: fixed; top: 0; left: 0; right: 0; bottom: 0` on the internal positioned element. The React tooltip inside uses `position: fixed` with computed coordinates. This avoids the tooltip being clipped by the host page's stacking context or `overflow: hidden` containers.

### Pattern 2: Event Delegation for Hover Detection

**What:** Attach one `mouseover` and one `mouseout` listener to `document` (or `document.body`). Filter events to only act on `<a href="...">` targets. Use `setTimeout` for 300ms delay, `clearTimeout` on mouseout.

**Why event delegation:** The page may have thousands of links and dynamic content. Attaching per-element listeners is expensive and breaks on dynamically added links. One delegated listener on `document` handles all links including future ones.

```typescript
function setupHoverListeners(ui: ShadowRootContentScriptUi) {
  let hoverTimer: ReturnType<typeof setTimeout> | null = null;
  let activeUrl: string | null = null;

  function getLinkTarget(e: MouseEvent): HTMLAnchorElement | null {
    const target = (e.target as Element).closest('a[href]');
    if (!target) return null;
    const href = (target as HTMLAnchorElement).href;
    // Only external HTTP(S) links — skip same-page anchors, javascript:, mailto:, etc.
    try {
      const url = new URL(href);
      if (url.origin === location.origin) return null;
      if (!['http:', 'https:'].includes(url.protocol)) return null;
    } catch {
      return null;
    }
    return target as HTMLAnchorElement;
  }

  document.addEventListener('mouseover', (e: MouseEvent) => {
    const link = getLinkTarget(e);
    if (!link) return;
    const href = link.href;
    if (href === activeUrl) return; // already showing for this URL

    // Cancel any pending timer
    if (hoverTimer) clearTimeout(hoverTimer);
    ui.mounted?.controller.hide();

    hoverTimer = setTimeout(() => {
      const rect = link.getBoundingClientRect();
      ui.mounted?.controller.show(href, rect.left, rect.bottom);
      activeUrl = href;
      hoverTimer = null;
    }, 300);
  });

  document.addEventListener('mouseout', (e: MouseEvent) => {
    const link = getLinkTarget(e);
    if (!link) return;
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      hoverTimer = null;
    }
    // Only hide if mouse actually left the link (not moved to a child element)
    const related = e.relatedTarget as Element | null;
    if (!link.contains(related)) {
      ui.mounted?.controller.hide();
      activeUrl = null;
    }
  });
}
```

**Critical:** Use `mouseover` + `mouseout` (bubble) not `mouseenter` + `mouseleave` (don't bubble), because event delegation requires bubbling events.

### Pattern 3: Tooltip Viewport Clamping

**What:** Before rendering the tooltip at computed coordinates, clamp the position so it stays inside the viewport.

```typescript
function clampTooltipPosition(
  anchorLeft: number,
  anchorBottom: number,
  tooltipWidth: number,
  tooltipHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  margin = 8
): { x: number; y: number } {
  let x = anchorLeft;
  let y = anchorBottom + margin;

  // Flip above if not enough space below
  if (y + tooltipHeight > viewportHeight - margin) {
    y = anchorBottom - tooltipHeight - margin * 2;
  }

  // Clamp horizontal
  x = Math.max(margin, Math.min(x, viewportWidth - tooltipWidth - margin));

  // Clamp vertical (last resort)
  y = Math.max(margin, Math.min(y, viewportHeight - tooltipHeight - margin));

  return { x, y };
}
```

### Pattern 4: TooltipApp State Machine

**What:** React component managing tooltip state: `hidden` | `loading` | `ready` | `error`. The controller object is passed out through `onMount` so the content script's event listeners can call `show(url, x, y)` and `hide()`.

```typescript
// entrypoints/tooltip/TooltipApp.tsx
import { useState, useCallback, useRef } from 'react';
import { sendMessage } from '@/lib/messaging';
import { OgTooltip } from '@/components/tooltip/OgTooltip';
import type { OgData } from '@/lib/types';

type TooltipState =
  | { phase: 'hidden' }
  | { phase: 'loading'; url: string; x: number; y: number }
  | { phase: 'ready'; url: string; x: number; y: number; data: OgData }
  | { phase: 'error'; url: string; x: number; y: number };

interface Controller {
  show: (url: string, x: number, y: number) => void;
  hide: () => void;
}

export function TooltipApp({ controllerRef }: { controllerRef: Controller }) {
  const [state, setState] = useState<TooltipState>({ phase: 'hidden' });
  const fetchAbortRef = useRef<AbortController | null>(null);

  const show = useCallback(async (url: string, x: number, y: number) => {
    // Cancel any in-flight fetch
    fetchAbortRef.current?.abort();
    fetchAbortRef.current = new AbortController();

    setState({ phase: 'loading', url, x, y });

    try {
      const data = await sendMessage('getOgData', { url });
      // If a newer show() was called before this resolves, abort signal fires
      if (fetchAbortRef.current.signal.aborted) return;
      setState(data ? { phase: 'ready', url, x, y, data } : { phase: 'error', url, x, y });
    } catch {
      if (!fetchAbortRef.current.signal.aborted) {
        setState({ phase: 'error', url, x, y });
      }
    }
  }, []);

  const hide = useCallback(() => {
    fetchAbortRef.current?.abort();
    setState({ phase: 'hidden' });
  }, []);

  // Wire controller to the passed-in ref object so event listeners can call it
  controllerRef.show = show;
  controllerRef.hide = hide;

  if (state.phase === 'hidden') return null;

  return (
    <OgTooltip x={state.x} y={state.y} phase={state.phase} data={'data' in state ? state.data : undefined} />
  );
}
```

**Note on `sendMessage` abort:** `@webext-core/messaging` v2.3.0 does not support AbortSignal natively. The abort pattern above sets a flag on the local `AbortController` — it does not cancel the background fetch. It only prevents stale state updates. The background service worker fetch will complete but the result will be discarded.

### Pattern 5: Separate CSS File for Tooltip Content Script

**What:** The existing `entrypoints/content.ts` uses no CSS import (it only handles messaging). The new tooltip extension must import its own CSS file. WXT looks for a CSS file named after the entrypoint at `content-scripts/{entrypoint}.css`. With `cssInjectionMode: 'ui'`, the CSS is loaded via `browser.runtime.getURL('/content-scripts/content.css')`.

**Key constraint:** If the tooltip logic is added to the existing `entrypoints/content.ts`, the CSS import must be added there. If a new `entrypoints/tooltip.content.ts` is created, it gets its own CSS. Either approach works.

**Recommended:** Add tooltip logic to the existing `entrypoints/content.ts` to avoid a second content script registration, and import the tooltip CSS at the top.

```typescript
// entrypoints/content.ts (extended)
import './tooltip/style.css'; // ADD THIS — triggers cssInjectionMode: 'ui' bundling
```

The tooltip CSS must include `@import 'tailwindcss'` to get all utility classes.

### Anti-Patterns to Avoid

- **Creating shadow root on every hover:** `createShadowRootUi` is async and fetches CSS via network. Call once at content script init.
- **Attaching listeners to each `<a>` element:** Use event delegation on `document`. Avoid `querySelectorAll('a')` loops.
- **Using `mouseenter` for delegation:** `mouseenter` does not bubble — use `mouseover` instead.
- **Position: 'overlay' for tooltip:** WXT's overlay mode is anchor-relative and uses `position: absolute`. For a fixed tooltip that floats above the page, use `position: 'modal'` and control coordinates in React.
- **Fetching on every `mouseover`:** Only trigger fetch AFTER the 300ms timer fires. Never on raw mouseover events.
- **Using rem units in tooltip CSS:** rem is relative to the host page's `html` font-size. If the host page sets `font-size: 10px`, your tooltip text shrinks. Use `px` units directly in the tooltip CSS, or use Tailwind's default utility classes which use rem (accept the minor sizing variance) — test on a few representative pages.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Shadow DOM + style isolation | Custom shadow root creation | `createShadowRootUi` from WXT | Handles CSS loading, `:root`→`:host`, `@property` extraction, event isolation |
| CSS delivery into shadow root | Manual `adoptedStyleSheets` injection | `cssInjectionMode: 'ui'` in `defineContentScript` | WXT does the fetch + injection automatically |
| OG data fetching | Direct fetch in content script | `sendMessage('getOgData', { url })` to background | Background worker already has fetch + timeout + cache pipeline |
| Tooltip positioning library | None | Manual `getBoundingClientRect` + viewport clamping | Floating UI works great in normal web contexts but requires reference elements to be in the same DOM tree; shadow DOM complicates this |

**Key insight:** The service worker messaging pipeline from Phase 2 (`getOgData`) is exactly what the tooltip needs — it fetches the target URL's HTML, parses OG tags, caches the result, and returns `OgData | null`. The content script calls this message and gets back structured data.

---

## Common Pitfalls

### Pitfall 1: WXT CSS Not Loaded into Shadow Root
**What goes wrong:** Tailwind classes have no effect inside the shadow root. Components render without any styling.
**Why it happens:** Developer forgets to set `cssInjectionMode: 'ui'` on the content script, OR forgets to import the CSS file in the content script entrypoint. WXT only loads CSS into the shadow root when both conditions are met.
**How to avoid:** `defineContentScript({ cssInjectionMode: 'ui', ... })` AND `import './tooltip/style.css'` at the top of the entrypoint.
**Warning signs:** No styles visible in shadow DOM. Check DevTools → Elements → the shadow host element → ShadowRoot → check for `<style>` tag inside.

### Pitfall 2: `@property` Rules and Broken Borders/Shadows
**What goes wrong:** Tailwind `border-*`, `shadow-*`, `ring-*` classes don't apply visually inside the shadow root.
**Why it happens:** Tailwind v4 uses `@property` declarations for these utilities. `@property` has no effect inside shadow DOM per W3C spec.
**How to avoid:** WXT 0.20.17 already handles this automatically via `splitShadowRootCss`. However, this only works with `cssInjectionMode: 'ui'`. If CSS is loaded via manifest mode, the split does NOT happen.
**Warning signs:** `border` class applied but no border visible. Inspect document `<head>` — should contain a `<style wxt-shadow-root-document-styles="...">` tag with `@property` rules.

### Pitfall 3: stale tooltip after rapid link hopping
**What goes wrong:** User moves mouse quickly from link A → link B → link C. Tooltip shows data from link A for link C's position.
**Why it happens:** Multiple `setTimeout` instances or unaborted async fetches race.
**How to avoid:** On every `mouseover` that hits a new link: (1) `clearTimeout` any pending timer, (2) call `controller.hide()` to dismiss current tooltip, (3) start new timer. In `TooltipApp.show()`, abort previous fetch controller before starting new fetch.
**Warning signs:** Tooltip text does not match hovered link URL.

### Pitfall 4: Mouse Entering Child Element Hides Tooltip
**What goes wrong:** User hovers a link containing an `<img>` or `<span>`. Mouse moves from `<a>` to `<img>` (child). `mouseout` fires on the `<a>`, hiding the tooltip immediately.
**Why it happens:** `mouseout` fires even when moving to a child element. `e.relatedTarget` is the child element.
**How to avoid:** In `mouseout` handler, check `link.contains(e.relatedTarget)`. Only hide if the related target is NOT a descendant of the link.
**Warning signs:** Tooltip flickers on links with images or formatted content.

### Pitfall 5: Tooltip Rendered Outside Viewport
**What goes wrong:** Hovering links in the bottom-right corner renders the tooltip partially off-screen.
**Why it happens:** Simple `left: rect.left; top: rect.bottom` positioning without boundary checking.
**How to avoid:** Apply viewport clamping using `window.innerWidth` and `window.innerHeight` after the tooltip renders. Use a two-pass approach: render invisible first (`opacity: 0`), measure tooltip dimensions via `getBoundingClientRect()`, then apply clamped position and make visible. Or use fixed dimensions (e.g., `width: 320px`, `max-height: 200px`) and clamp purely by math.
**Warning signs:** Part of tooltip is cut off at viewport edges.

### Pitfall 6: `mouseover` Fires on Every Child Element
**What goes wrong:** Rapid `mouseover` events fire as mouse moves across child elements within a link, triggering multiple timers.
**Why it happens:** `mouseover` bubbles from every child element within the link.
**How to avoid:** In `mouseover` handler, check `href === activeUrl` — if it matches the currently showing tooltip, do nothing. Only restart the timer if the URL changed.
**Warning signs:** Multiple concurrent timers and redundant OG fetch requests.

### Pitfall 7: Content Script CSS Conflicts with Existing content.ts
**What goes wrong:** Adding `cssInjectionMode: 'ui'` to the existing `content.ts` changes its behavior. If content.ts did NOT have `cssInjectionMode` before, it defaulted to `'manifest'` which adds CSS to `manifest.json`'s `css` array.
**Why it happens:** Changing injection mode changes where CSS is loaded from.
**How to avoid:** Since the existing `content.ts` imports NO CSS files (it only handles messaging), adding `cssInjectionMode: 'ui'` is safe — there is no existing CSS to redirect.
**Warning signs:** Not applicable here because current content.ts has no CSS import.

---

## Code Examples

Verified patterns from official sources and installed source code:

### Full Content Script Setup (WXT + React + Shadow DOM)
```typescript
// entrypoints/content.ts
// Source: WXT official docs + verified shadow-root.mjs source

import './tooltip/style.css'; // Required for cssInjectionMode: 'ui'
import ReactDOM from 'react-dom/client';
import { onMessage } from '@/lib/messaging';
import { extractOgFromDOM, normalizeOgData } from '@/lib/og-parser';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import { TooltipApp } from './tooltip/TooltipApp';

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',  // CRITICAL: loads CSS into shadow root, not manifest
  runAt: 'document_idle',

  async main(ctx) {
    // Existing Phase 2 handler — keep as-is
    onMessage('getPageOgData', (_message) => {
      const rawTags = extractOgFromDOM();
      if (Object.keys(rawTags).length === 0) return null;
      return normalizeOgData(rawTags);
    });

    // Tooltip: single persistent shadow host
    const controller = { show: (_u: string, _x: number, _y: number) => {}, hide: () => {} };
    const ui = await createShadowRootUi(ctx, {
      name: 'og-preview-tooltip',
      position: 'modal',
      onMount: (container) => {
        const wrapper = document.createElement('div');
        container.append(wrapper);
        const root = ReactDOM.createRoot(wrapper);
        root.render(<TooltipApp controllerRef={controller} />);
        return root;
      },
      onRemove: (root) => root?.unmount(),
    });
    ui.mount();
    setupHoverDelegation(controller);
  },
});
```

### Tooltip CSS File
```css
/* entrypoints/tooltip/style.css */
/* Source: Tailwind v4 setup per project convention */

@import 'tailwindcss';

/* Override :host reset from WXT — re-apply box-sizing */
:host {
  box-sizing: border-box;
  /* pointer-events: none allows mouse events to pass through the full-viewport overlay */
  pointer-events: none;
}

/* Tooltip card itself must have pointer-events so user can hover onto it */
.og-tooltip-card {
  pointer-events: auto;
}
```

**Important:** The tooltip shadow host covers the full viewport (position: modal). Set `pointer-events: none` on `:host` so all mouse events pass through to the underlying page. Only the visible tooltip card div should have `pointer-events: auto`.

### OgTooltip Positioning Component
```typescript
// components/tooltip/OgTooltip.tsx
import { useRef, useLayoutEffect, useState } from 'react';

const TOOLTIP_WIDTH = 320;
const MARGIN = 8;

interface OgTooltipProps {
  x: number;
  y: number;
  phase: 'loading' | 'ready' | 'error';
  data?: OgData;
}

export function OgTooltip({ x, y, phase, data }: OgTooltipProps) {
  const [pos, setPos] = useState({ left: x, top: y + MARGIN, visible: false });
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const { height } = ref.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = Math.max(MARGIN, Math.min(x, vw - TOOLTIP_WIDTH - MARGIN));
    let top = y + MARGIN;
    if (top + height > vh - MARGIN) top = y - height - MARGIN;
    top = Math.max(MARGIN, top);

    setPos({ left, top, visible: true });
  }, [x, y]);

  return (
    <div
      ref={ref}
      className="og-tooltip-card fixed z-[2147483647] w-[320px] bg-card text-card-foreground rounded-lg border shadow-md overflow-hidden"
      style={{
        left: pos.left,
        top: pos.top,
        opacity: pos.visible ? 1 : 0,
        transition: 'opacity 0.1s ease',
      }}
    >
      {phase === 'loading' && <TooltipSkeleton />}
      {phase === 'error' && <TooltipErrorState />}
      {phase === 'ready' && data && <TooltipCard ogData={data} />}
    </div>
  );
}
```

### Hover Event Delegation
```typescript
// Source: standard DOM event delegation pattern

function setupHoverDelegation(controller: { show: Function; hide: Function }) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let activeUrl: string | null = null;

  document.addEventListener('mouseover', (e: MouseEvent) => {
    const link = (e.target as Element).closest('a[href]') as HTMLAnchorElement | null;
    if (!link) return;

    let url: string;
    try {
      const parsed = new URL(link.href);
      if (!['http:', 'https:'].includes(parsed.protocol)) return;
      if (parsed.origin === location.origin) return; // skip same-site
      url = parsed.href;
    } catch { return; }

    if (url === activeUrl) return; // already showing this URL

    if (timer) clearTimeout(timer);
    if (activeUrl) controller.hide();

    timer = setTimeout(() => {
      const rect = link.getBoundingClientRect();
      controller.show(url, rect.left, rect.bottom);
      activeUrl = url;
      timer = null;
    }, 300);
  });

  document.addEventListener('mouseout', (e: MouseEvent) => {
    const link = (e.target as Element).closest('a[href]') as HTMLAnchorElement | null;
    if (!link) return;
    if (link.contains(e.relatedTarget as Node)) return; // still inside link
    if (timer) { clearTimeout(timer); timer = null; }
    controller.hide();
    activeUrl = null;
  });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tailwind v3 `tailwind.config.js` with content paths | Tailwind v4 `@import 'tailwindcss'` in CSS, no config file needed | v4.0 (2025) | No config needed; but CSS-first theme definition |
| Manual `:root`→`:host` replacement for shadow DOM | WXT 0.20.17 does it automatically via `splitShadowRootCss` | WXT 0.20.x (early 2025) | No manual workaround required |
| `@property` not working in shadow DOM | WXT extracts `@property` to document.head automatically | WXT 0.20.x (early 2025, PR #1594) | `border`, `shadow-*`, `ring-*` all work in shadow root |
| Attach listener per `<a>` element | Single event delegation on `document` | Always best practice | Works for dynamic content, O(1) memory |
| `position: 'overlay'` for tooltips | `position: 'modal'` + internal positioning | WXT 0.x | Avoids z-index and overflow conflicts |

**Deprecated/outdated in this project's context:**
- Reference to "Tailwind v3" in the phase brief: the project actually runs Tailwind v4. The brief's concern about Shadow DOM bugs is addressed by WXT 0.20.17.
- `@thedutchcoder/postcss-rem-to-px` plugin: not needed. WXT handles the actual blocking issues (`@property`, `:root`).

---

## Open Questions

1. **Should same-origin links be excluded from the tooltip?**
   - What we know: The requirement says "any link on a page." Same-origin links would re-request OG data for the same site.
   - What's unclear: Whether users want previews of same-site internal links.
   - Recommendation: Start by excluding same-origin links (`parsed.origin === location.origin`). They can be included later. The background fetch pipeline handles them fine; this is a UX decision.

2. **How does `sendMessage` behave when called from a content script?**
   - What we know: `sendMessage('getOgData', { url })` sends to the background service worker per `@webext-core/messaging` routing. The background's `onMessage('getOgData')` handler will process it.
   - What's unclear: Whether the content script can call `sendMessage('getOgData')` directly or needs special routing.
   - Recommendation: HIGH confidence this works — content scripts call `sendMessage` to the background in the standard @webext-core/messaging pattern. No additional routing needed.

3. **Tooltip width and max dimensions**
   - What we know: The popup card uses `w-[380px]`. Tooltip context is smaller.
   - What's unclear: Optimal tooltip width for content script injection.
   - Recommendation: Use `w-[320px]`, `max-h-[200px]` for a compact tooltip. Show image (if present) at reduced height (~90px), title, and truncated description.

4. **Does the `all: initial !important` reset on `:host` interfere with `position: fixed` on tooltip children?**
   - What we know: WXT applies `:host { all: initial !important }` to reset inherited styles. The tooltip div uses `position: fixed` via Tailwind `fixed` class.
   - What's unclear: Whether `all: initial` on `:host` (the shadow host custom element) affects `position: fixed` inside the shadow root's `<html>` or container.
   - Recommendation: LOW confidence concern — the `all: initial` applies to the shadow host element, not to descendants inside the shadow root. The shadow root's internal DOM has its own stacking context. Test early.

5. **WXT PR #1594 inclusion in v0.20.17**
   - What we know: PR #1594 "feat: Automatically place document-level CSS outside shadow root" was merged April 19, 2025. The installed version is 0.20.17. The `splitShadowRootCss` function IS present in `node_modules/wxt/dist/utils/split-shadow-root-css.mjs` and is called in `shadow-root.mjs`.
   - What's unclear: The exact WXT version where this was first released. However, since the implementation is verified present in the installed 0.20.17, this is moot.
   - Recommendation: HIGH confidence — the fix is present in the installed version. Confirmed by reading the installed source.

---

## Sources

### Primary (HIGH confidence)
- Installed WXT source `node_modules/wxt/dist/utils/content-script-ui/shadow-root.mjs` — verified `:root`→`:host` replacement and `splitShadowRootCss` usage in WXT 0.20.17
- Installed WXT source `node_modules/wxt/dist/utils/split-shadow-root-css.mjs` — verified `@property` and `@font-face` extraction regex
- Installed WXT source `node_modules/wxt/dist/utils/content-script-ui/shared.mjs` — verified `applyPosition` behavior for 'modal', 'overlay', 'inline'
- [WXT Content Script UI Docs](https://wxt.dev/guide/key-concepts/content-script-ui.html) — `createShadowRootUi` API, cssInjectionMode values
- [WXT IsolatedWorldContentScriptEntrypointOptions API](https://wxt.dev/api/reference/wxt/interfaces/isolatedworldcontentscriptentrypointoptions) — confirmed cssInjectionMode: 'ui' behavior
- Project `package.json` — confirmed tailwindcss@4.1.18 (v4, NOT v3 as stated in brief)
- Project `entrypoints/popup/style.css` — confirmed `@import 'tailwindcss'` (v4 syntax)

### Secondary (MEDIUM confidence)
- [WXT createShadowRootUi DeepWiki](https://deepwiki.com/wxt-dev/wxt/5.3-content-script-ui) — cssInjectionMode details, React mounting pattern
- [WXT Issue #1461](https://github.com/wxt-dev/wxt/issues/1461) — confirmed PR #1594 was merged; automatic `@property` extraction implemented
- [WXT Issue #1460 - Tailwind v4 compatibility](https://github.com/wxt-dev/wxt/issues/1460) — closed as completed Feb 2025; Vite plugin approach recommended
- [Tailwind v4 Shadow DOM @property bug discussion](https://github.com/tailwindlabs/tailwindcss/discussions/16772) — confirmed `@property` is the root cause of `border`, `shadow-*` failures in shadow DOM
- [WXT Discussion #1277 - Tailwind CSS v4 Beta](https://github.com/wxt-dev/wxt/discussions/1277) — maintainer confirmed "vite plugin works fine for HTML pages and content scripts"
- [Floating UI Tooltip docs](https://floating-ui.com/docs/tooltip) — hover delay pattern, flip/shift middleware for viewport boundary handling

### Tertiary (LOW confidence — background context only)
- [Tailwind v4 :root/:host discussion #15556](https://github.com/tailwindlabs/tailwindcss/discussions/15556) — no official fix planned; WXT workaround is the solution
- [WXT Discussion #819 - Tailwind class not applied](https://github.com/wxt-dev/wxt/discussions/819) — cssInjectionMode: 'ui' scopes styles to shadow root only

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified from installed package.json and node_modules
- Shadow DOM + Tailwind v4 compatibility: HIGH — verified from installed WXT source code
- Architecture patterns: HIGH — derived directly from WXT API and project existing code
- Hover lifecycle pattern: HIGH — standard DOM event delegation, well-documented
- Tooltip positioning: HIGH — standard getBoundingClientRect pattern
- `sendMessage` from content script: HIGH — matches existing Phase 2 patterns in codebase

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (WXT releases frequently; re-verify if WXT is upgraded)

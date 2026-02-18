# Phase 3: Popup Shell - Research

**Researched:** 2026-02-18
**Domain:** Browser extension popup UI — shadcn/ui + WXT + Tailwind v3 + React 19
**Confidence:** HIGH (core stack verified), MEDIUM (shadcn/mira preset integration nuance)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Component library**
- Use **shadcn/ui** for all UI components
- Init preset: `pnpm dlx shadcn@latest create --preset "https://ui.shadcn.com/init?base=radix&style=mira&baseColor=neutral&theme=neutral&iconLibrary=hugeicons&font=inter&menuAccent=subtle&menuColor=default&radius=default&template=vite&rtl=false" --template vite`
- Use **hugeicons** icon library (included in preset)
- Style: `mira`, base color: `neutral`

**Compact card design**
- Shows: OG image + title + description
- Image layout: full-width banner spanning the top of the card
- Title and description stacked below the image
- Width and text truncation: Claude's discretion (optimize for og:image 1.91:1 aspect ratio and typical popup dimensions)

**Expand / collapse behavior**
- Trigger: dedicated expand chevron/button visible in the compact card
- Expanded: popup resizes to a taller window — compact card stays at top, tabs appear below
- Collapse: same chevron/button toggles back to compact (same position, same area)
- Memory: always starts compact — no state persistence between popup opens

**Empty states**
- **No OG tags found**: use shadcn `Empty` component with a placeholder icon and message "No OG metadata detected"
  - Reference: https://ui.shadcn.com/docs/components/radix/empty
- **Partial data** (some fields present, some missing): render the partial card with whatever data exists, plus a visible "missing fields" indicator section below the card
- **Missing fields in expanded view**: a list of missing field names with one-line explanations of what each field does (e.g. "og:image — required for image previews on social platforms")
- **Loading state**: shadcn `Skeleton` component shaped like the card (image placeholder + title/description lines) — shown during the brief loading window before data arrives

**Expanded view — tab structure**
- Two top-level tabs: **Previews** (Tab 1, default) and **Metadata** (Tab 2)
- Tab 1 content in Phase 3: platform icon/logo sub-tabs at top + "coming soon" placeholder per platform
- Tab 2 content in Phase 3: empty placeholder (filled in Phase 5)
- Platform sub-tab switching (within Previews tab): horizontal row of platform icon/logo tabs
- Main tab bar position: Claude's discretion (optimize for popup height and card visibility)

### Claude's Discretion
- Popup width and height in compact and expanded modes
- Text truncation lengths for title and description
- Exact card padding, spacing, and typography (use shadcn + Tailwind defaults)
- Main tab bar position (above or below compact card) in expanded view
- Transition/animation between compact and expanded (if any — keep it subtle)
- Error state handling (e.g. extension can't access page content)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

## Summary

This phase builds the popup UI shell for the OG Preview extension on top of the WXT+React+Tailwind v3 foundation already in place. The primary challenge is integrating shadcn/ui (which now targets Tailwind v4 by default) into an existing Tailwind v3 project — requiring `shadcn@2.3.0` instead of the current latest version. The mira style (introduced December 2025 via `shadcn create`) is a new compact design system; its components.json format differs from legacy new-york style.

The popup resize approach is pure CSS: Chrome auto-resizes the popup to fit its HTML content dimensions, so toggling between compact and expanded is achieved by conditionally rendering the expanded section (no JavaScript `resizeTo` calls needed). Max popup size is 800×600px enforced by Chrome. Dark mode is implemented with Tailwind v3's `selector` strategy (`darkMode: 'selector'` in config), with a React `useEffect` that reads `window.matchMedia('(prefers-color-scheme: dark)')` and adds/removes the `dark` class on `document.documentElement`.

The messaging layer from Phase 2 is already complete. The popup calls `sendMessage('getPageOgData', { tabId })` where `tabId` comes from `browser.tabs.query({ active: true, currentWindow: true })`. The background relays this to the content script and returns `OgData | null`. All OgData fields are optional, so the popup must handle every combination of missing data gracefully.

**Primary recommendation:** Install shadcn@2.3.0, manually configure components.json for the mira style + hugeicons, install components individually with `pnpm dlx shadcn@2.3.0 add`, use CSS height toggling for expand/collapse, and use Tailwind selector strategy for dark mode driven by `matchMedia`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| shadcn/ui | CLI 2.3.0 (Tailwind v3 compat) | Component library | Locked decision; copies components into project |
| @hugeicons/react | latest (^1.x) | Icon renderer component | Included in shadcn mira preset |
| @hugeicons/core-free-icons | 3.1.1 | Free icon SVG data (4,600+ icons) | Hugeicons two-package model |
| react | ^19.2.4 | UI (already installed) | Already in project |
| tailwindcss | ^3.4.19 | Styling (already installed) | Tailwind v3 — NOT v4 (locked) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| clsx | ^2.1.1 | Class name merging (already installed) | All conditional className logic |
| @types/node | dev | Required by shadcn for path alias in vite.config | Needed for `path.resolve` in vite config |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| shadcn@2.3.0 | shadcn@latest | Latest requires Tailwind v4 — breaks Shadow DOM; v3 is locked |
| hugeicons | lucide-react | mira preset uses hugeicons; locked decision |
| CSS height toggle | window.resizeTo() | resizeTo() disabled for extension popups; CSS auto-resize is correct approach |

**Installation:**
```bash
# shadcn init (Tailwind v3 compatible version)
pnpm dlx shadcn@2.3.0 init

# Add individual components
pnpm dlx shadcn@2.3.0 add card skeleton tabs empty

# hugeicons (two packages required)
pnpm add @hugeicons/react @hugeicons/core-free-icons

# @types/node for vite path alias
pnpm add -D @types/node
```

---

## Architecture Patterns

### Recommended Project Structure
```
entrypoints/popup/
├── index.html           # WXT popup entrypoint, no changes needed
├── main.tsx             # Render root, wrap in ThemeProvider
├── App.tsx              # Root: state machine, layout, orchestration
├── style.css            # Tailwind directives (already exists)
└── components/
    ├── CompactCard.tsx  # OG image banner + title + desc + expand button
    ├── ExpandedView.tsx # Tabs wrapper (Previews + Metadata)
    ├── PreviewsTab.tsx  # Platform icon sub-tabs + "coming soon" per platform
    ├── MetadataTab.tsx  # Empty placeholder for Phase 5
    ├── OgCardSkeleton.tsx  # Skeleton loading shape
    ├── EmptyState.tsx   # No OG tags found state
    └── MissingFields.tsx   # Partial data indicator + field list

components/
├── theme-provider.tsx   # Dark mode ThemeProvider (in project root components/)
└── ui/                  # shadcn generated components land here
    ├── card.tsx
    ├── skeleton.tsx
    ├── tabs.tsx
    └── empty.tsx
```

**Note:** WXT already has `@/*` path aliases mapping to project root. shadcn `components.json` must use `components: "@/components"` and `ui: "@/components/ui"` to match WXT's tsconfig paths.

### Pattern 1: shadcn Init for Tailwind v3 Existing Project

**What:** Configure shadcn into the existing WXT project without re-scaffolding. The `shadcn create` command creates new projects — for existing projects, use `shadcn@2.3.0 init` then manually adjust `components.json` for the mira style.

**When to use:** Any existing Vite+Tailwind v3 project adding shadcn.

**Steps:**
1. Add `@types/node` for vite path alias
2. Update `vite.config.ts` with `resolve.alias`
3. Run `pnpm dlx shadcn@2.3.0 init` — answers: Neutral base color, CSS variables yes, tsx yes
4. Manually edit `components.json` to set `style: "mira"` and `iconLibrary: "hugeicons"` (CLI may not offer these during init with 2.3.0)
5. Update `tailwind.config.ts` to add `darkMode: 'selector'` and extend content paths for `components/`

```typescript
// vite.config.ts (additions needed)
import path from "path"
// Source: ui.shadcn.com/docs/installation/vite

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  // ...rest of WXT config
});
```

**Important:** WXT uses `wxt.config.ts` not `vite.config.ts`. WXT's `defineConfig` accepts `vite` key for Vite overrides:
```typescript
// wxt.config.ts
import path from "path"
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
  }),
  manifest: { /* ... */ },
});
```

**Note:** WXT already sets up `@/*` aliases pointing to the project root in `.wxt/tsconfig.json`. Verify the alias matches before running shadcn init — shadcn reads tsconfig paths to determine where to place files.

### Pattern 2: Popup Resize via CSS (NOT window.resizeTo)

**What:** Chrome extension popups automatically size to fit their HTML content. Toggle expand/collapse by conditionally mounting the expanded section.

**When to use:** Any expand/collapse in a Chrome popup.

**Example:**
```typescript
// Source: Chrome extension popup sizing behavior (MDN + Chromium source)
// Max popup size: 800x600px (hard-coded in Chrome)

function App() {
  const [expanded, setExpanded] = useState(false);

  return (
    // Fixed width; height adjusts automatically to content
    <div className="w-[380px]">
      <CompactCard onToggle={() => setExpanded(v => !v)} expanded={expanded} />
      {expanded && <ExpandedView />}
    </div>
  );
}
```

**Popup body** must NOT have a fixed height — let content determine it.
Compact mode: ~compact card height (~220px)
Expanded mode: compact card + tabs (~500px) — stays under 600px limit

### Pattern 3: Dark Mode — Tailwind v3 Selector Strategy

**What:** Use Tailwind v3 `selector` strategy. A React ThemeProvider reads `prefers-color-scheme` once on mount and sets `document.documentElement.classList`. No localStorage persistence needed (popup always reopens fresh, and CONTEXT.md says "always starts compact").

**When to use:** Any WXT popup needing OS-aware dark mode without user toggle.

```typescript
// Source: v3.tailwindcss.com/docs/dark-mode + ui.shadcn.com/docs/dark-mode/vite

// tailwind.config.ts — add darkMode
const config: Config = {
  darkMode: 'selector',  // v3.4.1+ (replaces 'class')
  content: [
    './entrypoints/**/*.{html,ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  // ...
};

// components/theme-provider.tsx
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', dark);

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle('dark', e.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return <>{children}</>;
}
```

### Pattern 4: Popup Messaging — Get Current Tab OgData

**What:** Popup calls background via `sendMessage('getPageOgData', { tabId })`. Background routes to content script. Pattern from Phase 2 lib/messaging.ts.

**When to use:** On every popup open (useEffect with empty dep array).

```typescript
// Source: Phase 2 lib/messaging.ts + @webext-core/messaging docs
import { sendMessage } from '@/lib/messaging';

function App() {
  const [ogData, setOgData] = useState<OgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchOgData() {
      try {
        const [tab] = await browser.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (!tab?.id) { setError(true); return; }
        const data = await sendMessage('getPageOgData', { tabId: tab.id });
        setOgData(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchOgData();
  }, []);
}
```

**Note:** `browser` is a WXT global — no import needed. `sendMessage` is from `@/lib/messaging` (Phase 2).

### Pattern 5: shadcn Tabs — Nested (Platform Sub-tabs Inside Previews)

**What:** Two-level tab structure. Outer: Previews/Metadata. Inner (within Previews): platform icon tabs.

```typescript
// Source: ui.shadcn.com/docs/components/tabs
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Outer tabs
<Tabs defaultValue="previews">
  <TabsList>
    <TabsTrigger value="previews">Previews</TabsTrigger>
    <TabsTrigger value="metadata">Metadata</TabsTrigger>
  </TabsList>
  <TabsContent value="previews">
    {/* Inner platform tabs */}
    <Tabs defaultValue="twitter">
      <TabsList>
        <TabsTrigger value="twitter">
          <HugeiconsIcon icon={TwitterIcon} size={16} />
        </TabsTrigger>
        <TabsTrigger value="facebook">
          <HugeiconsIcon icon={FacebookIcon} size={16} />
        </TabsTrigger>
        <TabsTrigger value="linkedin">
          <HugeiconsIcon icon={LinkedinIcon} size={16} />
        </TabsTrigger>
      </TabsList>
      <TabsContent value="twitter">Coming soon</TabsContent>
      {/* ... */}
    </Tabs>
  </TabsContent>
  <TabsContent value="metadata">
    {/* Phase 5 placeholder */}
  </TabsContent>
</Tabs>
```

### Anti-Patterns to Avoid

- **window.resizeTo() for popup resize:** Disabled in extension context. Use CSS content-driven height instead.
- **shadcn@latest with Tailwind v3:** Latest CLI targets Tailwind v4 — will break the build. Use `shadcn@2.3.0`.
- **Hardcoded popup height on `<body>`:** Prevents auto-resize. Let content determine height; set only width.
- **Missing `tailwind.config.ts` content paths for components/:** shadcn components in `/components/ui/` won't be included in Tailwind purge. Add `'./components/**/*.{ts,tsx}'` to content array.
- **Not adding `darkMode: 'selector'` before installing shadcn components:** shadcn CSS variables assume `dark:` selector strategy. Adding after the fact works, but do it before testing dark mode.
- **Importing from old hugeicons-react:** Deprecated. Always use `@hugeicons/react` + `@hugeicons/core-free-icons`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Skeleton loading shapes | Custom CSS shimmer | `shadcn Skeleton` | Handles animation, dark mode, sizing |
| Empty state UI | Custom div with icon | `shadcn Empty` (EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription) | Composable, consistent spacing |
| Tab navigation | Custom tab buttons + state | `shadcn Tabs` (Radix-backed) | Keyboard nav, ARIA, focus management |
| Card wrapper | Custom div styling | `shadcn Card` (CardHeader, CardContent, etc.) | Consistent border, shadow, dark mode |
| Dark mode detection | Custom event listener | ThemeProvider pattern (matchMedia + selector) | Handles SSR-like popup open cleanly |
| Icon components | SVG inlined manually | `@hugeicons/react` + `@hugeicons/core-free-icons` | Tree-shakeable, typed, size/color props |

**Key insight:** Every structural UI problem in this popup already has a shadcn solution. The only custom code is the OG-specific layout (image banner, field list, platform tabs).

---

## Common Pitfalls

### Pitfall 1: Wrong shadcn CLI Version for Tailwind v3
**What goes wrong:** Running `pnpm dlx shadcn@latest init` generates Tailwind v4 configuration (`@import "tailwindcss"` in CSS, `@tailwindcss/vite` plugin), breaking the existing Tailwind v3 setup.
**Why it happens:** shadcn@latest (v3+) defaults to Tailwind v4. The Tailwind v3 docs are at `v3.shadcn.com`.
**How to avoid:** Always use `pnpm dlx shadcn@2.3.0 init` and `pnpm dlx shadcn@2.3.0 add <component>`.
**Warning signs:** CSS file gets replaced with `@import "tailwindcss"` instead of `@tailwind base/components/utilities`.

### Pitfall 2: Tailwind Content Paths Missing for shadcn Components
**What goes wrong:** shadcn components in `components/ui/` render unstyled in production builds; works in dev due to JIT watching.
**Why it happens:** `tailwind.config.ts` content array doesn't include `components/` directory.
**How to avoid:** Add `'./components/**/*.{ts,tsx}'` to `content` array before installing any shadcn components.
**Warning signs:** Styles appear in development but vanish in `wxt build` output.

### Pitfall 3: Popup Width Causing Horizontal Scroll
**What goes wrong:** If the root div's width exceeds the popup's actual width, Chrome shows a horizontal scrollbar.
**Why it happens:** Chrome popup width comes from the content width; no explicit outer constraint.
**How to avoid:** Set a fixed `w-[380px]` (or similar) on the outermost container. Never use `min-w` without a corresponding `w-` cap.
**Warning signs:** Popup appears wider than expected, or content shifts on expand.

### Pitfall 4: OgData Fields All Optional — Not Handled
**What goes wrong:** Accessing `ogData.image` without null-check throws or renders broken `<img src={undefined}>`.
**Why it happens:** `OgData` interface has all optional fields (`title?`, `image?`, etc.).
**How to avoid:** Build a helper `hasOgData(data: OgData | null): boolean` that checks if at least one meaningful field exists. Use it to decide between empty state, partial card, and full card.
**Warning signs:** Blank image element, undefined rendered as text.

### Pitfall 5: Dark Mode Flash on Popup Open
**What goes wrong:** Popup renders light mode briefly before `useEffect` runs and adds the `dark` class.
**Why it happens:** `useEffect` runs after first render.
**How to avoid:** Apply dark class synchronously in an inline script in `index.html` `<head>`, before the React bundle loads — or initialize the class from a `useLayoutEffect` instead of `useEffect` for the ThemeProvider.
**Warning signs:** Visible white flash when popup opens in dark mode.

### Pitfall 6: mira Style Not Available in shadcn@2.3.0 Interactive CLI
**What goes wrong:** Running `shadcn@2.3.0 init` interactively only offers `default` and `new-york` styles, not `mira`.
**Why it happens:** `mira` was introduced with `shadcn create` (December 2025), which scaffolds new projects. The `init` command on v2.3.0 predates this.
**How to avoid:** After running `shadcn@2.3.0 init`, manually edit `components.json` to set `"style": "mira"` and `"iconLibrary": "hugeicons"`. Then run `shadcn@2.3.0 add` — components will be fetched with the mira variant from the remote registry. Verify mira components are returned correctly by checking the output files.
**Warning signs:** Components look like the default/new-york style (more padding, different border radius).

### Pitfall 7: Content Script Error Causes Silent Failure
**What goes wrong:** `sendMessage('getPageOgData', { tabId })` returns null on restricted pages (chrome://, file://) or when content script hasn't loaded.
**Why it happens:** Content scripts can't inject into Chrome-internal pages; background returns null on error.
**How to avoid:** Treat null return as an error state distinct from "empty OgData" (which is `{}`). Show error state ("Extension can't access this page") when sendMessage returns null after loading.
**Warning signs:** Loading spinner never clears on chrome:// pages.

---

## Code Examples

Verified patterns from official sources:

### OgData Null-Safety Helper
```typescript
// Based on lib/types.ts (Phase 2) — all fields optional
import type { OgData } from '@/lib/types';

export type OgDataStatus = 'loading' | 'error' | 'empty' | 'partial' | 'complete';

export function getOgDataStatus(data: OgData | null): OgDataStatus {
  if (data === null) return 'error';
  const hasCore = data.title || data.description || data.image;
  if (!hasCore) return 'empty';
  const hasAll = data.title && data.description && data.image;
  if (!hasAll) return 'partial';
  return 'complete';
}

export const KNOWN_OG_FIELDS: Array<{ key: keyof OgData; label: string; description: string }> = [
  { key: 'title',       label: 'og:title',       description: 'Page title shown in link previews' },
  { key: 'description', label: 'og:description',  description: 'Summary text shown below the title' },
  { key: 'image',       label: 'og:image',        description: 'Required for image previews on social platforms' },
  { key: 'url',         label: 'og:url',          description: 'Canonical URL of the page' },
  { key: 'siteName',    label: 'og:site_name',    description: 'Name of the website' },
  { key: 'type',        label: 'og:type',         description: 'Content type (website, article, etc.)' },
];
```

### Empty State with shadcn Empty Component
```typescript
// Source: ui.shadcn.com/docs/components/radix/empty
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

// Install: pnpm dlx shadcn@2.3.0 add empty
function EmptyOgState() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileSearchIcon />  {/* hugeicons */}
        </EmptyMedia>
        <EmptyTitle>No OG metadata detected</EmptyTitle>
        <EmptyDescription>
          This page has no Open Graph tags.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
```

### Skeleton Loading Card
```typescript
// Source: ui.shadcn.com/docs/components/skeleton
import { Skeleton } from "@/components/ui/skeleton"

// Install: pnpm dlx shadcn@2.3.0 add skeleton
function OgCardSkeleton() {
  return (
    <div className="w-full">
      {/* Image banner placeholder — 1.91:1 ratio on 380px width = ~199px tall */}
      <Skeleton className="w-full h-[199px] rounded-t-lg rounded-b-none" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}
```

### Hugeicons Import Pattern
```typescript
// Source: hugeicons.com/docs/integrations/react/quick-start
// Install: pnpm add @hugeicons/react @hugeicons/core-free-icons
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon, ArrowUp01Icon } from '@hugeicons/core-free-icons';

// Usage — size in px, strokeWidth default 1.5
<HugeiconsIcon icon={ArrowDown01Icon} size={16} color="currentColor" />
```

**Note on icon names:** Naming convention is PascalCase + "Icon" suffix with numeric variants: `ArrowDown01Icon`, `ArrowUp01Icon`. The free pack (`@hugeicons/core-free-icons`) contains 4,600+ stroke-rounded icons. For platform logos (Twitter, Facebook, LinkedIn), these may be in the pro package — check the free icon browser before assuming availability. If a specific platform logo is not in the free pack, use text labels or custom SVG as fallback.

### Dark Mode — Sync Apply (No Flash)
```typescript
// Inline in entrypoints/popup/index.html <head> — runs before React
// Source: Tailwind v3 docs pattern + shadcn dark mode vite guide
```
```html
<!-- entrypoints/popup/index.html — add before </head> -->
<script>
  (function() {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  })();
</script>
```
```typescript
// components/theme-provider.tsx — keeps class in sync when OS changes
import { useEffect } from 'react';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle('dark', e.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return <>{children}</>;
}
```

### components.json for Tailwind v3 + mira + hugeicons
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "mira",
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "entrypoints/popup/style.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "rsc": false,
  "tsx": true,
  "aliases": {
    "utils": "@/lib/utils",
    "components": "@/components",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "hugeicons"
}
```

**Note:** The `css` path points to the popup's style.css where Tailwind directives live. `rsc: false` since this is Vite (no RSC support).

---

## Recommendations for Claude's Discretion Areas

### Popup Dimensions
- **Compact width:** 380px — optimizes for 1.91:1 OG image (380px wide → ~199px tall image)
- **Compact height:** Content-driven (~220–240px: 199px image + 40px title/desc + padding)
- **Expanded height:** Content-driven (~480–520px: compact card + tabs header + tab content, stays under 600px limit)
- **Body:** `width: 380px; margin: 0;` on `<body>` prevents horizontal scroll

### Text Truncation
- **Title:** `truncate` (single line, ellipsis) — typically 40–60 chars visible at 380px
- **Description:** `line-clamp-2` (two lines max) — prevents card from growing unexpectedly

### Main Tab Bar Position
- **Recommendation:** Place main tabs (Previews / Metadata) immediately BELOW the compact card. Rationale: user sees the card first, then discovers navigation. This also means expand/collapse is natural — compact = card only, expanded = card + tabs below.

### Transition
- **Recommendation:** No transition on expand/collapse. Chrome popup window itself resizes with the OS animation; adding CSS transition on content inside creates double-animation artifacts. Mount/unmount expanded section instantly.

### Error State
- **Recommendation:** If `sendMessage` throws or returns null (restricted page), show the Empty component variant with message "Can't access this page" and a lock icon. Same EmptyState component, different icon + text props.

---

## OgData Fields Reference (Phase 2 lib/types.ts)

All fields are optional (`?`):

| Field | Source | UI Use |
|-------|--------|--------|
| `title` | og:title | Compact card title, truncate 1 line |
| `description` | og:description | Compact card description, line-clamp-2 |
| `image` | og:image | Banner image URL |
| `imageAlt` | og:image:alt | `<img alt>` attribute |
| `url` | og:url | Display URL in expanded |
| `siteName` | og:site_name | Attribution in card |
| `type` | og:type | Show in metadata tab (Phase 5) |
| `locale` | og:locale | Show in metadata tab (Phase 5) |
| `twitterCard` | twitter:card | Platform context |
| `twitterTitle` | twitter:title | Twitter preview override |
| `twitterDescription` | twitter:description | Twitter preview override |
| `twitterImage` | twitter:image | Twitter preview override |

**For compact card:** prefer `twitterTitle` over `title` if set (some sites provide better Twitter-specific copy). Same for description and image. This logic goes in a helper: `resolveDisplayData(ogData: OgData)`.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `darkMode: 'class'` in tailwind config | `darkMode: 'selector'` | Tailwind v3.4.1 | 'class' still works as alias, but 'selector' is canonical |
| `shadcn/ui` with new-york style only | `shadcn create` with 5 styles (mira, nova, etc.) | December 2025 | mira is the locked choice; requires components.json manual edit when using init on existing project |
| `hugeicons-react` package | `@hugeicons/react` + `@hugeicons/core-free-icons` | 2024 | old package deprecated; new two-package model |
| Radix individual packages | Unified `radix-ui` package (new-york style) | February 2026 | Only affects new-york style; mira uses Radix primitives but may reference unified package |

**Deprecated/outdated:**
- `hugeicons-react`: Deprecated npm package. Use `@hugeicons/react` instead.
- `darkMode: 'class'`: Still works in v3 (alias for selector), but canonical is `'selector'` since v3.4.1.
- `shadcn@latest` with Tailwind v3 projects: Will generate v4 config. Use `shadcn@2.3.0`.

---

## Open Questions

1. **mira style availability via shadcn@2.3.0 add command**
   - What we know: `mira` was introduced with `shadcn create` (Dec 2025). `shadcn@2.3.0` predates this and only offers new-york/default in interactive init.
   - What's unclear: Whether `shadcn@2.3.0 add card` fetches from the remote registry using the `style: "mira"` in components.json, or whether 2.3.0 is too old to know about mira.
   - Recommendation: Test with `pnpm dlx shadcn@2.3.0 add button` after manually setting `style: "mira"` in components.json. If components don't match mira styling, fall back to `new-york` style (also neutral, also dense) — the visual difference is minor spacing/radius. Alternatively try `pnpm dlx shadcn@latest add button` if the project can be confirmed working with it. MEDIUM confidence — validate on first task.

2. **Platform logo icons in free hugeicons pack**
   - What we know: Free pack has 4,600+ icons in 59 categories. Social media logos may be in a "Social" category.
   - What's unclear: Whether Twitter/X, LinkedIn, Facebook brand icons are in the free tier (brand icons are often restricted).
   - Recommendation: Before building the platform sub-tabs, verify each platform icon by checking the hugeicons free icon browser. If brand icons are pro-only, use simple text labels (Facebook, X, LinkedIn) or minimal custom SVG for the Phase 3 placeholder tabs. Phase 4 can add proper logos.

3. **WXT vite.config alias + shadcn path resolution**
   - What we know: WXT's `.wxt/tsconfig.json` has `@/*` mapping to `../*` (project root). shadcn uses tsconfig paths to determine install location.
   - What's unclear: Whether `shadcn@2.3.0 add` correctly reads the WXT-generated tsconfig paths (which are in `.wxt/tsconfig.json`, not the root `tsconfig.json`).
   - Recommendation: After running shadcn init, verify `components.json` paths match the project structure. If shadcn installs to wrong location, manually set `aliases.components: "@/components"` in components.json. LOW confidence — test on first task.

---

## Sources

### Primary (HIGH confidence)
- `ui.shadcn.com/docs/components/radix/empty` — Empty component API verified
- `ui.shadcn.com/docs/components/skeleton` — Skeleton install and usage
- `ui.shadcn.com/docs/components/tabs` — Tabs component API
- `ui.shadcn.com/docs/components/card` — Card sub-components
- `ui.shadcn.com/docs/dark-mode/vite` — ThemeProvider pattern for Vite
- `v3.tailwindcss.com/docs/dark-mode` — Tailwind v3 selector strategy
- `hugeicons.com/docs/integrations/react/quick-start` — hugeicons two-package model
- `hugeicons.com/icon/arrow-down-01` — Confirmed icon naming: `ArrowDown01Icon`
- Phase 2 `lib/types.ts` — OgData interface (read directly)
- Phase 2 `lib/messaging.ts` — sendMessage/onMessage API (read directly)
- Phase 2 `entrypoints/background.ts` — hub-and-spoke routing (read directly)

### Secondary (MEDIUM confidence)
- shadcn changelog 2025-12 (`shadcn create`) — mira style introduction
- shadcn changelog 2025-10 — Empty component introduction date
- Chrome extension popup sizing: 800×600 max, auto-resize to content
- `wxt.dev/api/reference/wxt/interfaces/popupentrypoint` — WXT popup meta tag options

### Tertiary (LOW confidence)
- mira style in components.json `"style": "mira"` field — verified field exists in schema based on shadcn create UI builder; actual CLI behavior with shadcn@2.3.0 unverified
- Platform brand icons in free hugeicons pack — unverified, needs manual check

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — shadcn, hugeicons, WXT all verified via official docs
- Architecture: HIGH — popup resize, messaging pattern, dark mode all verified
- shadcn mira + 2.3.0 interaction: MEDIUM — init flow verified, but mira style + 2.3.0 CLI compatibility is an open question
- Pitfalls: HIGH — popup max size, tailwind content paths, Tailwind v3/v4 split all from official sources

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (30 days — shadcn is fast-moving; recheck mira/2.3.0 compatibility before planning)

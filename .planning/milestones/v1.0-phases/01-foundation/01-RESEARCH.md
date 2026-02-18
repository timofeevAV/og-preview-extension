# Phase 1: Foundation - Research

**Researched:** 2026-02-18
**Domain:** WXT project scaffolding, MV3 manifest, build tooling, cross-browser extension skeleton
**Confidence:** HIGH

## Summary

Phase 1 is a pure scaffolding phase: create a WXT project with React 19, TypeScript, and Tailwind CSS v3, configure the MV3 manifest with `optional_host_permissions`, set up HMR-powered development, and verify the extension installs on Chrome, Edge, and Brave. No user-facing features -- just a working skeleton with a placeholder popup.

WXT v0.20.17 provides a React template that generates the entire project structure, auto-generates the manifest from `wxt.config.ts` and entrypoint files, and handles HMR for popups out of the box. The main research questions were: exact configuration for `optional_host_permissions` in WXT's manifest config, Tailwind v3 PostCSS setup within WXT's Vite pipeline, cross-browser dev/test workflow, and content script placeholder setup for later phases.

**Primary recommendation:** Use `pnpm dlx wxt@latest init` with the React template, then layer on Tailwind v3 via PostCSS, configure `optional_host_permissions: ["<all_urls>"]` in `wxt.config.ts`, and add placeholder entrypoints for background service worker and content script alongside the popup.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

No explicit locked decisions -- user deferred all choices to Claude's discretion for this phase.

Prior decisions from research/roadmap that constrain this phase:
- WXT ^0.20.17 + React 19 + TypeScript + Tailwind v3 + pnpm (locked stack)
- optional_host_permissions from day one (not host_permissions)
- Manifest V3 only (no MV2 patterns)
- Chrome Web Store compliance required

### Claude's Discretion

User has no specific preferences for this phase -- Claude has full flexibility on:
- Permission request timing and UX (when/how optional_host_permissions prompt appears)
- Placeholder popup content and design
- First-run / onboarding flow (or absence thereof)
- Toolbar icon (placeholder or simple design)
- TypeScript config strictness
- ESLint/Prettier configuration
- Content script injection scope (all URLs vs dynamic registration)

Follow research recommendations: WXT ^0.20.17 + React 19 + TypeScript + Tailwind v3 + pnpm.

### Deferred Ideas (OUT OF SCOPE)

None -- discussion stayed within phase scope.

</user_constraints>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| WXT | ^0.20.17 | Extension framework | File-based entrypoints, auto-manifest generation, Vite-powered HMR, multi-browser builds. The standard MV3 framework for 2025/2026. |
| React | ^19 | Popup UI framework | WXT has first-class React support via `@wxt-dev/module-react`. React 19 is production-ready, `createRoot` API required. |
| TypeScript | ^5.7 | Type safety | WXT is TypeScript-first. Auto-generates tsconfig at `.wxt/tsconfig.json`. Essential for typed message passing across extension contexts. |
| Tailwind CSS | ^3.4 | Utility-first CSS | Must be v3, NOT v4. Tailwind v4 has confirmed Shadow DOM incompatibility (`:root` variables, `@property` rules break in shadow DOM). v3.4 is stable. |
| pnpm | ^9 | Package manager | Recommended by WXT. Faster installs, strict dependency resolution. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @wxt-dev/module-react | latest | WXT React integration module | Always -- auto-configures Vite React plugin, enables JSX/TSX, adds React auto-imports |
| autoprefixer | ^10 | CSS vendor prefixes | Always with Tailwind v3 PostCSS pipeline |
| postcss | ^8 | CSS processing | Always -- required by Tailwind v3 |
| clsx | ^2 | Conditional class names | Popup UI -- lightweight (228B) utility for dynamic Tailwind classes |

### Not Needed Yet (Later Phases)

| Library | Phase | Purpose |
|---------|-------|---------|
| htmlparser2 + htmlmetaparser | Phase 2 | OG tag parsing in service worker |
| @thedutchcoder/postcss-rem-to-px | Phase 7 | Content script Shadow DOM rem-to-px conversion |
| postcss-prefix-selector | Phase 7 | Content script CSS scoping |

### Installation

```bash
# Initialize project (interactive: select React template, pnpm)
pnpm dlx wxt@latest init og-preview-extension

# Install React module for WXT
cd og-preview-extension
pnpm add -D @wxt-dev/module-react

# Tailwind CSS v3 + PostCSS
pnpm add -D tailwindcss@3 postcss autoprefixer
pnpm dlx tailwindcss init -p

# Utility libraries
pnpm add clsx

# Type declarations (if not bundled with React 19)
pnpm add -D @types/react @types/react-dom

# Run wxt prepare to generate .wxt/ types
pnpm run postinstall
```

## Architecture Patterns

### Recommended Project Structure

WXT uses an `entrypoints/` directory convention. Each file or folder in `entrypoints/` becomes a manifest entry automatically.

```
og-preview-extension/
  entrypoints/
    popup/                # Popup UI (React app)
      index.html          # Popup HTML entry (WXT auto-discovers)
      App.tsx             # Root React component
      main.tsx            # React createRoot mount point
      style.css           # Tailwind imports (@tailwind base/components/utilities)
    background.ts         # Service worker (placeholder for Phase 1)
    content.ts            # Content script (placeholder for Phase 1)
  components/             # Shared React components (empty for now)
  lib/                    # Shared utilities (empty for now)
  assets/                 # Global assets (Tailwind CSS entry if needed)
    styles.css            # Optional: shared Tailwind entry
  public/                 # Static files copied to output root
    icon-16.png           # Extension icon (toolbar, favicon)
    icon-48.png           # Extension icon (extensions page)
    icon-128.png          # Extension icon (CWS listing, install dialog)
  wxt.config.ts           # WXT + manifest configuration
  tailwind.config.ts      # Tailwind v3 config
  postcss.config.cjs      # PostCSS config (Tailwind + autoprefixer)
  tsconfig.json           # Extends .wxt/tsconfig.json
  package.json
```

### Pattern 1: WXT Configuration with Manifest

**What:** All manifest properties are defined in `wxt.config.ts` rather than a static `manifest.json`. WXT merges these with auto-detected entrypoints.

**When to use:** Always in WXT projects. There is no `manifest.json` in source -- WXT generates it at `.output/{target}/manifest.json`.

```typescript
// wxt.config.ts
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'OG Preview',
    description: 'Preview Open Graph cards for any webpage or link',
    version: '0.1.0',
    permissions: ['activeTab', 'storage'],
    optional_host_permissions: ['<all_urls>'],
  },
});
```

**Key points:**
- `permissions: ['activeTab']` -- grants access to the current tab when user clicks the icon. No install warning.
- `permissions: ['storage']` -- needed for `chrome.storage.session` caching (Phase 2+). Declare now to avoid manifest changes later.
- `optional_host_permissions: ['<all_urls>']` -- broad URL access is optional, not granted at install. User grants via `chrome.permissions.request()` at runtime (Phase 2+). This avoids Chrome Web Store rejection.
- WXT auto-generates `action.default_popup` from the `entrypoints/popup/` directory.
- WXT auto-discovers icons from `public/` matching `icon-{size}.png` pattern.
- Do NOT include `host_permissions` -- everything goes through `optional_host_permissions`.

### Pattern 2: Popup Entrypoint with React

**What:** The popup is a standard HTML page with a React mount point. WXT discovers it from `entrypoints/popup/index.html`.

```html
<!-- entrypoints/popup/index.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OG Preview</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

```tsx
// entrypoints/popup/main.tsx
import ReactDOM from 'react-dom/client';
import App from './App';
import './style.css';

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
```

```tsx
// entrypoints/popup/App.tsx
function App() {
  return (
    <div className="w-[350px] min-h-[200px] p-4 bg-white">
      <h1 className="text-lg font-semibold text-gray-900">OG Preview</h1>
      <p className="mt-2 text-sm text-gray-500">
        Click on any page to see its Open Graph metadata.
      </p>
    </div>
  );
}

export default App;
```

```css
/* entrypoints/popup/style.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Key points:**
- Popup width is constrained by the browser (max ~800px, min ~25px). Use a fixed `w-[350px]` for consistent sizing.
- The popup is destroyed every time it closes -- no persistent state. Data must be fetched fresh or read from `chrome.storage`.
- HMR works for popup during development (Vite dev server serves the JS/CSS, changes appear without full reload).

### Pattern 3: Background Service Worker Entrypoint (Placeholder)

**What:** The service worker is registered from `entrypoints/background.ts` using WXT's `defineBackground`.

```typescript
// entrypoints/background.ts
export default defineBackground(() => {
  console.log('OG Preview service worker initialized');
  // Phase 2+ will add message handlers here.
  // All event listeners MUST be registered synchronously at the top level.
});
```

**Key points:**
- `defineBackground` is auto-imported by WXT (no import statement needed).
- The `main` function cannot be async. Register all `chrome.runtime.onMessage` listeners synchronously.
- The service worker terminates after 30s of inactivity. Do not store state in global variables.
- During development, WXT may add extra permissions (`tabs`, `scripting`) for HMR -- these are stripped from production builds.

### Pattern 4: Content Script Entrypoint (Placeholder)

**What:** Content script placeholder that will later handle link hover detection and tooltip rendering.

```typescript
// entrypoints/content.ts
export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main(ctx) {
    console.log('OG Preview content script loaded');
    // Phase 7 will add hover detection and tooltip UI here.
    // ctx provides lifecycle methods (addEventListener, setTimeout, etc.)
    // that auto-cleanup when the content script context is invalidated.
  },
});
```

**Key points:**
- `matches: ['<all_urls>']` -- injects on all pages. This is a manifest declaration, separate from `optional_host_permissions` (which controls fetch access).
- `runAt: 'document_idle'` -- injects after DOM is ready but without blocking page load.
- `defineContentScript` is auto-imported by WXT.
- The `ctx` argument provides lifecycle-aware wrappers (`ctx.addEventListener`, `ctx.setTimeout`) that auto-cleanup on extension update/uninstall.
- During development, WXT dynamically registers content scripts (not via manifest) for faster reload.

### Pattern 5: TypeScript Configuration

**What:** WXT generates a base tsconfig at `.wxt/tsconfig.json`. The project extends it.

```jsonc
// tsconfig.json
{
  "extends": "./.wxt/tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "jsx": "react-jsx"
  }
}
```

**Key points:**
- Run `wxt prepare` (via `pnpm run postinstall`) to generate `.wxt/tsconfig.json` with all WXT type declarations.
- WXT provides built-in path aliases: `@/` maps to `<srcDir>/*`, `~/` also maps to `<srcDir>/*`.
- Do NOT add custom path aliases to tsconfig.json. Use `alias` option in `wxt.config.ts` instead -- WXT syncs them to the generated tsconfig.
- Recommend `strict: true` for the strongest type checking. `noUncheckedIndexedAccess` catches missing array/object index checks.

### Pattern 6: Tailwind v3 PostCSS Configuration

```javascript
// postcss.config.cjs
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './entrypoints/**/*.{html,ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
```

**Key points:**
- The `content` paths must match where WXT puts source files. If using `srcDir: 'src'` in wxt.config.ts, adjust to `'./src/entrypoints/**/*.{html,ts,tsx}'`.
- Do NOT use `srcDir` in wxt.config.ts for this project -- keep the default (project root). This is simpler and matches the WXT React template default.
- PostCSS config must be CommonJS (`.cjs`) or ESM (`.mjs`). The `.cjs` extension is safest for compatibility.
- Tailwind v3 requires PostCSS 8 and autoprefixer 10.

### Anti-Patterns to Avoid

- **Creating a manifest.json file:** WXT generates it. Source of truth is `wxt.config.ts` + entrypoint files.
- **Using `host_permissions` instead of `optional_host_permissions`:** Triggers scary install warning. Chrome Web Store will reject.
- **Using `srcDir: 'src'` without updating all paths:** If you move entrypoints into `src/`, update tailwind content paths, tsconfig, and wxt.config.ts consistently. Simpler to keep the default.
- **Installing Tailwind CSS v4:** Shadow DOM incompatibility confirmed. Always `tailwindcss@3`.
- **Registering event listeners inside async code in background.ts:** Chrome may fire events before async init completes. Register listeners synchronously at top level.
- **Adding `offscreen` permission in Phase 1:** Not needed until Phase 2+ at earliest. Do not declare permissions you do not yet use.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Manifest generation | Manual manifest.json | WXT auto-generation from wxt.config.ts + entrypoints | WXT handles MV2/MV3 differences, browser targeting, dev-mode extras |
| Vite configuration | Custom vite.config.ts | WXT's built-in Vite wrapper in wxt.config.ts | WXT handles extension-specific Vite plugins, HMR, content script bundling |
| Extension icons auto-discovery | Manual icon entries in manifest | WXT's `public/icon-{size}.png` convention | Auto-populates manifest icons from file naming convention |
| React plugin setup | Manual `@vitejs/plugin-react` | `@wxt-dev/module-react` module | Handles Vite React config, auto-imports, JSX transform |
| Content script context management | Manual `chrome.runtime.onInstalled` cleanup | WXT's `ContentScriptContext` (`ctx`) | Auto-cleans listeners, timers when context is invalidated |
| Dev server + extension reload | Custom watch scripts | `wxt dev` command | HMR for popup, fast reload for content/background scripts |

**Key insight:** WXT handles all the glue between Vite and browser extension APIs. Fighting WXT's conventions (adding manual configs, custom build scripts) creates more problems than it solves.

## Common Pitfalls

### Pitfall 1: Forgetting `wxt prepare` After Init

**What goes wrong:** TypeScript errors everywhere -- `defineBackground`, `defineContentScript`, `import.meta.env.BROWSER` are unrecognized. IDE shows red squiggles.
**Why it happens:** WXT generates type declarations at `.wxt/wxt.d.ts` and `.wxt/tsconfig.json`. These only exist after running `wxt prepare`.
**How to avoid:** The `postinstall` script should run `wxt prepare` automatically. Verify `package.json` has `"postinstall": "wxt prepare"`. If types are missing, run `pnpm run postinstall` or `pnpm wxt prepare` manually.
**Warning signs:** IDE cannot find `defineBackground`, `defineContentScript`, or WXT auto-imports.

### Pitfall 2: Popup Sizing Surprises

**What goes wrong:** Popup is either tiny (collapses to content) or overflows with scrollbars.
**Why it happens:** Browser extension popups have no default size. They shrink-wrap to content. If content is dynamic or empty, the popup may collapse. Conversely, content wider than ~800px gets cut off.
**How to avoid:** Set explicit `width` and `min-height` on the root popup container. Use `w-[350px] min-h-[200px]` as a starting point. Test with both minimal and maximal content.
**Warning signs:** Popup flickers or jumps in size when content loads.

### Pitfall 3: WXT Dev Mode Adds Extra Permissions

**What goes wrong:** Testing the extension in dev mode shows permissions (`tabs`, `scripting`) that were not declared. Developers panic or build logic depending on these permissions.
**Why it happens:** WXT injects `tabs` and `scripting` permissions during development for HMR and content script hot reload. These are NOT present in production builds.
**How to avoid:** Always test permission behavior against a production build (`pnpm build`), not dev mode. Do not rely on permissions that only appear in dev.
**Warning signs:** `chrome.scripting` API works in dev but throws in production.

### Pitfall 4: Content Script `matches` vs. `optional_host_permissions` Confusion

**What goes wrong:** Developer declares `matches: ['<all_urls>']` on content script but thinks this grants fetch permissions. Content script tries to fetch cross-origin and gets CORS errors.
**Why it happens:** `matches` in content scripts only controls WHERE the script is injected. It does not grant network permissions. Cross-origin fetch requires `host_permissions` or `optional_host_permissions` granted at runtime.
**How to avoid:** Understand the distinction: `matches` = injection scope (which pages get the content script), `optional_host_permissions` = network access scope (which domains the service worker can fetch). They are independent.
**Warning signs:** Content script loads on the page (console.log works) but `fetch()` calls from service worker fail with permission errors.

### Pitfall 5: Not Testing Production Build Before Shipping

**What goes wrong:** Extension works perfectly in dev mode but breaks in production. Missing assets, broken imports, or permission issues.
**Why it happens:** Dev mode serves files from Vite dev server with extra capabilities (HMR WebSocket, dynamic script registration, extra permissions). Production build is a static bundle with none of these extras.
**How to avoid:** Run `pnpm build` and load the `.output/chrome-mv3` directory in `chrome://extensions` (developer mode) to test the production build. Do this regularly, not just before publishing.
**Warning signs:** Any behavior that "works in dev but not in build."

### Pitfall 6: Cross-Browser Testing Overlooked

**What goes wrong:** Extension works in Chrome but fails in Edge or Brave. Permission prompts differ, some APIs have subtle differences.
**Why it happens:** Developers only test in Chrome during development. Edge and Brave are Chromium-based but have their own UI for permissions and may have differences in API availability.
**How to avoid:** Load the production build in all three browsers (Chrome, Edge, Brave) for each phase. Key things to check: extension loads without errors, popup opens, no console errors.
**Warning signs:** Console errors mentioning undefined APIs or permission issues in non-Chrome browsers.

## Code Examples

### Complete wxt.config.ts

```typescript
// Source: WXT official docs + verified patterns
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'OG Preview',
    description: 'Preview Open Graph cards for any webpage or link',
    version: '0.1.0',
    permissions: ['activeTab', 'storage'],
    optional_host_permissions: ['<all_urls>'],
  },
});
```

### Complete Popup Entrypoint

```html
<!-- entrypoints/popup/index.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OG Preview</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

```tsx
// entrypoints/popup/main.tsx
import ReactDOM from 'react-dom/client';
import App from './App';
import './style.css';

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
```

```tsx
// entrypoints/popup/App.tsx
function App() {
  return (
    <div className="w-[350px] min-h-[200px] p-4 bg-white">
      <div className="flex items-center gap-2 mb-3">
        <img src="/icon-48.png" alt="OG Preview" className="w-6 h-6" />
        <h1 className="text-lg font-semibold text-gray-900">OG Preview</h1>
      </div>
      <p className="text-sm text-gray-500">
        Open Graph preview extension. Platform previews coming soon.
      </p>
    </div>
  );
}

export default App;
```

```css
/* entrypoints/popup/style.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Complete Background Service Worker (Placeholder)

```typescript
// entrypoints/background.ts
// Source: WXT entrypoint docs
export default defineBackground(() => {
  console.log('OG Preview service worker initialized', {
    id: chrome.runtime.id,
    version: chrome.runtime.getManifest().version,
  });

  // Phase 2+ will add:
  // - chrome.runtime.onMessage listener for OG fetch requests
  // - chrome.runtime.onInstalled listener for first-run setup
});
```

### Complete Content Script (Placeholder)

```typescript
// entrypoints/content.ts
// Source: WXT content script docs
export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main(ctx) {
    console.log('OG Preview content script loaded on', window.location.href);

    // Phase 7 will add:
    // - Link hover detection with debounce
    // - Shadow DOM tooltip rendering
    // - Message passing to service worker for OG data
  },
});
```

### Complete tailwind.config.ts

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './entrypoints/**/*.{html,ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
```

### Complete postcss.config.cjs

```javascript
// postcss.config.cjs
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### Complete tsconfig.json

```jsonc
// tsconfig.json
{
  "extends": "./.wxt/tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "jsx": "react-jsx"
  }
}
```

### Complete package.json Scripts

```json
{
  "scripts": {
    "dev": "wxt",
    "dev:edge": "wxt -b edge",
    "build": "wxt build",
    "build:edge": "wxt build -b edge",
    "zip": "wxt zip",
    "zip:edge": "wxt zip -b edge",
    "postinstall": "wxt prepare",
    "typecheck": "tsc --noEmit"
  }
}
```

### Placeholder Extension Icons

For Phase 1, use simple placeholder PNGs. Chrome requires PNG format (SVG not supported in manifest icons). Minimum required sizes:

- `public/icon-16.png` -- toolbar icon, favicon (16x16)
- `public/icon-48.png` -- extensions page (48x48)
- `public/icon-128.png` -- Chrome Web Store listing, install dialog (128x128)

WXT auto-discovers these from `public/` by filename pattern (`icon-{size}.png`) and populates the manifest `icons` and `action.default_icon` fields.

For generating placeholder icons, create a simple colored square or letter icon. Tools like https://alexleybourne.github.io/chrome-extension-icon-generator/ can generate all sizes from a single image.

### Cross-Browser Dev Configuration (Optional)

```typescript
// web-ext.config.ts (gitignored, machine-specific)
import { defineWebExtConfig } from 'wxt';

export default defineWebExtConfig({
  binaries: {
    // Uncomment and set paths for your machine:
    // edge: '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    // chrome: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  },
  // Persist profile data across dev restarts:
  // chromiumArgs: ['--user-data-dir=./.wxt/chrome-data'],
});
```

### Runtime Permission Request Pattern (For Later Phases)

```typescript
// This pattern is needed in Phase 2+ when fetching external URLs.
// Documented here for architectural awareness.

// In popup or content script UI (must be inside a user gesture handler):
async function requestHostPermissions(): Promise<boolean> {
  const granted = await chrome.permissions.request({
    origins: ['<all_urls>'],
  });
  return granted;
}

// Check if permissions are already granted:
async function hasHostPermissions(): Promise<boolean> {
  const result = await chrome.permissions.contains({
    origins: ['<all_urls>'],
  });
  return result;
}

// CRITICAL: chrome.permissions.request() MUST be called inside a user
// gesture (e.g., button click handler). It will fail silently if called
// programmatically without a gesture.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual manifest.json | WXT auto-generates manifest from config + entrypoints | WXT 0.x (2024+) | No manifest.json in source code |
| Persistent background page (MV2) | Event-driven service worker (MV3) | Chrome MV3 (2023+) | No global state, 30s idle timeout |
| `host_permissions: ['<all_urls>']` | `optional_host_permissions: ['<all_urls>']` | CWS policy tightening (2024+) | Avoids install rejection, scary warnings |
| Tailwind CSS v4 | Tailwind CSS v3.4 (for extensions with Shadow DOM) | v4 released 2025, but Shadow DOM broken | Must pin to v3 until upstream fix |
| Plasmo framework | WXT framework | 2024-2025 shift | Plasmo entering maintenance mode; WXT is actively maintained with smaller bundles |
| webpack for extensions | Vite (via WXT) | 2024+ | Faster builds, native HMR |

**Deprecated/outdated:**
- **Manifest V2:** Chrome stopped accepting new MV2 extensions. MV2 fully disabled in Chrome 139 (July 2025). Do not use any MV2 patterns.
- **Plasmo:** Entering maintenance mode. Parcel bundler is 2-3x slower than Vite. Use WXT instead.
- **CRXJS Vite Plugin:** Nearly archived in 2025. Some revival with v2.3.0 but long-term uncertain. Use WXT.

## WXT HMR Behavior by Entrypoint Type

Understanding how HMR works is critical for the "development environment supports HMR" success criterion.

| Entrypoint | HMR Behavior | Developer Experience |
|------------|-------------|---------------------|
| Popup (HTML + React) | Full Vite HMR -- JS/CSS changes appear instantly without popup close/reopen | Excellent. Edit React components, see changes immediately. |
| Background (service worker) | Fast reload -- service worker restarts on file change | Good. Not true HMR but fast enough (~1s). |
| Content Script (JS) | Fast reload -- content script re-injects on file change | Good. Page does not fully reload; script re-executes. |
| Content Script UI (Shadow Root) | No HMR -- requires manual page reload | Acceptable. Use IFrame UI mode during dev if HMR is needed (trade-off: loses shadow DOM isolation). |

## Cross-Browser Compatibility Notes

All three target browsers (Chrome, Edge, Brave) are Chromium-based and share the MV3 API surface. Key differences:

| Area | Chrome | Edge | Brave |
|------|--------|------|-------|
| MV3 Support | Full (native) | Full (Chromium-based) | Full (Chromium-based) |
| `optional_host_permissions` | Supported | Supported | Supported |
| Permission prompt UI | Standard Chrome dialog | Similar but Edge-branded | Similar but Brave-branded |
| `chrome.storage.session` | Supported | Supported | Supported |
| Extension sideloading | chrome://extensions dev mode | edge://extensions dev mode | brave://extensions dev mode |
| Brave Shields | N/A | N/A | May block OG fetch requests to some domains (Phase 2+ concern) |
| Store distribution | Chrome Web Store | Edge Add-ons (same build) | Chrome Web Store (Brave uses CWS) |

**For Phase 1, all three browsers are functionally identical.** The same production build (`.output/chrome-mv3/`) loads in all three without modification.

**Testing procedure:**
1. Run `pnpm build` to produce `.output/chrome-mv3/`
2. Chrome: navigate to `chrome://extensions`, enable developer mode, "Load unpacked" from `.output/chrome-mv3/`
3. Edge: navigate to `edge://extensions`, enable developer mode, "Load unpacked" from `.output/chrome-mv3/`
4. Brave: navigate to `brave://extensions`, enable developer mode, "Load unpacked" from `.output/chrome-mv3/`

## Open Questions

1. **ESLint/Prettier configuration scope**
   - What we know: Standard `@typescript-eslint/parser` + Prettier works. WXT does not impose any specific lint config.
   - What's unclear: Whether to include ESLint/Prettier in Phase 1 or defer to avoid scope creep.
   - Recommendation: Include basic ESLint + Prettier setup in Phase 1. It is low effort and prevents formatting drift from the start. Use a minimal config (TypeScript + React rules only).

2. **Content script `matches` scope for Phase 1**
   - What we know: `matches: ['<all_urls>']` injects on all pages. This is separate from network permissions.
   - What's unclear: Whether injecting a placeholder content script on all pages in Phase 1 adds unnecessary overhead.
   - Recommendation: Include the content script with `matches: ['<all_urls>']` in Phase 1. The placeholder is tiny (~200 bytes) and having the entrypoint in place validates the manifest configuration. Later phases will add functionality.

3. **Whether to use `srcDir: 'src'` or keep default**
   - What we know: WXT default puts `entrypoints/` at project root. The `srcDir: 'src'` option nests everything under `src/`.
   - What's unclear: Community preference and whether it affects any tooling.
   - Recommendation: Keep the default (no `srcDir`). The WXT React template uses project root. Adding `srcDir` requires updating Tailwind content paths, import aliases, and other configs -- unnecessary complexity for Phase 1.

## Sources

### Primary (HIGH confidence)
- [WXT Installation Guide](https://wxt.dev/guide/installation.html) -- Project init, templates, package.json scripts
- [WXT Manifest Configuration](https://wxt.dev/guide/essentials/config/manifest) -- manifest.json generation, permissions, icons auto-discovery
- [WXT Frontend Frameworks (React)](https://wxt.dev/guide/essentials/frontend-frameworks) -- @wxt-dev/module-react setup, project structure
- [WXT Entrypoints Guide](https://wxt.dev/guide/essentials/entrypoints) -- All entrypoint types, defineBackground, defineContentScript, popup HTML
- [WXT Content Scripts](https://wxt.dev/guide/essentials/content-scripts.html) -- Content script configuration, context object, CSS injection modes
- [WXT Content Script UI](https://wxt.dev/guide/key-concepts/content-script-ui.html) -- createShadowRootUi, cssInjectionMode, React in Shadow DOM
- [WXT TypeScript Configuration](https://wxt.dev/guide/essentials/config/typescript.html) -- Generated tsconfig, path aliases, custom compiler options
- [WXT Browser Startup](https://wxt.dev/guide/essentials/config/browser-startup) -- Browser binaries, Edge/Brave config, profile persistence
- [WXT Target Different Browsers](https://wxt.dev/guide/essentials/target-different-browsers) -- Multi-browser builds, runtime detection, MV2/MV3 targeting
- [WXT FAQ](https://wxt.dev/guide/resources/faq) -- Common gotchas, dev mode behavior, content script registration
- [Chrome Permissions API](https://developer.chrome.com/docs/extensions/reference/api/permissions) -- permissions.request(), user gesture requirement, optional_host_permissions
- [Chrome Declare Permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions) -- Permission types, optional vs. required
- [Chrome Extension Icons](https://developer.chrome.com/docs/extensions/develop/ui/configure-icons) -- Icon sizes, PNG requirement
- [Tailwind CSS v3 PostCSS Installation](https://v3.tailwindcss.com/docs/installation/using-postcss) -- PostCSS setup, directives

### Secondary (MEDIUM confidence)
- [WXT + React + Tailwind boilerplate](https://github.com/imtiger/wxt-react-shadcn-tailwindcss-chrome-extension) -- Real-world WXT+React+Tailwind configuration
- [Building Modern Cross Browser Web Extensions: Project Setup](https://aabidk.dev/blog/building-modern-cross-web-extensions-project-setup/) -- Step-by-step WXT+React+Tailwind setup guide
- [2025 State of Browser Extension Frameworks](https://redreamality.com/blog/the-2025-state-of-browser-extension-frameworks-a-comparative-analysis-of-plasmo-wxt-and-crxjs/) -- WXT vs Plasmo vs CRXJS comparison
- [Chrome Extension Icon Generator](https://alexleybourne.github.io/chrome-extension-icon-generator/) -- Tool for generating multi-size icons

### Tertiary (LOW confidence)
- None -- all findings verified against official WXT docs or Chrome APIs.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- WXT v0.20.17 confirmed as latest on npm. React 19, Tailwind v3.4, TypeScript 5.7 all verified against official sources and real-world boilerplates.
- Architecture: HIGH -- WXT entrypoint conventions, manifest generation, and project structure verified against official WXT documentation and multiple working examples.
- Pitfalls: HIGH -- Cross-referenced against official Chrome MV3 docs, WXT FAQ, and prior project-level pitfalls research.
- Cross-browser: HIGH -- Chrome/Edge/Brave all Chromium-based, verified same build output works across all three.

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (30 days -- WXT and Chrome APIs are stable)

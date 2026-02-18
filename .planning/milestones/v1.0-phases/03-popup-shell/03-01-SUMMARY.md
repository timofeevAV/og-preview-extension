---
phase: 03-popup-shell
plan: 01
subsystem: ui
tags: [shadcn, tailwind, react, dark-mode, hugeicons, radix-ui, class-variance-authority]

# Dependency graph
requires: []
provides:
  - shadcn/ui configured with new-york style + hugeicons icon library
  - Tailwind v3 selector dark mode with CSS variable color tokens
  - Four shadcn UI components: Card, Skeleton, Tabs, Empty
  - ThemeProvider with runtime OS theme change listener
  - No-flash dark mode via synchronous inline script in index.html
  - cn() utility helper (clsx + tailwind-merge)
affects:
  - 03-02 (popup layout depends on shadcn Card, Tabs, skeleton primitives)
  - 03-03 (platform tab components use Tabs + Empty + hugeicons)
  - All subsequent Phase 3+ popup plans

# Tech tracking
tech-stack:
  added:
    - "@hugeicons/react@1.1.5"
    - "@hugeicons/core-free-icons@3.1.1"
    - "@types/node@25.2.3"
    - "tailwind-merge@3.4.1"
    - "class-variance-authority@0.7.1"
  patterns:
    - Tailwind CSS custom properties for shadcn color tokens (light + dark variants in @layer base)
    - Vite path alias @/ → project root for shadcn imports at build time
    - ThemeProvider as thin React wrapper — runtime changes only; initial state set synchronously in HTML
    - Synchronous IIFE in <head> applies dark class before React bundle loads (no FOUC)

key-files:
  created:
    - components.json
    - components/theme-provider.tsx
    - components/ui/card.tsx
    - components/ui/skeleton.tsx
    - components/ui/tabs.tsx
    - components/ui/empty.tsx
    - lib/utils.ts
  modified:
    - wxt.config.ts
    - tailwind.config.ts
    - entrypoints/popup/style.css
    - entrypoints/popup/index.html
    - entrypoints/popup/main.tsx
    - package.json
    - pnpm-lock.yaml

key-decisions:
  - "shadcn mira style does not exist in shadcn@2.3.0 registry; fell back to new-york (acceptable per plan research)"
  - "components.json created manually before shadcn init; init skipped (already exists behavior); shadcn add used directly"
  - "Tailwind color tokens mapped via extend.colors in tailwind.config.ts alongside CSS variable declarations in style.css"
  - "class-variance-authority installed as runtime dep (required by empty component's emptyMediaVariants cva call)"

patterns-established:
  - "shadcn components at components/ui/*.tsx — import via @/components/ui/[name]"
  - "cn() utility at lib/utils.ts — all UI component className merging goes through cn()"
  - "dark mode via .dark class on <html> — both inline script (initial) and ThemeProvider (runtime changes)"

# Metrics
duration: 4min
completed: 2026-02-18
---

# Phase 3 Plan 01: shadcn/ui Setup and Dark Mode Infrastructure Summary

**shadcn/ui (new-york style) with Tailwind v3 selector dark mode, four UI primitives (Card, Skeleton, Tabs, Empty), ThemeProvider runtime listener, and FOUC-free dark class injection in index.html**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-02-18T11:35:44Z
- **Completed:** 2026-02-18T11:39:58Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- shadcn/ui initialized with hugeicons icon library, neutral base color, CSS variables strategy
- Four shadcn components installed to `components/ui/`: Card, Skeleton, Tabs, Empty — all with `@/lib/utils` cn() imports resolving correctly
- Dark mode infrastructure complete: synchronous IIFE in `<head>` prevents flash; ThemeProvider handles runtime OS changes via matchMedia listener

## Task Commits

Each task was committed atomically:

1. **Task 1: Configure shadcn/ui for WXT + Tailwind v3** - `a10dcdb` (chore)
2. **Task 2: ThemeProvider and no-flash dark mode** - `3833d3a` (feat)

**Plan metadata:** (to be committed after SUMMARY)

## Files Created/Modified

- `wxt.config.ts` - Added `import path from 'path'` and Vite `resolve.alias` `@` → project root
- `tailwind.config.ts` - Added `darkMode: 'selector'` and extended color tokens mapping to CSS custom properties
- `components.json` - shadcn config: new-york style, hugeicons, neutral base, cssVariables, WXT path aliases
- `entrypoints/popup/style.css` - Added shadcn CSS variable declarations for light and dark themes in `@layer base`; `@tailwind` directives preserved
- `entrypoints/popup/index.html` - Synchronous IIFE dark class script in `<head>`, `style="margin:0"` on body
- `entrypoints/popup/main.tsx` - Wrapped App in ThemeProvider + React.StrictMode; added React import
- `components/theme-provider.tsx` - ThemeProvider: useEffect matchMedia listener for runtime OS changes
- `components/ui/card.tsx` - shadcn Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
- `components/ui/skeleton.tsx` - shadcn Skeleton
- `components/ui/tabs.tsx` - shadcn Tabs, TabsList, TabsTrigger, TabsContent (uses @radix-ui/react-tabs)
- `components/ui/empty.tsx` - shadcn Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent
- `lib/utils.ts` - cn() helper combining clsx + twMerge

## Decisions Made

- **mira style fallback:** shadcn@2.3.0 registry does not serve `mira` style components (404 on `https://ui.shadcn.com/r/styles/mira/card.json`). Fell back to `new-york` style which is the closest alternative. Components are fully functional; visual difference is minor padding/spacing variation. components.json style field reflects `new-york` (the actual installed style).
- **Manual components.json:** Created components.json before running shadcn commands. This caused `shadcn init` to exit early ("already exists"). Used `shadcn add` directly for component installation.
- **CSS variable color mapping:** Tailwind `extend.colors` maps all shadcn tokens (`background`, `foreground`, `card`, `muted`, etc.) to `hsl(var(--X))` — required for classes like `bg-card`, `text-muted-foreground` to resolve.
- **class-variance-authority:** The `empty` component uses `cva()` from this package; not installed by default. Added as runtime dependency.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed `.tsx` extension in App import causing TS5097**
- **Found during:** Task 2 (ThemeProvider and no-flash dark mode)
- **Issue:** Plan template used `import App from './App.tsx'` but `allowImportingTsExtensions` is not enabled in tsconfig, causing `error TS5097`
- **Fix:** Changed import to `import App from './App'` (no extension)
- **Files modified:** `entrypoints/popup/main.tsx`
- **Verification:** `pnpm run typecheck` exits 0
- **Committed in:** `3833d3a` (Task 2 commit)

**2. [Rule 3 - Blocking] Installed missing class-variance-authority for empty component**
- **Found during:** Task 1 (shadcn component installation)
- **Issue:** `empty.tsx` uses `cva()` from `class-variance-authority`; not installed by shadcn add
- **Fix:** `pnpm add class-variance-authority`
- **Files modified:** `package.json`, `pnpm-lock.yaml`
- **Verification:** `pnpm run typecheck` exits 0
- **Committed in:** `a10dcdb` (Task 1 commit)

**3. [Rule 3 - Blocking] Manually moved shadcn components to correct project path**
- **Found during:** Task 1 (shadcn component installation)
- **Issue:** `pnpm dlx shadcn@2.3.0 add` resolved `@/components/ui` as `../components/ui` relative to project root (one level up at `/Users/a.timofeev/Documents/other/components/ui/`)
- **Fix:** `mv` all four component files to `og-preview-extension/components/ui/`
- **Files modified:** `components/ui/*.tsx` (moved to correct location)
- **Verification:** `ls components/ui/` shows all four files; typecheck passes
- **Committed in:** `a10dcdb` (Task 1 commit)

**4. [Rule 1 - Bug] CSS variable declarations added to style.css**
- **Found during:** Task 1 (shadcn setup)
- **Issue:** `shadcn init` was skipped (components.json already existed); shadcn never injected CSS custom property declarations. Without `--background`, `--card`, etc., all shadcn color classes would render transparent
- **Fix:** Manually added shadcn neutral theme CSS variables for both `:root` (light) and `.dark` to `style.css` in `@layer base`
- **Files modified:** `entrypoints/popup/style.css`
- **Verification:** `@tailwind` directives preserved at top of file; typecheck passes
- **Committed in:** `a10dcdb` (Task 1 commit)

---

**Total deviations:** 4 auto-fixed (2 blocking, 2 bug)
**Impact on plan:** All auto-fixes necessary for correct operation. No scope creep. mira style fallback documented as known limitation.

## Issues Encountered

- shadcn@2.3.0 `mira` style is not in the registry — expected per plan research. new-york is the installed style.
- `pnpm dlx shadcn add` resolves path aliases from the dlx runner's perspective, not the project's vite config, causing misplaced file installation. Manual move resolved it.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All shadcn primitives ready: Card, Skeleton, Tabs, Empty available at `@/components/ui/*`
- Dark mode infrastructure complete and wired: no FOUC, runtime changes handled
- ThemeProvider in place — future popup components inherit dark mode automatically
- Tailwind purge covers `components/**` — no additional config needed for new components
- Ready for Phase 3 Plan 02: popup layout and platform card implementation

---
*Phase: 03-popup-shell*
*Completed: 2026-02-18*

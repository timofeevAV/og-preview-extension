# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-19)

**Core value:** See exactly how any page looks when shared on any platform, right now, without posting it.
**Current focus:** Prepare open-source GitHub release

## Current Position

Phase: 1 (Prepare open-source GitHub release with CI/CD, linting, contribution guidelines, and best practices)
Plan: 2 of 3 in current phase — 01-01 complete (CI/CD pipeline, .node-version, .editorconfig, packageManager, Dependabot)
Status: Executing phase 1
Last activity: 2026-02-21 -- 01-01 complete; GitHub Actions CI workflow, Dependabot config, .node-version, .editorconfig, packageManager field added

Progress: [███░░░░░░░] 33% (plan 1 of 3 complete) / Phase 1: 1/3 plans

## Performance Metrics

**Velocity:**
- Total plans completed: 12
- Average duration: ~15 min
- Total execution time: ~1.9 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 1 | ~70 min | ~70 min |
| 02-data-pipeline | 2 | ~19 min | ~9.5 min |
| 03-popup-shell | 4 | ~34 min | ~8.5 min |
| 04-core-platform-previews | 2 | ~18 min | ~9 min |
| 05-metadata-export | 3/3 | ~10 min | ~3.3 min |
| 06-extended-platform-previews | 2/2 | ~7 min | ~3.5 min |
| 07-hover-tooltip | 3/3 | ~6 min | ~2 min |
| 08-swiss-design-ui-ux | 4/4 | ~8 min | ~2 min |
| 09-fix-chrome-storage-quota | 1/1 | ~10 min | ~10 min |
| 01-prepare-oss-release | 1/3 | ~2 min | ~2 min |

**Recent Trend:**
- Last 5 plans: 06-01 (~2 min), 06-02 (~5 min), 07-01 (~3 min), 07-02 (~3 min)
- Trend: ~2-5 min for focused single-concern plans

*Updated after each plan completion*
| Phase 08 P03 | 5 | 4 tasks | 10 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: 7 phases derived from 22 requirements; popup ships before tooltip to validate demand
- [Roadmap]: Phases 4 and 5 can run in parallel (independent after Phase 3)
- [Research]: WXT + React 19 + TypeScript + Tailwind v3 (not v4 -- Shadow DOM bugs)
- [Research]: optional_host_permissions from day one to avoid CWS rejection
- [Research]: htmlparser2 + htmlmetaparser for service worker OG parsing (no DOM dependency)
- [01-01]: WXT chosen over raw bundler config for HMR, manifest generation, cross-browser targeting
- [01-01]: optional_host_permissions confirmed in generated manifest; CWS-safe from day one
- [01-01]: Extension verified working in Chrome, Edge, and Brave with HMR functional
- [02-01]: wxt/utils/storage is correct import path (not wxt/storage); storage is auto-imported in entrypoints but explicit import needed in lib/ files
- [02-01]: Boolean done flag used instead of parser.pause() in htmlparser2 — pause() availability in v10 uncertain; flag is safe and correct
- [02-01]: OgProtocolMap uses function syntax for @webext-core/messaging — ProtocolWithReturn is deprecated in v2.3.0
- [02-02]: sendMessage('getPageOgData', { tabId }, tabId) routes background -> content script; third arg is @webext-core/messaging tab routing (ExtensionSendMessageArgs = [arg?: number | SendMessageOptions])
- [02-02]: getPageOgData relay in background reuses same message type; content script handler ignores the tabId in data payload
- [03-01]: shadcn@2.3.0 mira style not in registry (404); new-york style is the installed style — acceptable fallback per research
- [03-01]: shadcn pnpm dlx add resolves @/ aliases relative to runner, not project vite config; components must be manually moved to project root
- [03-01]: CSS variable declarations must be added manually when skipping shadcn init; @layer base :root + .dark with all token definitions
- [03-01]: class-variance-authority required by empty component (cva); not auto-installed by shadcn add
- [03-02]: Vitest v4 alias resolution: @/ prefix requires vite-tsconfig-paths plugin; Vite v7 module-runner emits "Cannot find package" when aliased file is missing (correct RED-phase error, not config failure)
- [03-02]: resolveDisplayData uses || (falsy) so empty-string Twitter fields fall back to OG equivalents
- [03-02]: KNOWN_OG_FIELDS scoped to 6 required MissingFields entries (title/description/image/url/siteName/type)
- [03-03]: OgData tri-state (undefined/null/OgData): undefined=loading, null=error/restricted, OgData=fetched (including empty {})
- [03-03]: TypeScript narrowing after getOgDataStatus guard requires 'as OgData' assertion — safe because null maps to 'error' status invariantly
- [03-03]: FileSearchIcon (empty) and LockIcon (error) confirmed in @hugeicons/core-free-icons@3.1.1 free tier; ArrowDown01Icon/ArrowUp01Icon for expand toggle
- [03-04]: Text labels (X, Facebook, LinkedIn) used for platform sub-tabs -- brand icons are pro-only in hugeicons free tier; text sufficient for Phase 3 scaffolding
- [03-04]: ExpandedView carries its own w-[380px] and border-t border-border -- maintains fixed popup width and visual separation from CompactCard
- [04-01]: XCard switches layout on twitterCard === 'summary'; all other values use full 16:9 default layout
- [04-01]: Platform card directory entrypoints/popup/components/platform/ established; future cards follow same pattern
- [04-01]: XCard omits description — X only shows domain + title in feed for summary_large_image per research
- [04-01]: White overlay text (text-white, text-white/60) intentional on dark gradient; readable in both themes
- [04-02]: PreviewsTab TabsContent switched from PLATFORMS.map to explicit entries — required to render different card component per platform
- [04-02]: FacebookCard uses 1.91:1 aspect ratio; LinkedInCard uses fixed 96x96 horizontal thumbnail per platform specs
- [04-02]: extractDomain defined locally in each card file (10-line pure function) — no shared import at this stage
- [05-01]: ALL_OG_FIELDS uses required: boolean flag; KNOWN_OG_FIELDS has no required flag — different shapes kept intentionally to avoid breaking existing MissingFields.tsx import
- [05-01]: clipboardWrite needed for navigator.clipboard.writeText() in popup; downloads needed for chrome.downloads.download() — both fail silently without the manifest permission
- [05-02]: ALL_OG_FIELDS iterated (not Object.keys) in MetadataTab — ensures deterministic ordering and correct human-readable labels
- [05-02]: encodeURIComponent used for data: URL (not btoa) — btoa throws on multi-byte Unicode present in non-English OG metadata
- [05-02]: generateMetaSnippets branches on f.label.startsWith('twitter:') to emit name= for Twitter fields and property= for OG fields
- [05-02]: useRef timer guards on both copy handlers prevent stale state on rapid clicks
- [Phase 05-metadata-export]: 05-03: Single-line fix — state machine was complete; only the button label was hardcoded
- [Phase 06-extended-platform-previews]: IMessageCard omits description entirely — accurate to iMessage platform behavior
- [Phase 06-extended-platform-previews]: WhatsAppCard domain placed after title+description (bottom) — defining structural difference from Facebook card
- [Phase 06-extended-platform-previews]: FacebookMobileCard uses rounded-xl + 13px title + line-clamp-1 description as visual distinctions from desktop FacebookCard
- [06-02]: Tab overflow fix uses overflow-x-auto scrollbar-hide on TabsList with no flex-1 on triggers — tabs scroll horizontally at 380px rather than compressing
- [07-01]: content.ts renamed to content.tsx — JSX in content script requires .tsx extension for esbuild JSX transform; WXT recognizes .tsx as valid entrypoint
- [07-01]: Controller pattern: plain object passed to createShadowRootUi onMount, mutated by TooltipApp on mount to wire real show/hide — no React ref or module-level variable needed
- [07-01]: position: modal chosen for shadow host — fixed full-viewport overlay; tooltip positions internally via coordinates; avoids z-index/overflow conflicts with host page
- [07-01]: Same-origin links excluded from hover delegation — UX decision to avoid previewing current site's own pages; reversible in Plan 02
- [07-02]: Stale-fetch guard via staleRef integer counter — @webext-core/messaging v2.3.0 has no AbortSignal support; counter is simple and correct
- [07-02]: Empty OgData ({}) treated as error state — check data.title || data.description || data.image; empty object falls through to error
- [07-02]: useLayoutEffect for viewport clamping — avoids visible jump; re-runs on phase change since skeleton and card have different heights
- [07-02]: og-tooltip-card CSS class on tooltip div — enables pointer-events: auto in shadow DOM stylesheet without inline style
- [08-01]: DEFAULT_SETTINGS.hoverPreview = false — hover preview off by default for new installs
- [08-01]: getSettings spreads result[STORAGE_KEY] cast to Partial<OgPreviewSettings> — chrome type returns unknown, strict TS requires typed spread
- [08-01]: App.tsx loads settings in parallel with OgData via Promise.all — avoids sequential latency
- [08-01]: onOpenSettings is optional on CompactCard — wired in Plan 08-03
- [08-01]: ExpandedView.defaultTab defaults to 'previews' — backward compatible with existing callers
- [08-02]: setupHoverDelegation returns () => void cleanup; callers own the lifecycle
- [08-02]: onSettingsChanged unsubscribe return value intentionally ignored — WXT content script teardown handles cleanup on page unload
- [08-02]: hoverDelay change restarts delegation (cleanup + re-setup) to pick up new delay value
- [Phase 08]: applyShadowTheme() placed after ui.mount() — shadow host must be mounted before querySelector can find it
- [Phase 08]: Theme change integrated into existing onSettingsChanged listener — no duplicate listener
- [Phase 08]: EmptyState removes shadcn Empty components entirely — plain HTML sufficient for Swiss minimal aesthetic
- [Phase 08]: OgCardSkeleton uses aspectRatio style prop instead of fixed px height — responsive to container width
- [Phase 08]: shadcn pnpm dlx resolves component output to temp dir, not project root — components copied manually from parent dir to project location
- [Phase 08]: radix-ui consolidated package required for new shadcn components (switch/select/slider/label/separator/button use 'radix-ui' not '@radix-ui/react-*')
- [Phase 08]: Settings01Icon confirmed in @hugeicons/core-free-icons free tier — no fallback needed
- [09-01]: onValueCommit (not debounce/useRef timer) chosen — Radix built-in, zero timer complexity, exactly 1 write per gesture
- [09-01]: localHoverDelay state initialized from DEFAULT_SETTINGS, synced from storage in useEffect — no stale initial display
- [09-01]: Radix issue #2169 (keyboard arrow fires onValueCommit before onValueChange, stored value lags one step) accepted as minor tradeoff for a delay preference setting
- [01-01]: Single CI workflow with all checks — appropriate for project size; no matrix builds
- [01-01]: Node 22 LTS in .node-version for CI stability; local dev runs Node 25
- [01-01]: pnpm@10.26.1 pinned via packageManager field — enables corepack and pnpm/action-setup auto-detection
- [01-01]: 30-day artifact retention for main branch builds; concurrency groups cancel stale PR runs

### Roadmap Evolution

- Phase 8 added: Swiss Design UI/UX overhaul, shadcn components, settings page with hoverPreview, defaultTab, hoverDelay, theme
- Phase 9 added: Fix chrome.storage.sync MAX_WRITE_OPERATIONS_PER_MINUTE quota error — debounce hoverDelay slider writes
- Phase 1 added: Prepare open-source GitHub release with CI/CD, linting, contribution guidelines, and best practices

### Pending Todos

1. **Add best-in-class linting and formatting tooling** (tooling) — comprehensive analysis of ESLint/Biome/oxlint, Prettier/dprint, pre-commit hooks, editor config for WXT + React 19 + TS + Tailwind v4 project
2. **Move tabs above CompactCard and add toolbar icons** (ui) — persistent tab bar above CompactCard visible in all states; hover preview toggle, theme picker, settings icon to the right of tabs; Swiss design

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-21
Stopped at: Completed 01-01-PLAN.md (CI/CD pipeline, project config, Dependabot)
Resume file: None

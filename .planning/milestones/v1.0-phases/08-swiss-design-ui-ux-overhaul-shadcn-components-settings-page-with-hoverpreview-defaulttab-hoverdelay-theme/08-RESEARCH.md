# Phase 8 Research: Swiss Design UI/UX + Settings Page

## RESEARCH COMPLETE

---

## 1. Swiss Design Principles (for 380px popup)

**International Typographic Style / Swiss Design** applied to a constrained extension popup:

### Typography
- Font stack: `system-ui, -apple-system, "Helvetica Neue", sans-serif` — closest to Helvetica available in browsers
- **Hierarchy**: 3 levels max — heading (14px semibold), body (13px regular), caption (11px, muted)
- **Leading**: tight for headings (1.2), comfortable for body (1.5)
- No decorative fonts; weight and size carry hierarchy

### Grid
- **8px base unit** — all spacing multiples of 4px or 8px
- Popup width: 380px → inner content at 380px, padding 16px each side = 348px content width
- Header: 40px tall (fixed); content scrolls if needed
- Strict left alignment (no centered text blocks)

### Color
- Palette: achromatic (black/white/grays only) + one accent color used sparingly
- The existing shadcn new-york palette (oklch 0 chroma = pure grays) is already Swiss-compatible
- Borders replace shadows — `border: 1px solid var(--border)` not `box-shadow`
- Use `text-muted-foreground` for secondary info, not faded colors

### Whitespace
- Generous: sections separated by 16–24px, not cramped
- `Separator` component (1px rule) instead of visual noise
- Image area stays full-bleed (no rounded corners on the OG image)

### Components
- Sharp or minimal-radius borders (current `--radius: 0.625rem` → may reduce to 4px for Swiss feel)
- Tabs: uppercase trigger labels, `tracking-wide` or `tracking-widest`
- Buttons: text-only or icon-only preferred over icon+text combos for compact UI

---

## 2. shadcn MCP — Available Components (relevant to this phase)

**Currently installed** (`components/ui/`):
- `card.tsx`, `skeleton.tsx`, `tabs.tsx`, `empty.tsx`

**Need to add via shadcn MCP/CLI:**
- `switch` — hoverPreview toggle (on/off)
- `select` — defaultTab picker, theme picker
- `slider` — hoverDelay adjustment
- `label` — setting row labels
- `separator` — divides setting sections
- `button` — for navigation (Back, gear icon)

**Add command (via CLI):**
```bash
pnpm dlx shadcn@latest add switch select slider label separator button
```

---

## 3. Settings Infrastructure

### Storage: chrome.storage.sync vs local
- **Use `chrome.storage.sync`** — user preferences should sync across devices
- Quota: 8KB per key, 100KB total — more than enough
- API: `chrome.storage.sync.get(defaults, callback)` and `chrome.storage.sync.set(changes)`

### Settings type + defaults
```ts
interface OgPreviewSettings {
  hoverPreview: boolean;    // default: false (OFF by default as requested)
  defaultTab: 'previews' | 'metadata';  // default: 'previews'
  hoverDelay: number;       // ms, default: 300, range: 0–2000
  theme: 'system' | 'light' | 'dark';  // default: 'system'
}

const DEFAULT_SETTINGS: OgPreviewSettings = {
  hoverPreview: false,
  defaultTab: 'previews',
  hoverDelay: 300,
  theme: 'system',
};
```

### Settings lib (lib/settings.ts)
```ts
export async function getSettings(): Promise<OgPreviewSettings>
export async function setSetting<K extends keyof OgPreviewSettings>(key: K, value: OgPreviewSettings[K]): Promise<void>
export function onSettingsChanged(cb: (changes: Partial<OgPreviewSettings>) => void): () => void
```

### Messaging to content script
- When settings change in popup, content script needs to react
- Use `chrome.storage.onChanged` listener in content script (already has access to chrome.storage API)
- NO messaging needed — storage events fire in all contexts

---

## 4. Content Script Settings Integration

### hoverPreview: false by default
- Content script should read `hoverPreview` at init
- If `false` → skip `setupHoverDelegation()` entirely, mount shadow DOM but don't wire hover
- If later toggled `true` via settings → `chrome.storage.onChanged` fires → call `setupHoverDelegation()`
- Need guard: only call `setupHoverDelegation` once (track `delegationSetup` flag)

### hoverDelay: dynamic
- Currently hardcoded `300` in `setTimeout` inside `setupHoverDelegation`
- Refactor: `setupHoverDelegation(controller, delayMs: number)`
- On `hoverDelay` change → need to restart delegation with new delay
- Simplest: teardown + re-setup → use `AbortController` for event listeners, or store delay in a mutable ref object

### Implementation pattern
```ts
let delegationCleanup: (() => void) | null = null;

async function init(ctx, controller) {
  const settings = await getSettings();
  if (settings.hoverPreview) {
    delegationCleanup = setupHoverDelegation(controller, settings.hoverDelay);
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    const newHover = changes.hoverPreview?.newValue;
    const newDelay = changes.hoverDelay?.newValue;

    if (newHover === false && delegationCleanup) {
      delegationCleanup(); delegationCleanup = null;
    }
    if (newHover === true && !delegationCleanup) {
      delegationCleanup = setupHoverDelegation(controller, settings.hoverDelay);
    }
    if (newDelay !== undefined && delegationCleanup) {
      delegationCleanup();
      delegationCleanup = setupHoverDelegation(controller, newDelay);
    }
  });
}
```

### setupHoverDelegation returns cleanup
```ts
function setupHoverDelegation(controller: Controller, delayMs: number): () => void {
  // add event listeners
  // return () => { removeEventListener ... }
}
```

---

## 5. Settings Page UI Architecture

### Navigation model
- `App.tsx` view state: `'main' | 'settings'`
- Gear icon button in popup header (top-right corner of CompactCard header area)
- Settings page replaces entire popup content
- Back arrow `←` in settings header returns to `'main'`

### Settings page layout (Swiss Design)
```
┌─────────────────────────────────────────┐
│  ← Settings                             │  ← 40px header
├─────────────────────────────────────────┤
│  Hover Preview                          │
│  Show link previews on hover   [Switch] │
├─────────────────────────────────────────┤
│  Default Tab                            │
│  [Select: Previews / Metadata]          │
├─────────────────────────────────────────┤
│  Hover Delay                            │
│  300 ms                   [————●————]  │
├─────────────────────────────────────────┤
│  Theme                                  │
│  [Select: System / Light / Dark]        │
└─────────────────────────────────────────┘
```

- Each setting: `Label` (bold, 13px) + description (11px, muted) + control on same row
- `Separator` between sections
- Width: 380px (same as popup, no width change)

### Components mapping
| Setting | shadcn Component |
|---------|-----------------|
| hoverPreview | `Switch` |
| defaultTab | `Select` |
| hoverDelay | `Slider` + numeric display |
| theme | `Select` with 3 options |

---

## 6. Theme Setting

### How it works
- `theme: 'system'` → current behavior (read `prefers-color-scheme`)
- `theme: 'light'` → remove `.dark` class unconditionally
- `theme: 'dark'` → add `.dark` class unconditionally

### Popup (main.tsx change)
```ts
async function applyTheme() {
  const { theme } = await getSettings();
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
  document.documentElement.classList.toggle('dark', isDark);
}
```

### Shadow DOM / tooltip theme
- Current: uses `@media (prefers-color-scheme: dark)` — can't override via class
- To support theme override: set `data-theme="dark|light"` attribute on shadow HOST element from content script
- In tooltip/style.css: `[data-theme="dark"] :host { ... }` — but this doesn't work across shadow DOM
- **Better approach**: use `:host([data-force-theme="dark"])` targeting via content script
- Content script reads theme setting and sets attribute on shadow host element
- CSS: `:host([data-theme="dark"]) { --background: oklch(0.145 0 0); ... }` (no media query needed for forced theme)
- For `theme: 'system'`, keep `@media (prefers-color-scheme: dark)` fallback

---

## 7. defaultTab Integration

- `ExpandedView` currently has `defaultValue="previews"` hardcoded in `<Tabs>`
- Phase 8: read `defaultTab` from settings and pass as prop
- `ExpandedView` receives `defaultTab: 'previews' | 'metadata'` prop
- `App.tsx` loads settings and passes `defaultTab` to `ExpandedView`

---

## 8. shadcn Switch Component Details

The `Switch` component is a Radix UI primitive. In new-york style:
- Renders as a toggle pill with thumb
- States: checked/unchecked, disabled
- Usage: `<Switch checked={value} onCheckedChange={setValue} id="hover-preview" />`
- Pair with `<Label htmlFor="hover-preview">` for accessibility

## 9. Slider Component Details

The `Slider` is a Radix UI `SliderPrimitive`:
- `<Slider value={[300]} onValueChange={([v]) => setDelay(v)} min={0} max={2000} step={50} />`
- Displays a track + thumb
- Show current value as text next to slider

---

## Summary of Changes

| File | Change |
|------|--------|
| `lib/settings.ts` | NEW — settings types, defaults, get/set/onChange |
| `entrypoints/content.tsx` | Read settings at init, conditional delegation, storage listener |
| `entrypoints/popup/App.tsx` | Add `view: 'main' \| 'settings'` state, load settings |
| `entrypoints/popup/components/SettingsPage.tsx` | NEW — settings UI |
| `entrypoints/popup/components/CompactCard.tsx` | Add gear icon, Swiss Design |
| `entrypoints/popup/components/ExpandedView.tsx` | Accept defaultTab prop |
| `entrypoints/popup/main.tsx` | Apply theme from settings |
| `entrypoints/tooltip/style.css` | Add `[data-theme="dark"]` forced dark override |
| `components/ui/{switch,select,slider,label,separator,button}.tsx` | NEW via shadcn CLI |

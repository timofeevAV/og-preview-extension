# Phase 9: Fix chrome.storage.sync MAX_WRITE_OPERATIONS_PER_MINUTE Quota Error — Research

**Researched:** 2026-02-19
**Domain:** Chrome extension storage quotas, React debounce patterns, Radix UI Slider events
**Confidence:** HIGH

## Summary

The bug is straightforward: the hoverDelay `<Slider>` in `SettingsPage.tsx` fires `onValueChange` on every tick while dragging, which calls `update('hoverDelay', v)` → `setSetting('hoverDelay', v)` → `chrome.storage.sync.set(...)` on every pixel of movement. With a `step={50}` and a `max={2000}`, dragging from 0 to 2000 produces up to 40 writes in a single gesture. The quota is 120 writes/minute, so a couple of fast drags will exceed it.

There are two independent strategies to fix this. The first is to use the Radix UI Slider's built-in `onValueCommit` callback, which fires only when the user releases the thumb (pointer events) or as soon as a key press resolves (keyboard). This eliminates all intermediate writes during a drag without adding any debounce timer. The second is the classical "local state + debounced write" pattern: maintain a local `useState` for the displayed value (updated immediately in `onValueChange` for visual responsiveness), and call `setSetting` only after a debounce period (e.g., 500 ms of inactivity). The `onValueCommit` approach is simpler and more correct for this use case, but has a known quirk with keyboard interactions (see Pitfalls).

The fix is entirely contained in `SettingsPage.tsx`. No new dependencies are needed. No changes to `lib/settings.ts`, `content.tsx`, or `setupHoverDelegation` are required — the content script already responds to `onSettingsChanged` reactively, so it will pick up the final committed value just as before.

**Primary recommendation:** Use `onValueCommit` for the storage write, keep `onValueChange` for local display-only state update. This is the canonical pattern for Radix sliders when you want to defer expensive side effects.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@radix-ui/react-slider` (via `radix-ui`) | 1.3.6 | Slider primitive with `onValueChange` + `onValueCommit` | Already installed; provides the right events |
| React `useState` + `useRef` | 19.x | Local display state, ref for debounce timer | Built-in; no extra dependency needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `use-debounce` (npm) | N/A | `useDebouncedCallback` hook | Only if `onValueCommit` is insufficient and a debounce timer is preferred over the commit event |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `onValueCommit` | `useRef` + `setTimeout` debounce on `onValueChange` | More code, same result; debounce is needed if you need finer control over delay duration |
| `onValueCommit` | `use-debounce` npm package | Adds dependency for a 10-line custom hook |
| `onValueCommit` | `lodash.debounce` | Adds heavy dependency; overkill for a single slider |

**Installation:**
```bash
# No new packages required — onValueCommit approach uses only what's already installed
# If debounce approach preferred:
pnpm add use-debounce
```

## Architecture Patterns

### Recommended Project Structure
No structural changes. The fix lives entirely within:
```
entrypoints/popup/components/SettingsPage.tsx   # slider change handler
```

Optionally, a reusable debounce hook could live at:
```
lib/hooks/useDebounce.ts   # only if debounce approach chosen
```

### Pattern 1: onValueCommit — Defer storage write to commit event

**What:** Split the slider's display update (`onValueChange`) from the storage write (`onValueCommit`). The slider becomes a controlled component backed by local state for instant feedback, with storage written only on commit.

**When to use:** When a Radix slider is the source of input and the only goal is reducing write frequency.

**Example:**
```tsx
// Source: @radix-ui/react-slider type definitions + Radix Primitives docs
// https://www.radix-ui.com/primitives/docs/components/slider

function SettingsPage({ onBack }: SettingsPageProps) {
  const [settings, setSettings] = useState<OgPreviewSettings | null>(null);
  // Local state for slider — updated on every tick for instant visual feedback
  const [localHoverDelay, setLocalHoverDelay] = useState<number>(300);

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s);
      setLocalHoverDelay(s.hoverDelay);
    });
  }, []);

  // ...

  return (
    <Slider
      value={[localHoverDelay]}
      onValueChange={([v]) => setLocalHoverDelay(v)}        // instant UI update (no storage)
      onValueCommit={([v]) => update('hoverDelay', v)}      // storage write on drag-end only
      min={0}
      max={2000}
      step={50}
    />
  );
}
```

### Pattern 2: Local state + debounced storage write (alternative)

**What:** Keep `onValueChange` but debounce the `setSetting` call using a `useRef`-based timer.

**When to use:** When you need writes to happen after a delay rather than strictly on pointer release (e.g., for keyboard-driven sliders where `onValueCommit` fires too eagerly).

**Example:**
```tsx
// Source: https://www.developerway.com/posts/debouncing-in-react
// Pattern: useRef timer, cancel on each new value

function SettingsPage({ onBack }: SettingsPageProps) {
  const [localHoverDelay, setLocalHoverDelay] = useState(300);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleHoverDelayChange(v: number) {
    setLocalHoverDelay(v);                           // instant display
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      update('hoverDelay', v);                       // debounced storage write
    }, 500);
  }

  // Cleanup on unmount
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  return (
    <Slider
      value={[localHoverDelay]}
      onValueChange={([v]) => handleHoverDelayChange(v)}
      min={0} max={2000} step={50}
    />
  );
}
```

### Anti-Patterns to Avoid

- **Calling `setSetting` directly in `onValueChange` without debounce:** This is the current broken implementation — every tick fires a `chrome.storage.sync.set`.
- **Using `onValueCommit` alone without local state:** The slider will appear frozen during drag because `settings.hoverDelay` only updates when storage responds. A local state must drive the `value=` prop.
- **Debouncing with `useCallback` + `useMemo` without `useRef` for the latest value:** Stale closure problem — the debounced function captures an old value of `v` if `useMemo` dependencies are not handled correctly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Slider drag-end detection | Custom `onPointerUp` / `onMouseUp` handlers on the slider | `onValueCommit` from Radix | Radix handles keyboard, pointer, and touch correctly; `onPointerUp` misses keyboard arrow key interactions |
| Debounce utility | Custom debounce function | `useRef` + `setTimeout` (4 lines) or `use-debounce` | Edge cases: component unmount, rapid re-renders, stale closures |

**Key insight:** Radix UI specifically added `onValueCommit` for this exact use case — server writes / expensive operations after drag-end. Using it is idiomatic and requires zero extra dependencies.

## Common Pitfalls

### Pitfall 1: Frozen Slider During Drag
**What goes wrong:** Slider thumb jumps back to previous value on every frame while dragging.
**Why it happens:** The `value=` prop is sourced from `settings.hoverDelay`, which only updates after `chrome.storage.sync.set` resolves (async, round-trip to storage). With `onValueCommit`, no update arrives at all during drag.
**How to avoid:** Maintain a `localHoverDelay` state. Drive `value=` from local state, not from `settings`. Sync local state from `settings` only on initial load.
**Warning signs:** Slider "snaps back" on drag.

### Pitfall 2: onValueCommit Keyboard Ordering Bug
**What goes wrong:** When user presses arrow keys, `onValueCommit` fires _before_ `onValueChange` in Radix (known issue: [#2169](https://github.com/radix-ui/primitives/discussions/2169)). This means the commit callback receives the value from the _previous_ step when keyboard is used.
**Why it happens:** Radix event ordering asymmetry between pointer and keyboard: pointer = `onValueChange*(N)` then `onValueCommit(1)`, keyboard = `onValueCommit(1)` then `onValueChange(1)`.
**How to avoid:** For keyboard-driven changes, rely on the `onValueChange` handler to save state and debounce it. Or accept that keyboard-triggered writes will be one step behind (a minor UX issue for a delay setting). The combined pattern — `onValueChange` for local state + `onValueCommit` for storage — means keyboard writes will correctly use the value from `onValueCommit`. Test this manually.
**Warning signs:** Keyboard arrow key adjustments save one increment behind the displayed value.

### Pitfall 3: Storage Write Quota on Fast Repeated Opens
**What goes wrong:** Even with `onValueCommit`, if a user rapidly opens and closes the popup while the debounce timer is pending, the pending write fires after popup close.
**Why it happens:** `setTimeout` in a popup survives popup close? Actually — no. Chrome extension popups unload when closed, which cancels all timers. This is not a real issue for the debounce approach. For `onValueCommit`, there are no pending timers. This is a non-issue in practice.

### Pitfall 4: Stale Closure in Debounced Callback
**What goes wrong:** The debounced callback reads an old value of `v` because it was closed over at creation time.
**Why it happens:** If `useCallback` is used to memoize the debounced function, the closure captures the initial value. On re-render the old debounced instance is returned.
**How to avoid:** Use the `useRef` pattern — store the latest callback in a ref, create the debounced wrapper once with `useMemo`. See the `developerway.com` pattern in Code Examples.

### Pitfall 5: setSetting Read-Modify-Write Race
**What goes wrong:** Rapid writes to storage cause race conditions because `setSetting` does `getSettings()` first (a full read), then writes. Two concurrent `setSetting('hoverDelay', ...)` calls could interleave.
**Why it happens:** Current `setSetting` implementation in `lib/settings.ts:27-35` does an async `getSettings()` before each `set`. Two concurrent calls both read the same old value and one overwrites the other's change.
**How to avoid:** With the fix in place (only one write per drag gesture via `onValueCommit`, or one write per 500 ms debounce), concurrent calls become practically impossible for a single user. This race is not a new bug introduced by the fix.

## Code Examples

Verified patterns from official sources:

### onValueCommit — Full Pattern for SettingsPage
```tsx
// Source: @radix-ui/react-slider dist/index.d.ts (onValueCommit confirmed in v1.3.6)
// Source: https://www.radix-ui.com/primitives/docs/components/slider

// In SettingsPage component:
const [settings, setSettings] = useState<OgPreviewSettings | null>(null);
const [localHoverDelay, setLocalHoverDelay] = useState<number>(DEFAULT_SETTINGS.hoverDelay);

useEffect(() => {
  getSettings().then((s) => {
    setSettings(s);
    setLocalHoverDelay(s.hoverDelay);
  });
}, []);

// ...

<Slider
  value={[localHoverDelay]}
  onValueChange={([v]) => setLocalHoverDelay(v)}      // local state only — no storage
  onValueCommit={([v]) => update('hoverDelay', v)}    // single write on release
  min={0}
  max={2000}
  step={50}
  className="w-full"
/>

// Display value still reads from localHoverDelay (not settings.hoverDelay):
<span className="text-xs tabular-nums text-muted-foreground min-w-[52px] text-right">
  {localHoverDelay} ms
</span>
```

### useRef-based debounce (no external library)
```tsx
// Source: https://www.developerway.com/posts/debouncing-in-react
import { useRef, useEffect } from 'react';

function useDebounce<T extends (...args: Parameters<T>) => void>(callback: T, delay: number): T {
  const callbackRef = useRef(callback);
  useEffect(() => { callbackRef.current = callback; }, [callback]);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  return ((...args: Parameters<T>) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => callbackRef.current(...args), delay);
  }) as T;
}

// Usage:
const debouncedSave = useDebounce((v: number) => update('hoverDelay', v), 500);

// Slider:
<Slider
  value={[localHoverDelay]}
  onValueChange={([v]) => { setLocalHoverDelay(v); debouncedSave(v); }}
  min={0} max={2000} step={50}
/>
```

### chrome.storage.sync quota verification
```typescript
// chrome.storage.sync limits (confirmed from official docs):
// MAX_WRITE_OPERATIONS_PER_MINUTE = 120 (2 writes/second ceiling)
// MAX_WRITE_OPERATIONS_PER_HOUR   = 1800 (1 every 2 seconds)
//
// Step=50, max=2000: 40 possible values → a drag from 0→2000 = 40 writes in ~1s
// 40 writes >> 2 writes/second sustained → quota exceeded
//
// With onValueCommit: 40 writes → 1 write per drag gesture
// With 500ms debounce: 40 writes → ~1 write per 500ms rest
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Debounce via `lodash.debounce` in class components | React hook + `useRef` timer or `onValueCommit` | React Hooks era (2019+) | No lodash dependency needed |
| Manual `onMouseUp` for drag-end detection | `onValueCommit` from Radix | Radix UI added it for this use case | Handles keyboard, pointer, touch correctly |

**Deprecated/outdated:**
- `event.persist()` in React: This was required in React <17 for synthetic event pooling. React 17+ removed event pooling — `event.persist()` is a no-op. Not relevant here since we receive a `number[]`, not an event.

## Open Questions

1. **Which fix approach to use: `onValueCommit` vs debounce?**
   - What we know: `onValueCommit` is simpler and more semantically correct. It fires exactly once when the user releases. Debounce adds a timer delay and handles keyboard more predictably.
   - What's unclear: Whether the keyboard ordering bug in `onValueCommit` (#2169) is still present in `@radix-ui/react-slider@1.3.6`.
   - Recommendation: Use `onValueCommit` as primary. Accept that keyboard arrow key commits may be one step behind (visible values are correct via `onValueChange`→local state). Test manually. If keyboard behavior is unacceptable, switch to the debounce approach.

2. **Should the ms display label source from `localHoverDelay` or `settings.hoverDelay`?**
   - What we know: Currently it reads `settings.hoverDelay` which only updates after the async write completes.
   - What's unclear: Whether there is any visible lag with `onValueCommit` approach.
   - Recommendation: Source the display from `localHoverDelay` for instant feedback during drag. This is consistent with how the slider's `value=` prop is driven.

3. **Does content.tsx need any changes?**
   - What we know: `content.tsx` listens to `onSettingsChanged` and restarts `setupHoverDelegation` when `hoverDelay` changes. This reactive listener will fire once per storage write.
   - What's unclear: Nothing — this is fine as-is. Fewer writes = fewer restarts of delegation = better.
   - Recommendation: No changes to `content.tsx`.

## Sources

### Primary (HIGH confidence)
- `@radix-ui/react-slider@1.3.6` type definitions — `/node_modules/.pnpm/@radix-ui+react-slider@1.3.6.../dist/index.d.ts` — confirmed `onValueCommit?(value: number[]): void` exists
- Chrome official storage API docs — https://developer.chrome.com/docs/extensions/reference/api/storage — confirmed quota limits
- Radix UI Primitives docs — https://www.radix-ui.com/primitives/docs/components/slider — confirmed `onValueCommit` purpose

### Secondary (MEDIUM confidence)
- Radix UI discussion #2169 — https://github.com/radix-ui/primitives/discussions/2169 — keyboard/pointer event ordering asymmetry
- developerway.com debounce article — https://www.developerway.com/posts/debouncing-in-react — useRef debounce pattern
- usehooks-ts useDebounceCallback — https://usehooks-ts.com/react-hook/use-debounce-callback — wraps lodash debounce

### Tertiary (LOW confidence)
- WebSearch results on chrome extension storage debounce best practices — general pattern confirmation only, no specific authority

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `onValueCommit` confirmed in installed type definitions; no new packages needed
- Architecture: HIGH — controlled slider + local state pattern is standard React; Radix event semantics confirmed
- Pitfalls: MEDIUM — keyboard ordering bug confirmed in community discussion; quota math is verified from official docs; stale closure pitfall is well-known React pattern

**Research date:** 2026-02-19
**Valid until:** 2026-05-19 (stable APIs; Radix UI moves slowly)

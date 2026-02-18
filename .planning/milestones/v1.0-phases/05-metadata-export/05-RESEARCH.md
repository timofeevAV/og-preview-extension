# Phase 5: Metadata & Export - Research

**Researched:** 2026-02-18
**Domain:** Chrome Extension popup — metadata display, clipboard API, file download API, HTML snippet generation
**Confidence:** HIGH

---

## Summary

Phase 5 implements the Metadata tab that was left as a placeholder in Phase 3. It replaces the "Full metadata view coming in Phase 5" placeholder in `MetadataTab.tsx` with three distinct sections: a raw metadata table showing all `og:*` and `twitter:*` fields, a missing-fields section with per-field explanations, and an export toolbar with three actions (copy JSON, download JSON, copy HTML snippets).

All the raw data this phase needs is already available. The `OgData` type is fully defined in `lib/types.ts`, `KNOWN_OG_FIELDS` already lists the six required fields in `lib/og-display.ts`, and `ExpandedView` already passes `ogData` down (wired in Phase 4). The only structural change needed is to update `MetadataTab`'s signature to accept an `ogData: OgData` prop and pass it from `ExpandedView`.

Two Chrome API concerns require attention: (1) `navigator.clipboard.writeText()` in a popup page requires the `"clipboardWrite"` permission in `manifest.json` (WXT's `wxt.config.ts`), which is not currently declared; (2) `chrome.downloads.download()` requires the `"downloads"` permission, also not currently declared. Both permissions need to be added. The download itself works cleanly with a `data:` URL in an extension popup — no `URL.createObjectURL` needed, which avoids the MV3 service-worker blob restriction entirely.

**Primary recommendation:** Add `"clipboardWrite"` and `"downloads"` to `wxt.config.ts` manifest permissions, then implement `MetadataTab` as a self-contained component with three sections: raw metadata rows, missing-fields list, and export actions. No new npm packages needed.

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 19 | ^19.2.4 | Component rendering, `useState` for copy feedback | Already the app framework |
| TypeScript | ^5.9.3 | Typed props, keyof OgData iteration | Already configured |
| Tailwind CSS v4 | ^4.1.18 | Utility classes for layout, spacing, monospace text | Already configured |
| `OgData` type | `lib/types.ts` | Typed source of truth for all metadata fields | Already defined |
| `KNOWN_OG_FIELDS` | `lib/og-display.ts` | Six required fields with labels and descriptions | Already defined |
| `@hugeicons/core-free-icons` | 3.1.1 | Copy/download icons for export buttons | Already installed |
| shadcn/ui tokens | `style.css` | `text-muted-foreground`, `bg-muted`, `border-border`, etc. | Already established |

### No New Dependencies

| Problem | Don't Install | Reason |
|---------|---------------|--------|
| JSON formatting | `json-beautify` or similar | `JSON.stringify(data, null, 2)` is built-in and sufficient |
| Clipboard | Any clipboard library | `navigator.clipboard.writeText` works in popup with permission |
| File download | Any save-file library | `chrome.downloads.download` with data URL works in popup |
| HTML escaping | `he` or `sanitize-html` | Attribute values need only basic escaping; `"` → `&quot;` is trivial |

**No `npm install` commands required for this phase.**

---

## Architecture Patterns

### Recommended Project Structure

```
entrypoints/popup/components/
├── MetadataTab.tsx          # REPLACE placeholder — main Phase 5 component
├── ExpandedView.tsx         # MODIFY — pass ogData prop to MetadataTab
lib/
├── og-display.ts            # EXTEND — add ALL_OG_FIELDS (full field list for Phase 5)
├── types.ts                 # READ ONLY — OgData interface unchanged
wxt.config.ts                # MODIFY — add "clipboardWrite" and "downloads" permissions
```

### Pattern 1: Extend KNOWN_OG_FIELDS to ALL_OG_FIELDS

**What:** `KNOWN_OG_FIELDS` in `lib/og-display.ts` currently covers only 6 fields (the required core). Phase 5 (META-01) needs to display ALL `og:*` and `twitter:*` fields present on the page — and META-02 needs per-field explanations for all fields that can be missing. The cleanest approach is to define a new `ALL_OG_FIELDS` array alongside `KNOWN_OG_FIELDS` that covers every key in `OgData`.

**When to use:** When building the raw metadata table (META-01) and the missing-fields section (META-02) in MetadataTab.

```typescript
// lib/og-display.ts — add below KNOWN_OG_FIELDS
export const ALL_OG_FIELDS: Array<{
  key: keyof OgData;
  label: string;           // e.g. "og:title"
  description: string;     // per-field explanation for missing-fields display
  required: boolean;       // true = show in missing-fields warning
}> = [
  { key: 'title',            label: 'og:title',            description: 'Page title shown in link previews',                required: true  },
  { key: 'description',      label: 'og:description',      description: 'Summary text shown below the title',              required: true  },
  { key: 'image',            label: 'og:image',            description: 'Required for image previews on social platforms', required: true  },
  { key: 'url',              label: 'og:url',              description: 'Canonical URL of the page',                       required: true  },
  { key: 'siteName',         label: 'og:site_name',        description: 'Name of the website',                             required: true  },
  { key: 'type',             label: 'og:type',             description: 'Content type (website, article, etc.)',           required: true  },
  { key: 'locale',           label: 'og:locale',           description: 'Language/locale of the content (e.g. en_US)',     required: false },
  { key: 'imageAlt',         label: 'og:image:alt',        description: 'Alt text for the OG image (accessibility)',       required: false },
  { key: 'imageWidth',       label: 'og:image:width',      description: 'Image width in pixels (recommended: 1200)',       required: false },
  { key: 'imageHeight',      label: 'og:image:height',     description: 'Image height in pixels (recommended: 630)',       required: false },
  { key: 'imageType',        label: 'og:image:type',       description: 'MIME type of the image (e.g. image/jpeg)',        required: false },
  { key: 'twitterCard',      label: 'twitter:card',        description: 'Twitter card type (summary_large_image recommended)', required: false },
  { key: 'twitterSite',      label: 'twitter:site',        description: '@username of the website on Twitter/X',          required: false },
  { key: 'twitterCreator',   label: 'twitter:creator',     description: '@username of the content creator on Twitter/X',  required: false },
  { key: 'twitterTitle',     label: 'twitter:title',       description: 'Title override for Twitter/X (overrides og:title)', required: false },
  { key: 'twitterDescription', label: 'twitter:description', description: 'Description override for Twitter/X',           required: false },
  { key: 'twitterImage',     label: 'twitter:image',       description: 'Image override for Twitter/X cards',             required: false },
  { key: 'twitterImageAlt',  label: 'twitter:image:alt',   description: 'Alt text for Twitter/X card image',              required: false },
];
```

**Why a new array instead of replacing `KNOWN_OG_FIELDS`:** `KNOWN_OG_FIELDS` is imported by `MissingFields.tsx` in the CompactCard view, which intentionally shows only the 6 core fields in the compact view. Phase 5 has a separate, richer view with all fields. Keep both arrays.

### Pattern 2: MetadataTab Structure

**What:** A single component with three visual sections separated by dividers.
**When to use:** MetadataTab.tsx — the single Phase 5 output component.

```
┌─────────────────────────────────────┐
│ Section 1: Raw Metadata Table       │  META-01
│   og:title    "GitHub · …"          │  present fields only
│   og:description  "…"               │
│   twitter:card  summary_large_image │
│   (etc.)                            │
├─────────────────────────────────────┤
│ Section 2: Missing Fields           │  META-02
│   og:locale — Language/locale of…  │  missing fields from ALL_OG_FIELDS
│   og:image:alt — Alt text for…     │  only when fields are absent
├─────────────────────────────────────┤
│ Section 3: Export                   │  META-03 META-04 META-05
│  [Copy JSON]  [Download JSON]       │
│  [Copy <meta> snippets]             │
└─────────────────────────────────────┘
```

```typescript
// entrypoints/popup/components/MetadataTab.tsx
interface MetadataTabProps {
  ogData: OgData;
}

export function MetadataTab({ ogData }: MetadataTabProps) {
  // Three sections: present fields table, missing fields, export buttons
}
```

### Pattern 3: Present-Fields Table

**What:** Iterate ALL_OG_FIELDS, show only keys where `ogData[field.key]` is defined. Two columns: tag name (monospace) and value (truncated).

```typescript
// Section 1: only fields that have values
const presentFields = ALL_OG_FIELDS.filter(f => ogData[f.key] !== undefined);

// Render each as a two-column row
presentFields.map(f => (
  <div key={f.key} className="flex gap-2 py-1 border-b border-border last:border-0">
    <span className="font-mono text-[11px] text-muted-foreground shrink-0 w-[140px] truncate">
      {f.label}
    </span>
    <span className="text-[11px] text-foreground truncate">
      {ogData[f.key]}
    </span>
  </div>
))
```

**Note:** If `presentFields` is empty (no fields at all), show a "No metadata found" empty state.

### Pattern 4: Missing Fields Section (META-02)

**What:** Show only fields where `required: true` in ALL_OG_FIELDS AND `ogData[field.key]` is falsy.

```typescript
const missingRequired = ALL_OG_FIELDS.filter(f => f.required && !ogData[f.key]);

// Only render this section if there are missing required fields
if (missingRequired.length === 0) return null;
```

This re-uses the same data source as `MissingFields.tsx` (CompactCard), but with the richer `ALL_OG_FIELDS` definition.

### Pattern 5: Copy JSON to Clipboard (META-03)

**What:** Serialize `ogData` to formatted JSON and write to clipboard using `navigator.clipboard.writeText`.

```typescript
// Requires "clipboardWrite" in manifest permissions
const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

async function handleCopyJson() {
  const json = JSON.stringify(ogData, null, 2);
  try {
    await navigator.clipboard.writeText(json);
    setCopyState('copied');
    setTimeout(() => setCopyState('idle'), 2000);
  } catch {
    setCopyState('error');
    setTimeout(() => setCopyState('idle'), 2000);
  }
}
```

**Button label:** Show "Copied!" for 2 seconds after success, then revert to "Copy JSON".

### Pattern 6: Download JSON File (META-04)

**What:** Download a `.json` file using `chrome.downloads.download()` with a `data:` URL. This is the correct approach for MV3 extension popups.

**Why data URL instead of blob URL:** `URL.createObjectURL()` is not available in MV3 service workers. In a popup page it is technically available, but using a `data:` URL with base64 encoding is simpler and works without needing to revoke the object URL.

```typescript
// Requires "downloads" in manifest permissions
function handleDownloadJson() {
  const json = JSON.stringify(ogData, null, 2);
  const dataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(json);
  chrome.downloads.download({
    url: dataUrl,
    filename: 'og-metadata.json',
  });
}
```

**Alternative using base64** (also valid):
```typescript
const base64 = btoa(unescape(encodeURIComponent(json)));
const dataUrl = 'data:application/json;base64,' + base64;
```

Use `encodeURIComponent` variant — it handles all Unicode characters correctly; `btoa` fails on non-ASCII characters that may appear in OG metadata values.

### Pattern 7: Copy HTML Snippets (META-05)

**What:** Generate ready-to-paste `<meta>` tag HTML for all present AND missing fields.

```typescript
function generateMetaSnippets(ogData: OgData): string {
  return ALL_OG_FIELDS
    .map(f => {
      const value = ogData[f.key];
      if (value) {
        // Present field — use actual value
        return `<meta property="${f.label}" content="${escapeAttr(String(value))}" />`;
      } else if (f.required) {
        // Missing required field — placeholder
        return `<!-- missing: <meta property="${f.label}" content="..." /> -->`;
      }
      return null;
    })
    .filter(Boolean)
    .join('\n');
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
```

**Note on Twitter fields:** Twitter cards use `name` not `property`. The snippet generator must produce the correct attribute:

```typescript
const isTwitter = f.label.startsWith('twitter:');
const attr = isTwitter ? 'name' : 'property';
return `<meta ${attr}="${f.label}" content="${escapeAttr(String(value))}" />`;
```

### Pattern 8: Manifest Permission Addition (wxt.config.ts)

**What:** Add `"clipboardWrite"` and `"downloads"` to the permissions array in `wxt.config.ts`.

```typescript
// wxt.config.ts — current:
manifest: {
  permissions: ['activeTab', 'storage'],
}

// wxt.config.ts — Phase 5 change:
manifest: {
  permissions: ['activeTab', 'storage', 'clipboardWrite', 'downloads'],
}
```

**Important:** After changing `wxt.config.ts`, a fresh `pnpm build` (not just rebuild) is needed for the manifest to regenerate.

### Pattern 9: ExpandedView prop threading update

**What:** `ExpandedView` already accepts `ogData: OgData` (added in Phase 4). `MetadataTab` currently ignores it. The ONLY change to `ExpandedView.tsx` is passing `ogData` to `MetadataTab`:

```typescript
// ExpandedView.tsx — change MetadataTab render:
// Before:
<MetadataTab />
// After:
<MetadataTab ogData={ogData} />
```

### Anti-Patterns to Avoid

- **Iterating raw `Object.keys(ogData)` for the metadata table:** This produces camelCase internal keys (`twitterCard`, `imageAlt`) instead of the proper tag names (`twitter:card`, `og:image:alt`). Always iterate `ALL_OG_FIELDS` and use the `label` property for display.
- **Filtering undefined with `Object.entries(ogData).filter(...)`:** Same key-naming problem. Use `ALL_OG_FIELDS`.
- **Using `URL.createObjectURL()` for download:** Works in popup but must be revoked to avoid memory leaks, and creates an unnecessary async pattern. Use `data:` URL instead.
- **Including undefined fields in the JSON export:** The `ogData` object from the content script already omits undefined fields (normalizeOgData returns undefined, not empty strings). `JSON.stringify` skips undefined values automatically. No manual filtering needed.
- **Using `document.execCommand('copy')` as clipboard fallback:** Deprecated, removed in many contexts. Use `navigator.clipboard.writeText` with the `clipboardWrite` permission.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Clipboard write | Custom execCommand fallback | `navigator.clipboard.writeText` + `clipboardWrite` permission | execCommand deprecated; writeText is the standard |
| File download | `<a href download>` trick | `chrome.downloads.download` with data URL | `<a>` download attr blocked for cross-origin in extension popup context; chrome.downloads is the correct API |
| JSON serialization | Manual stringification | `JSON.stringify(ogData, null, 2)` | Built-in, handles all edge cases |
| HTML attribute escaping | Manual replace chain | Short `escapeAttr()` helper (5 lines) — DO write this inline | No library needed for 4 character substitutions |
| Copy feedback state | External toast library | `useState` with setTimeout | 3-line pattern, no dep needed |

**Key insight:** This phase has zero new npm dependencies. All complexity is in Chrome API permissions and correct data mapping, not library selection.

---

## Common Pitfalls

### Pitfall 1: Missing Manifest Permissions Break Silently

**What goes wrong:** `navigator.clipboard.writeText` throws a `NotAllowedError` with no useful error message in the popup UI. `chrome.downloads.download` silently does nothing. Both are easy to miss in testing.

**Why it happens:** `wxt.config.ts` currently declares only `['activeTab', 'storage']`. Neither `clipboardWrite` nor `downloads` is present.

**How to avoid:** Add both permissions to `wxt.config.ts` BEFORE writing any of the clipboard/download code. Run `pnpm build` and verify `.output/chrome-mv3/manifest.json` contains both permissions.

**Warning signs:** Copy button does nothing, no console error visible in extension popup inspector.

### Pitfall 2: MetadataTab ogData Prop Not Threaded

**What goes wrong:** `MetadataTab` renders empty or throws a runtime error because it receives `undefined` instead of `OgData`.

**Why it happens:** `ExpandedView.tsx` currently renders `<MetadataTab />` with no props. The Phase 5 task must update this call site.

**How to avoid:** First task in the phase: update `MetadataTab`'s TypeScript interface to accept `ogData: OgData`, then update the call in `ExpandedView`. TypeScript will flag the call site immediately.

**Warning signs:** TypeScript error "Expected 1 argument, but got 0" or "Property 'ogData' is missing" on the MetadataTab JSX call.

### Pitfall 3: Twitter Meta Tags Use `name` Not `property`

**What goes wrong:** HTML snippets for Twitter fields are generated as `<meta property="twitter:card" ...>` instead of `<meta name="twitter:card" ...>`. This is technically incorrect — Twitter Card tags use the `name` attribute.

**Why it happens:** All `og:*` tags use `property`. It's natural to assume the same for `twitter:*`.

**How to avoid:** The snippet generator must branch on `f.label.startsWith('twitter:')` and use `name` for Twitter fields, `property` for OG fields.

**Warning signs:** Generated snippets for Twitter fields say `property=` instead of `name=`.

### Pitfall 4: encodeURIComponent vs btoa for Download Data URL

**What goes wrong:** Using `btoa(json)` throws a `DOMException: Failed to execute 'btoa' on 'Window': The string to be encoded contains characters outside of the Latin1 range` when OG metadata contains non-ASCII characters (e.g., Chinese titles, emoji descriptions).

**Why it happens:** `btoa` is limited to Latin-1 characters. Many real-world pages have Unicode in their OG titles or descriptions.

**How to avoid:** Use `'data:application/json;charset=utf-8,' + encodeURIComponent(json)` — this handles all Unicode correctly.

**Warning signs:** Download fails or generates corrupt JSON when testing on pages with non-English content.

### Pitfall 5: ALL_OG_FIELDS vs KNOWN_OG_FIELDS Confusion

**What goes wrong:** The planner or implementer modifies `KNOWN_OG_FIELDS` to add more fields, which breaks `MissingFields.tsx` in the CompactCard view (it now shows too many missing fields in the compact view).

**Why it happens:** There's only one field registry currently; Phase 5 needs two with different scopes.

**How to avoid:** Create a NEW `ALL_OG_FIELDS` export alongside the existing `KNOWN_OG_FIELDS` in `lib/og-display.ts`. Do NOT replace or modify `KNOWN_OG_FIELDS`.

### Pitfall 6: Extension Popup vs Service Worker Context

**What goes wrong:** Trying to use `chrome.downloads.download` from the background service worker when triggered by a popup button click.

**Why it happens:** Confusion about which context runs what code.

**How to avoid:** The popup button handlers run in the popup page context (not the service worker). Call `chrome.downloads.download()` directly in the popup component's event handler. No messaging to background needed.

### Pitfall 7: Copy State Race Condition

**What goes wrong:** User clicks "Copy JSON" multiple times quickly; the 2-second reset fires and reverts "Copied!" prematurely.

**Why it happens:** Multiple `setTimeout` calls accumulate without clearing the previous one.

**How to avoid:** Store the timeout ref with `useRef` and clear before setting a new one:

```typescript
const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

async function handleCopy() {
  await navigator.clipboard.writeText(json);
  if (timeoutRef.current) clearTimeout(timeoutRef.current);
  setCopyState('copied');
  timeoutRef.current = setTimeout(() => setCopyState('idle'), 2000);
}
```

---

## Code Examples

Verified patterns from official sources and codebase inspection:

### Permission Declaration (wxt.config.ts)

```typescript
// Source: wxt.config.ts + chrome.downloads and clipboardWrite MDN docs
export default defineConfig({
  manifest: {
    name: 'OG Preview',
    description: 'Preview Open Graph cards for any webpage or link',
    version: '0.1.0',
    permissions: ['activeTab', 'storage', 'clipboardWrite', 'downloads'],
    optional_host_permissions: ['<all_urls>'],
  },
});
```

### Copy JSON to Clipboard

```typescript
// Source: MDN Clipboard API + Chrome extension popup context
// Confidence: HIGH — verified navigator.clipboard works in popup with clipboardWrite permission

const [copyJson, setCopyJson] = useState<'idle' | 'copied' | 'error'>('idle');
const copyJsonTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

async function handleCopyJson() {
  const json = JSON.stringify(ogData, null, 2);
  try {
    await navigator.clipboard.writeText(json);
    if (copyJsonTimerRef.current) clearTimeout(copyJsonTimerRef.current);
    setCopyJson('copied');
    copyJsonTimerRef.current = setTimeout(() => setCopyJson('idle'), 2000);
  } catch {
    setCopyJson('error');
  }
}
```

### Download JSON File

```typescript
// Source: chrome.downloads API docs — requires "downloads" permission in manifest
// data: URL approach works in popup page; encodeURIComponent handles Unicode

function handleDownloadJson() {
  const json = JSON.stringify(ogData, null, 2);
  const dataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(json);
  chrome.downloads.download({
    url: dataUrl,
    filename: 'og-metadata.json',
  });
}
```

### HTML Meta Snippet Generation

```typescript
// Source: OG Protocol spec (ogp.me) + Twitter Card spec — og: uses property, twitter: uses name

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function generateMetaSnippets(ogData: OgData): string {
  return ALL_OG_FIELDS
    .map(f => {
      const value = ogData[f.key];
      const attr = f.label.startsWith('twitter:') ? 'name' : 'property';
      if (value !== undefined) {
        return `<meta ${attr}="${f.label}" content="${escapeAttr(String(value))}" />`;
      } else if (f.required) {
        return `<!-- missing: <meta ${attr}="${f.label}" content="TODO" /> -->`;
      }
      return null;
    })
    .filter((line): line is string => line !== null)
    .join('\n');
}
```

### MetadataTab Component Shape

```typescript
// Full skeleton for MetadataTab.tsx
import { useState, useRef } from 'react';
import type { OgData } from '@/lib/types';
import { ALL_OG_FIELDS } from '@/lib/og-display';
import { HugeiconsIcon } from '@hugeicons/react';
// Import copy/download icons from @hugeicons/core-free-icons as available in free tier

interface MetadataTabProps {
  ogData: OgData;
}

export function MetadataTab({ ogData }: MetadataTabProps) {
  const presentFields = ALL_OG_FIELDS.filter(f => ogData[f.key] !== undefined);
  const missingRequired = ALL_OG_FIELDS.filter(f => f.required && !ogData[f.key]);

  // ... copy/download handlers

  return (
    <div className="px-3 py-3 space-y-4">
      {/* Section 1: Raw metadata table */}
      <section>
        <p className="text-xs font-medium text-muted-foreground mb-1.5">Metadata</p>
        {presentFields.length === 0 ? (
          <p className="text-xs text-muted-foreground">No metadata found</p>
        ) : (
          <div className="divide-y divide-border rounded border border-border">
            {presentFields.map(f => (
              <div key={f.key} className="flex gap-2 px-2 py-1.5 items-baseline">
                <span className="font-mono text-[10px] text-muted-foreground shrink-0 w-[132px] truncate">
                  {f.label}
                </span>
                <span className="text-[11px] text-foreground truncate min-w-0">
                  {String(ogData[f.key])}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 2: Missing fields */}
      {missingRequired.length > 0 && (
        <section>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Missing fields</p>
          <ul className="space-y-1">
            {missingRequired.map(f => (
              <li key={f.key} className="text-xs text-muted-foreground">
                <span className="font-mono text-foreground/70">{f.label}</span>
                {' — '}
                {f.description}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Section 3: Export actions */}
      <section>
        <p className="text-xs font-medium text-muted-foreground mb-1.5">Export</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleCopyJson} className="...">
            {copyJson === 'copied' ? 'Copied!' : 'Copy JSON'}
          </button>
          <button onClick={handleDownloadJson} className="...">
            Download JSON
          </button>
          <button onClick={handleCopySnippets} className="...">
            {copySnippets === 'copied' ? 'Copied!' : 'Copy <meta> tags'}
          </button>
        </div>
      </section>
    </div>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| `document.execCommand('copy')` | `navigator.clipboard.writeText()` | ~2018, now standard | Use the async Clipboard API; execCommand is deprecated |
| Blob URL for download (`URL.createObjectURL`) | `data:` URL with `encodeURIComponent` | MV3 era (2023+) | Simpler, no revocation needed, Unicode-safe |
| `btoa()` for binary-safe encoding | `encodeURIComponent()` for URI data URLs | Always was the right choice | btoa breaks on non-ASCII; encodeURIComponent handles all Unicode |

**Deprecated/outdated:**
- `document.execCommand('copy')`: Deprecated. Do not use. MDN marks it as legacy.
- `btoa(json)` for data URLs: Breaks on any non-ASCII character in OG content. Use `encodeURIComponent` instead.

---

## Open Questions

1. **Should the raw metadata table show ALL OgData fields or only those captured by the extension?**
   - What we know: `OgData` captures 17 fields. The content script (`extractOgFromDOM`) and background parser (`normalizeOgData`) both faithfully map every field present on the page.
   - What's unclear: Some pages define additional `og:` namespaces (e.g., `og:video`, `article:author`). These are NOT captured by the current parser.
   - Recommendation: Display only what's in `OgData` — the 17 fields. Document this as "known OG and Twitter fields" in the UI. Extending the parser is a future phase concern.

2. **What happens if `chrome.downloads` is not available (e.g., in a test environment)?**
   - What we know: `chrome.downloads` is always available in a real Chrome extension popup when the permission is declared.
   - What's unclear: Test environments using Vitest/jsdom won't have `chrome.downloads`.
   - Recommendation: Wrap the download call in a try/catch and guard with `if (chrome?.downloads)`. Add a note that download is not tested in unit tests (integration/visual test only).

3. **Do the export buttons need icons from @hugeicons?**
   - What we know: `@hugeicons/core-free-icons` is installed. The free tier excludes brand icons but includes general UI icons.
   - What's unclear: Whether suitable copy/download icons exist in the free tier.
   - Recommendation: Search for `Copy01Icon`, `Download01Icon` in the free tier at build time. If present, use them. If missing (as was the case with brand icons in Phase 3), fall back to text labels only. Do not install additional icon packages.

---

## Sources

### Primary (HIGH confidence)

- Project source: `lib/types.ts` — complete OgData interface (17 fields), read directly
- Project source: `lib/og-display.ts` — KNOWN_OG_FIELDS (6 fields), resolveDisplayData, getOgDataStatus
- Project source: `entrypoints/popup/components/MetadataTab.tsx` — current placeholder implementation
- Project source: `entrypoints/popup/components/ExpandedView.tsx` — prop threading context; ogData already passed
- Project source: `entrypoints/popup/components/MissingFields.tsx` — reference for missing-fields pattern
- Project source: `wxt.config.ts` — current permissions: `['activeTab', 'storage']`
- Project source: `package.json` — confirmed: no clipboard or download libraries installed
- [MDN: Interact with the Clipboard](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Interact_with_the_clipboard) — confirmed clipboardWrite permission required for popup pages; navigator.clipboard works in popup context
- [Chrome Downloads API](https://developer.chrome.com/docs/extensions/reference/api/downloads) — confirmed "downloads" permission required; data URL approach works

### Secondary (MEDIUM confidence)

- [MDN: Clipboard.writeText()](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText) — API shape and error behavior
- WebSearch: clipboardWrite in MV3 popup — confirmed permission is necessary; navigator.clipboard works in popup (not service worker)
- WebSearch: chrome.downloads data URL JSON — confirmed data: URL + encodeURIComponent pattern for MV3

### Tertiary (LOW confidence)

- WebSearch: encodeURIComponent vs btoa for data URLs — multiple sources agree encodeURIComponent is safer; LOW only because no single authoritative spec page was checked directly

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — full codebase read; no new packages needed; permissions verified via official docs
- Architecture: HIGH — all data already flows through OgData; prop threading pattern clear from existing code
- Chrome API permissions: HIGH — clipboardWrite and downloads requirements verified via MDN + Chrome docs
- Clipboard/download patterns: HIGH — standard APIs, verified behavior in popup context
- HTML snippet generation (META-05): HIGH — OG spec and Twitter Card spec are stable and well-documented

**Research date:** 2026-02-18
**Valid until:** 2026-03-20 (stable Chrome APIs; OG/Twitter spec doesn't change)

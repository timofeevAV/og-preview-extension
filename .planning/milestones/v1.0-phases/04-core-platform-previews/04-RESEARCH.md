# Phase 4: Core Platform Previews - Research

**Researched:** 2026-02-18
**Domain:** Social media link-preview card specifications (X/Twitter, Facebook, LinkedIn) + React component implementation within a 380px extension popup
**Confidence:** MEDIUM

---

## Summary

Phase 4 replaces the "coming in Phase 4" placeholders in `PreviewsTab.tsx` with three real platform card components. Each component must display a faithful simulation of how the respective platform renders a link preview using the OG/Twitter Card data already fetched in earlier phases. The popup is fixed at 380px, so the cards are constrained to that width — they are simulacra, not pixel-perfect pixel-matched replicas, but they must feel accurate to a developer checking their tags.

The three platforms have meaningfully different layouts. X/Twitter uses a large 16:9 image with a dark overlay that places the domain in the bottom-left corner of the image, with a high border-radius (~16px) and no separate text block below. Facebook uses a full-width image (16:9 / 1.91:1) with domain, title, and description below the image in a light card. LinkedIn (since January 2024) changed from a full-width image layout to a compact left-thumbnail + right-text horizontal layout for organic posts. These distinctions drive the three separate component shapes.

No new third-party libraries are needed. All data is already present in `OgData` from Phase 3. The implementation is purely a React/Tailwind CSS layout exercise using existing design tokens from the established shadcn/ui new-york theme.

**Primary recommendation:** Build three standalone components — `XCard`, `FacebookCard`, `LinkedInCard` — each receiving the full `OgData` prop, and wire them into the existing `PreviewsTab` platform tabs. Use Tailwind utility classes and the existing CSS token system. Do not install new libraries.

---

## Standard Stack

No new packages are required for this phase.

### Core (already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 19 | ^19.2.4 | Component rendering | Already the app framework |
| Tailwind CSS | ^4.1.18 (v4 in practice, though "v3" is referenced in prior decisions) | Utility-first styling | Already configured |
| shadcn/ui tokens | via style.css | Design system (colors, radius, spacing) | Already established |
| `OgData` type | lib/types.ts | Structured OG data from Phase 3 | Already defined |
| `resolveDisplayData` | lib/og-display.ts | Twitter Card field fallback logic | Already written |

**Important note on Tailwind version:** The project's `package.json` shows `tailwindcss@^4.1.18` and the style.css uses `@import 'tailwindcss'` (Tailwind v4 syntax). The prior-decisions note says "Tailwind v3 (not v4 -- Shadow DOM bugs)" but the installed version is v4. The planner should treat the project as using Tailwind v4 utility classes with the existing CSS variable token system. Shadow DOM does not apply to popup pages, so v4 should not cause issues here.

### No New Dependencies

| Problem | Don't Install | Reason |
|---------|---------------|--------|
| Platform card layouts | Any "og-preview" or "social-card" npm package | All data is local; a npm package would fetch remotely |
| Image display | No extra library | Native `<img>` with `object-fit: cover` handles all cases |
| Text truncation | No library | CSS `line-clamp` handles multi-line truncation natively |

---

## Architecture Patterns

### Recommended Project Structure

```
entrypoints/popup/components/
├── PreviewsTab.tsx          # EXISTING: tab host, wire in platform cards
├── platform/
│   ├── XCard.tsx            # NEW: X/Twitter summary_large_image card
│   ├── FacebookCard.tsx     # NEW: Facebook desktop link preview
│   └── LinkedInCard.tsx     # NEW: LinkedIn organic post link preview (2024 layout)
```

Alternatively, keep all three files flat alongside existing components — either works, but a `platform/` subfolder signals intent clearly.

### Pattern 1: Shared Card Props Interface

**What:** All three card components accept identical props — the full `OgData` object plus the resolved display data.
**When to use:** Consistent interface makes `PreviewsTab` uniform and future platforms easy to add.

```typescript
// entrypoints/popup/components/platform/XCard.tsx
import type { OgData } from '@/lib/types';
import { resolveDisplayData } from '@/lib/og-display';

interface PlatformCardProps {
  ogData: OgData;
}

export function XCard({ ogData }: PlatformCardProps) {
  const { title, description, image } = resolveDisplayData(ogData);
  const domain = ogData.url ? new URL(ogData.url).hostname.replace('www.', '') : ogData.siteName ?? '';
  // ...
}
```

**Note:** `resolveDisplayData` uses `||` (falsy), so empty-string Twitter fields fall back to OG. This is already established behavior — use it consistently in all three cards.

### Pattern 2: Domain Extraction

**What:** Each platform displays the domain differently. Extract from `ogData.url` with a fallback to `ogData.siteName`.

```typescript
function extractDomain(ogData: OgData): string {
  if (ogData.url) {
    try {
      return new URL(ogData.url).hostname.replace(/^www\./, '');
    } catch {
      // malformed URL — fall through
    }
  }
  return ogData.siteName ?? '';
}
```

This is a ~10-line utility. Do not hand-roll a complex URL parser — `new URL()` handles it.

### Pattern 3: Image with Fallback

**What:** When no image is present, show a muted placeholder rather than a broken img tag. Already established in `CompactCard.tsx`.

```typescript
// Reuse the same pattern from CompactCard:
{image ? (
  <img src={image} alt={ogData.imageAlt ?? title ?? ''} className="w-full h-full object-cover" />
) : (
  <div className="w-full h-full bg-muted flex items-center justify-center">
    <span className="text-xs text-muted-foreground">No image</span>
  </div>
)}
```

### Pattern 4: Wire Platform Cards into PreviewsTab

**What:** Replace the placeholder content in `PreviewsTab.tsx` with the actual card components. Pass `ogData` down from `ExpandedView` → `PreviewsTab` → platform card.

**The data flow change required:**
- `ExpandedView` currently receives no props.
- `App.tsx` has `ogData` in state. It renders `<ExpandedView />` with no props.
- Phase 4 must thread `ogData` down through `ExpandedView` → `PreviewsTab` → `{X,Facebook,LinkedIn}Card`.

```typescript
// App.tsx change: pass ogData to ExpandedView
{expanded && <ExpandedView ogData={ogData as OgData} />}

// ExpandedView change: accept and forward ogData
interface ExpandedViewProps { ogData: OgData }
export function ExpandedView({ ogData }: ExpandedViewProps) { ... }

// PreviewsTab change: accept ogData, pass to platform cards
interface PreviewsTabProps { ogData: OgData }
export function PreviewsTab({ ogData }: PreviewsTabProps) {
  return (
    <Tabs defaultValue="twitter" className="w-full">
      ...
      <TabsContent value="twitter"><XCard ogData={ogData} /></TabsContent>
      <TabsContent value="facebook"><FacebookCard ogData={ogData} /></TabsContent>
      <TabsContent value="linkedin"><LinkedInCard ogData={ogData} /></TabsContent>
    </Tabs>
  );
}
```

### Anti-Patterns to Avoid

- **Duplicating `resolveDisplayData` logic:** Call the existing function; do not inline field fallback logic in each card.
- **Using exact platform brand colors:** The extension uses the shadcn/ui token system. Platform cards should simulate the platform's layout structure and feel, but use the established token palette (border, muted, foreground, etc.) for light/dark compatibility, not hardcoded hex values that only work in light mode.
- **Hard-coding arbitrary pixel widths:** The popup is fixed at 380px. Cards should use `w-full` inside the parent and let the tab content manage horizontal extent. The `ExpandedView` already carries `w-[380px]`.

---

## Platform Card Specifications

### X/Twitter Card (summary_large_image layout)

**Visual structure (verified from multiple sources, MEDIUM confidence):**
- Full-width image at 16:9 aspect ratio (padding-bottom: 52.356% or `aspect-[16/9]`)
- Image has rounded corners on all sides: `border-radius: 16px` (well-established across simulators)
- Domain text overlaid at the bottom-left corner of the image, on a semi-transparent dark surface
- Domain text color: `rgb(113, 118, 123)` (muted gray) — but placed over the image
- Title: `13px`, white (displayed on top of or immediately below the dark overlay)
- Card border: `1px solid rgb(47, 51, 54)` (dark gray) — simulator uses this; in a themed component use `border border-border`
- No separate text block below the image — text is part of the image card overlay
- The domain shown is the hostname (e.g., `github.com`), not the full URL
- Description is typically NOT shown in summary_large_image (image + title + domain only)

**Alternative/simplified approach (MEDIUM confidence — cross-referenced):**
Because the X card design embeds text on the image, and the popup uses shadcn theming, a practical faithful implementation:
1. Image at `aspect-[16/9] w-full rounded-2xl overflow-hidden relative`
2. Absolute-positioned bottom overlay: `absolute bottom-0 left-0 right-0 bg-black/40 rounded-b-2xl px-3 py-2`
3. Inside overlay: domain in `text-[11px] text-white/60` + title in `text-[13px] text-white font-medium truncate`

**Fields shown:** domain (hostname), title. Description omitted (X only shows it on `summary` type, not `summary_large_image` in feed view).

**What `twitterCard` value to detect:** If `ogData.twitterCard === 'summary'`, render a smaller summary layout (thumbnail left, text right, ~144x144px image). The default and most common case is `summary_large_image`. Phase 4 scope (PLATF-01) requires the large image layout — summary variant can be treated as future work unless the phase description demands it.

---

### Facebook Card

**Visual structure (verified from multiple sources, MEDIUM confidence):**
- Full-width image at roughly 1.91:1 (same `aspect-[1.91/1]` as CompactCard) or fixed height ~260px
- Image has `border-radius: 8px` for top corners (bottom is where text is)
- Below image: light-colored text container, no border-radius on bottom
- Domain: `12px`, `text-transform: uppercase`, muted gray color → `text-[11px] uppercase text-muted-foreground`
- Title: `16px`, `font-weight: 600` (bold), foreground color, 2-line clamp → `text-[14px] font-semibold line-clamp-2`
- Description: `14px`, muted, 2-line clamp → `text-[13px] text-muted-foreground line-clamp-2`
- Card border: `1px solid border-border`, `border-radius: 8px`
- Layout order: image → domain → title → description
- Background of text area: `bg-card` or `bg-muted/30`

**Distinctive characteristic:** Domain is uppercase and small, appearing above the title. This is the key differentiator that makes the card feel like Facebook.

---

### LinkedIn Card (2024 new organic layout)

**Visual structure (MEDIUM confidence — LinkedIn changed this in Jan 2024):**
- LinkedIn deprecated full-width image previews for organic link posts in January 2024
- New layout: horizontal card — small square thumbnail on the LEFT, text stack on the RIGHT
- Thumbnail: approximately `80px × 80px` square, object-fit cover, slightly rounded corners
- Text side (right): domain (small, muted), title (medium weight), description (optional, muted small)
- Card has a border: `1px solid border-border`, `border-radius: 8px`
- Overall card padding: `12px`
- Domain: `text-[11px] text-muted-foreground`
- Title: `text-[13px] font-medium text-foreground line-clamp-2`
- Description: `text-[12px] text-muted-foreground line-clamp-2` (may be omitted if space is tight)

**Critical note:** The 2024 LinkedIn change is documented from multiple sources (Social Media Today, Postline.ai, DSMN8, LinkedIn blog). Sponsored posts still get full-width images; only organic posts use the new small-thumbnail layout. Since this is a preview extension simulating organic post appearance, use the new horizontal layout.

**Thumbnail aspect ratio:** Square (1:1). The OG image is 1.91:1 but LinkedIn crops it to a square thumbnail.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL parsing for domain | Custom regex | `new URL(ogData.url).hostname` | Handles edge cases, ports, paths correctly |
| Text truncation | JavaScript string slice | CSS `line-clamp-N` via `overflow-hidden` | Native browser, no JS, correct behavior |
| Image loading error handling | Complex error state | `onError` on `<img>` to swap to placeholder div | Simple 3-line pattern |
| Field fallback (twitter vs OG) | Inline conditionals | Existing `resolveDisplayData()` | Already tested, correct behavior |
| Theme-aware colors | Hardcoded hex values | Tailwind CSS tokens (`text-muted-foreground`, `bg-muted`, `border-border`) | Works in both light and dark mode |

**Key insight:** This phase is 90% layout CSS. The data is already fetched and structured. The risk is in layout details (aspect ratios, overlays, text clamping) not in data handling.

---

## Common Pitfalls

### Pitfall 1: OgData Props Not Threaded to PreviewsTab

**What goes wrong:** `PreviewsTab` is rendered inside `ExpandedView` which receives no props. The platform cards need `ogData` to render anything. If the developer forgets to thread props, the cards render with `undefined` and show blank.

**Why it happens:** Phase 3 built `ExpandedView` as a standalone component with no props. Phase 4 requires data flow changes.

**How to avoid:** The task order must be: (1) add `ogData` prop to `ExpandedView`, (2) add `ogData` prop to `PreviewsTab`, (3) build platform card components, (4) wire in. TypeScript will catch missing props if types are declared.

**Warning signs:** Cards that always show "No image" and empty text.

---

### Pitfall 2: X Card Dark Overlay on Light-Mode Image

**What goes wrong:** The X card design overlays dark text on the image. If the image is very light, the text becomes unreadable.

**Why it happens:** Platforms solve this with a gradient or solid semi-transparent overlay. A browser implementation without this looks broken.

**How to avoid:** Always apply a gradient/overlay div on top of the image inside the card. Use `bg-gradient-to-t from-black/60 to-transparent` or a solid `bg-black/40` at the bottom.

**Warning signs:** White or very light images where the domain/title text is invisible.

---

### Pitfall 3: Image Aspect Ratio Breaking the 380px Popup

**What goes wrong:** An image with unexpected dimensions (e.g., very tall portrait image) causes the card to expand vertically beyond popup height, making the extension feel broken.

**Why it happens:** Using `width: 100%` without constraining height allows the image to dictate height freely.

**How to avoid:** Always apply fixed aspect ratio via `aspect-[16/9]` (X), `aspect-[1.91/1]` (Facebook), or fixed `h-[80px] w-[80px]` (LinkedIn thumbnail). Use `object-cover` on the `<img>` to fill and crop.

**Warning signs:** Card appears taller than expected for certain URLs.

---

### Pitfall 4: LinkedIn Thumbnail Image is Portrait or Has No Image

**What goes wrong:** If the OG image is portrait (tall), LinkedIn's 1:1 thumbnail crops awkwardly. If there is no image at all, the left column collapses.

**Why it happens:** LinkedIn's UI handles this gracefully; a custom implementation needs explicit fallback.

**How to avoid:** The thumbnail column must always exist at fixed width. If no image, show a `bg-muted` square placeholder at the same fixed size. Apply `object-cover` to prevent distortion.

---

### Pitfall 5: `twitterCard` Type Not Considered

**What goes wrong:** A page sets `twitter:card` to `summary` (not `summary_large_image`). The X card component renders the large image layout, which looks wrong because `summary` cards use a thumbnail layout.

**Why it happens:** The component ignores `ogData.twitterCard`.

**How to avoid:** Read `ogData.twitterCard` and branch accordingly. Default to `summary_large_image` layout if the field is absent (most modern sites use large image). For Phase 4, implementing at least a basic distinction between `summary` and `summary_large_image` is warranted. A `summary` card uses a small square left-thumbnail layout similar to LinkedIn's.

---

### Pitfall 6: Domain Extraction on Relative or Missing URLs

**What goes wrong:** `ogData.url` might be `undefined`, or it might be a relative URL like `/blog/post` that causes `new URL()` to throw.

**Why it happens:** Not all pages include `og:url`. Some include malformed values.

**How to avoid:** Wrap `new URL()` in try/catch. Fall back to `ogData.siteName`, then `''`. Already described in Pattern 2 above.

---

## Code Examples

### X/Twitter Card (summary_large_image)

```typescript
// Source: research synthesis + redseam.com card tool CSS analysis
// Confidence: MEDIUM

export function XCard({ ogData }: PlatformCardProps) {
  const { title, image } = resolveDisplayData(ogData);
  const domain = extractDomain(ogData);

  return (
    <div className="w-full rounded-2xl border border-border overflow-hidden relative">
      <div className="relative aspect-[16/9] bg-muted">
        {image ? (
          <img
            src={image}
            alt={ogData.imageAlt ?? title ?? ''}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-xs text-muted-foreground">No image</span>
          </div>
        )}
        {/* Dark gradient overlay — always rendered so text is legible */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />
        {/* Domain + title over image */}
        <div className="absolute bottom-0 left-0 right-0 px-3 py-2">
          {domain && (
            <p className="text-[11px] text-white/60 truncate">{domain}</p>
          )}
          {title && (
            <p className="text-[13px] font-medium text-white truncate">{title}</p>
          )}
        </div>
      </div>
    </div>
  );
}
```

### Facebook Card

```typescript
// Source: research synthesis + ogpreview.app analysis + redseam.com CSS
// Confidence: MEDIUM

export function FacebookCard({ ogData }: PlatformCardProps) {
  const { title, description, image } = resolveDisplayData(ogData);
  const domain = extractDomain(ogData);

  return (
    <div className="w-full border border-border rounded-lg overflow-hidden">
      {/* Image */}
      <div className="aspect-[1.91/1] bg-muted">
        {image ? (
          <img src={image} alt={ogData.imageAlt ?? title ?? ''} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-xs text-muted-foreground">No image</span>
          </div>
        )}
      </div>
      {/* Text content */}
      <div className="px-3 py-2 bg-muted/30">
        {domain && (
          <p className="text-[11px] uppercase text-muted-foreground truncate mb-0.5">{domain}</p>
        )}
        {title && (
          <p className="text-[14px] font-semibold text-foreground line-clamp-2 leading-snug">{title}</p>
        )}
        {description && (
          <p className="text-[13px] text-muted-foreground line-clamp-2 mt-0.5">{description}</p>
        )}
      </div>
    </div>
  );
}
```

### LinkedIn Card (2024 organic layout)

```typescript
// Source: LinkedIn 2024 design change (Social Media Today, DSMN8, Postline.ai) + research synthesis
// Confidence: MEDIUM

export function LinkedInCard({ ogData }: PlatformCardProps) {
  const { title, description, image } = resolveDisplayData(ogData);
  const domain = extractDomain(ogData);

  return (
    <div className="w-full border border-border rounded-lg overflow-hidden flex flex-row items-stretch">
      {/* Left: small square thumbnail */}
      <div className="flex-shrink-0 w-[96px] h-[96px] bg-muted">
        {image ? (
          <img src={image} alt={ogData.imageAlt ?? title ?? ''} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
      </div>
      {/* Right: text stack */}
      <div className="flex flex-col justify-center px-3 py-2 min-w-0">
        {title && (
          <p className="text-[13px] font-medium text-foreground line-clamp-2 leading-snug">{title}</p>
        )}
        {domain && (
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{domain}</p>
        )}
      </div>
    </div>
  );
}
```

### Domain Extraction Utility

```typescript
// Recommended: define in a shared platform utility file or inside og-display.ts
export function extractDomain(ogData: OgData): string {
  if (ogData.url) {
    try {
      return new URL(ogData.url).hostname.replace(/^www\./, '');
    } catch {
      // malformed URL
    }
  }
  return ogData.siteName ?? '';
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| LinkedIn full-width image card | Left-thumbnail + right-text horizontal layout | January 2024 | The component must use the new layout, not the old one |
| Twitter link cards with text below image | X cards with text overlaid ON the image (dark overlay) | ~2023 X rebrand | The old text-below layout is no longer accurate |
| Facebook image at fixed px height | Image at 1.91:1 aspect ratio (responsive) | Ongoing standard | Use `aspect-[1.91/1]` not a fixed `h-[260px]` |

**Deprecated/outdated:**
- **LinkedIn full-width image + text below:** Was the layout before January 2024. Do not replicate this.
- **Twitter summary_large_image with text below image (separate section):** Modern X shows domain/title overlaid on the bottom of the image. Text-below is the `summary` card layout.

---

## Open Questions

1. **Twitter `summary` vs `summary_large_image` — how much to distinguish in Phase 4?**
   - What we know: Both card types exist. `ogData.twitterCard` is captured. `summary` uses a thumbnail layout; `summary_large_image` uses full-width.
   - What's unclear: Phase 4 requirements (PLATF-01) say "X/Twitter card preview matching how X renders" but don't specify whether both card types need separate layouts.
   - Recommendation: Implement `summary_large_image` as the primary layout (it is the dominant pattern). Add a simple branch: if `twitterCard === 'summary'`, show a condensed thumbnail-left layout. If absent, default to large image. This is a ~10 line addition.

2. **LinkedIn thumbnail exact pixel size**
   - What we know: New layout uses a small left thumbnail. Approximate size from research is in the 80-120px range.
   - What's unclear: LinkedIn does not publish exact rendered px dimensions officially.
   - Recommendation: Use `96px × 96px` (6rem) as the thumbnail — it matches the visual weight seen in screenshots of the 2024 change and fits comfortably in a 380px popup card.

3. **Should platform cards adapt to system dark mode?**
   - What we know: The shadcn/ui token system supports dark mode via `.dark` class on the body. The extension uses `ThemeProvider`.
   - What's unclear: Phase 4 success criteria say nothing about dark mode adaptation.
   - Recommendation: Use shadcn tokens (`text-foreground`, `bg-muted`, `border-border`) everywhere rather than hardcoded colors. This gives dark mode support for free without added complexity.

4. **X card — does description appear in `summary_large_image` feed?**
   - What we know: Official X docs say description is a supported field. Multiple sources confirm that in the actual Twitter/X feed, `summary_large_image` renders only the image + title + domain. Description may appear in expanded/detail views.
   - What's unclear: Whether the extension should show description on the X card.
   - Recommendation: Omit description from `XCard`. The image + title + domain is the accurate "in-feed" rendering. If description exists, it can be added as small muted text below the image card if product wants it — but it's not what users see on X.

---

## Sources

### Primary (HIGH confidence)
- Project source: `entrypoints/popup/components/PreviewsTab.tsx` — scaffolding to replace
- Project source: `entrypoints/popup/components/CompactCard.tsx` — image pattern to follow
- Project source: `lib/og-display.ts` — `resolveDisplayData` and `extractDomain` patterns
- Project source: `lib/types.ts` — complete `OgData` interface
- Project source: `entrypoints/popup/style.css` — Tailwind v4 with CSS variable tokens

### Secondary (MEDIUM confidence)
- [X Developer Docs — Summary Card with Large Image](https://developer.x.com/en/docs/x-for-websites/cards/overview/summary-card-with-large-image) — confirmed card type exists, field names
- [LinkedIn: Differences in image size for organic vs Sponsored](https://www.linkedin.com/help/lms/answer/a1689427) — confirms 2024 organic layout change
- [Social Media Today: LinkedIn Updates Link Previews](https://www.socialmediatoday.com/news/linkedin-updates-link-previews-organic-posts-smaller-images/717571/) — confirmed January 2024 thumbnail change
- [redseam.com OG Preview Tool](https://redseam.com/tools/og-preview/) — CSS implementation details (border-radius, font sizes, overlay colors) for Twitter, Facebook, LinkedIn cards
- [ogpreview.app Facebook Guide](https://ogpreview.app/guides/facebook-link-preview) — image/text spec for Facebook card
- [Twitter Summary Card Dimensions — dimensions.com](https://www.dimensions.com/element/twitter-summary-card) — confirms 144x144px for `summary` type

### Tertiary (LOW confidence)
- Various marketing blog posts about OG image sizes (1200x630, 1.91:1 ratio) — cross-referenced enough to treat as MEDIUM for image spec only
- LinkedIn card thumbnail exact pixel size (96px) — estimated from screenshot analysis of 2024 posts; no official measurement found

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; project structure fully read
- Architecture / data flow: HIGH — full source code inspected, prop threading pattern is clear
- Platform visual specs (X/Twitter): MEDIUM — multiple simulator implementations agree; official X docs confirm card type but not precise CSS
- Platform visual specs (Facebook): MEDIUM — multiple sources confirm uppercase domain + 1.91:1 image + title/description below
- Platform visual specs (LinkedIn 2024): MEDIUM — change confirmed by official LinkedIn help + multiple credible sources; exact thumbnail px is estimate
- Pitfalls: HIGH — derived from code inspection and known React/CSS patterns

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (stable platform specs; LinkedIn/X UI changes rarely, but watch for announcements)

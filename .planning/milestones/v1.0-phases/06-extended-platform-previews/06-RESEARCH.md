# Phase 6: Extended Platform Previews - Research

**Researched:** 2026-02-18
**Domain:** Social media link-preview card specifications (Facebook Mobile, iMessage, WhatsApp) + React component extension within an existing 380px extension popup
**Confidence:** MEDIUM (Facebook Mobile: MEDIUM, iMessage: MEDIUM-LOW, WhatsApp: MEDIUM)

---

## Summary

Phase 6 adds three more platform tabs to the existing `PreviewsTab` component: Facebook Mobile, iMessage, and WhatsApp. The foundational architecture is already established — `PreviewsTab` already hosts X, Facebook (desktop), and LinkedIn cards using the `platform/` component directory pattern. This phase follows the exact same pattern but introduces three new card components.

The most important research finding is that Facebook Mobile and Facebook Desktop render the same OG data but with a different visual layout: Facebook Mobile uses a slightly smaller card with a compact gray text box below the image (same 1.91:1 ratio), and the card is noticeably embedded/rounded differently in the feed context. The practical difference in this simulator context is subtle enough that the Facebook Mobile card can be a cosmetic variant of the existing `FacebookCard`. iMessage uses a near-square-cropped image (the card crops the og:image to roughly 1:1 or fills a fixed rectangular area) with the site domain + title displayed below — minimal metadata, no description. WhatsApp shows two layout variants in the wild: a full-width large card (image at 1.91:1, full width, title + description below) that is the primary mobile layout, and a small thumbnail-left variant used on desktop. For this extension (mobile-focus), use the full-width card.

The key risk for this phase is iMessage: Apple does not publish pixel-perfect rendering specs. The iMessage card is well-documented enough to simulate convincingly (image prominent, title below, ~44 char truncation, domain shown, slight rounded rect border), but exact pixel measurements are estimates. WhatsApp is better documented via third-party tooling. Facebook Mobile specs are derivable from the desktop Facebook behavior with known layout adjustments.

**Primary recommendation:** Build `FacebookMobileCard`, `IMessageCard`, and `WhatsAppCard` as standalone components in `entrypoints/popup/components/platform/`, following the identical prop pattern used by all Phase 4 cards. Add three new tab entries to `PreviewsTab` using explicit entries (not map). No new libraries needed.

---

## Standard Stack

No new packages are required for this phase.

### Core (already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 19 | ^19.2.4 | Component rendering | Already the app framework |
| Tailwind CSS | v4 (installed as `tailwindcss@^4.1.18`) | Utility-first styling | Already configured and in use |
| shadcn/ui tokens | via style.css | Design system (colors, radius, spacing) | Already established |
| `OgData` type | lib/types.ts | Structured OG data | Already defined |
| `resolveDisplayData` | lib/og-display.ts | Field fallback logic | Already written |

### No New Dependencies

| Problem | Don't Install | Reason |
|---------|---------------|--------|
| Platform card layouts | Any "social-card" npm package | All data is local; matches established Phase 4 pattern |
| Image display | No extra library | Native `<img>` with `object-fit: cover` handles all cases |
| Text truncation | No library | CSS `line-clamp` handles multi-line truncation natively |

---

## Architecture Patterns

### Recommended Project Structure

```
entrypoints/popup/components/
├── PreviewsTab.tsx             # EXISTING: add 3 new tab entries + imports
└── platform/
    ├── XCard.tsx               # EXISTING (Phase 4)
    ├── FacebookCard.tsx        # EXISTING (Phase 4) — desktop layout
    ├── LinkedInCard.tsx        # EXISTING (Phase 4)
    ├── FacebookMobileCard.tsx  # NEW (Phase 6): mobile news feed card
    ├── IMessageCard.tsx        # NEW (Phase 6): Apple Messages rich link card
    └── WhatsAppCard.tsx        # NEW (Phase 6): WhatsApp full-width link card
```

### Pattern 1: Shared Card Props Interface (carry over from Phase 4)

**What:** All platform cards accept `{ ogData: OgData }` — identical interface.
**When to use:** Always. Ensures `PreviewsTab` wiring is uniform.

```typescript
// Same pattern as XCard, FacebookCard, LinkedInCard
import type { OgData } from '@/lib/types';
import { resolveDisplayData } from '@/lib/og-display';

interface PlatformCardProps {
  ogData: OgData;
}

export function FacebookMobileCard({ ogData }: PlatformCardProps) {
  const { title, description, image } = resolveDisplayData(ogData);
  // ...
}
```

### Pattern 2: Domain Extraction (carry over from Phase 4)

The existing `extractDomain` utility is already defined inline in each Phase 4 card. Phase 6 cards should use the same approach:

```typescript
function extractDomain(ogData: OgData): string {
  if (ogData.url) {
    try {
      return new URL(ogData.url).hostname.replace(/^www\./, '');
    } catch {}
  }
  return ogData.siteName ?? '';
}
```

### Pattern 3: Adding Tabs to PreviewsTab

**Critical constraint from Phase 4:** `PreviewsTab` uses explicit `TabsContent` entries — NOT `PLATFORMS.map()`. Phase 6 must follow this same pattern to avoid breaking the existing render logic.

```typescript
// PreviewsTab.tsx — Phase 6 additions
import { FacebookMobileCard } from './platform/FacebookMobileCard';
import { IMessageCard } from './platform/IMessageCard';
import { WhatsAppCard } from './platform/WhatsAppCard';

// Add to TabsList (after existing LinkedIn trigger):
<TabsTrigger value="facebook-mobile" className="flex-1">FB Mobile</TabsTrigger>
<TabsTrigger value="imessage" className="flex-1">iMessage</TabsTrigger>
<TabsTrigger value="whatsapp" className="flex-1">WhatsApp</TabsTrigger>

// Add TabsContent entries:
<TabsContent value="facebook-mobile" className="p-3">
  <FacebookMobileCard ogData={ogData} />
</TabsContent>
<TabsContent value="imessage" className="p-3">
  <IMessageCard ogData={ogData} />
</TabsContent>
<TabsContent value="whatsapp" className="p-3">
  <WhatsAppCard ogData={ogData} />
</TabsContent>
```

**Tab label problem:** With 6 tabs total (X, Facebook, LinkedIn, FB Mobile, iMessage, WhatsApp), the `TabsList` will be very crowded in 380px. Options:
1. Abbreviate: "FB", "LinkedIn", "FB Mob", "iMsg", "WA" — fitting but potentially confusing
2. Scroll: make the TabsList horizontally scrollable (overflow-x-auto, scrollbar-hidden)
3. Wrap to two rows: not standard for shadcn Tabs, would require custom layout

The scrollable approach is the cleanest extension of the existing pattern. Use `overflow-x-auto` on the `TabsList` and remove `w-full` from individual triggers.

### Anti-Patterns to Avoid

- **Duplicating `resolveDisplayData` logic:** Call the existing function, do not re-implement field fallback.
- **Using platform brand colors for backgrounds:** Use the established token system. The cards simulate layout/structure, not exact brand color palette — the extension has a consistent dark/light theme.
- **Using `PLATFORMS.map()` for rendering:** The requirement explicitly states PreviewsTab uses explicit entries. Keep it explicit.
- **Sharing one "FacebookCard" for both desktop and mobile:** The layouts are visually different enough to warrant separate components. The mobile card has a different outer shape and slightly different sizing feel.

---

## Platform Card Specifications

### Facebook Mobile Card

**Confidence: MEDIUM** — Derived from multiple marketing/dev blogs cross-referenced with ogpreview.app tooling.

**What Facebook Mobile shows (vs Facebook Desktop):**
- Facebook Mobile (iOS/Android news feed) renders link previews in a compact card embedded in the feed post
- Image: 1.91:1 aspect ratio — same as desktop, but the card feels more compact due to phone screen width
- The key visual difference: On mobile, the text area below the image is typically **more compact** with slightly smaller font and the description is often truncated to 1 line (vs 2 on desktop)
- The card on mobile has more pronounced rounded corners (the card itself is a rounded rect in the feed)
- Domain: uppercase, small, above title — same as desktop
- Title: slightly smaller font on mobile (~13px vs 14px on desktop), bold/semibold, 2-line clamp
- Description: 1-line clamp on mobile (vs 2 on desktop)
- The text area background is a slightly darker gray than the image area

**Practical visual distinction from `FacebookCard` (desktop):**
- Add `rounded-xl` (more rounded) instead of `rounded-lg`
- Title: `text-[13px]` instead of `text-[14px]`
- Description: `line-clamp-1` instead of `line-clamp-2`
- Text area: slightly more compact `py-1.5` padding instead of `py-2`

```typescript
// FacebookMobileCard — Source: research synthesis, confidence MEDIUM
export function FacebookMobileCard({ ogData }: PlatformCardProps) {
  const { title, description, image } = resolveDisplayData(ogData);
  const domain = extractDomain(ogData);

  return (
    <div className="w-full border border-border rounded-xl overflow-hidden">
      <div className="aspect-[1.91/1] bg-muted">
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
      </div>
      <div className="px-3 py-1.5 bg-muted/40">
        {domain && (
          <p className="text-[10px] uppercase text-muted-foreground truncate mb-0.5">{domain}</p>
        )}
        {title && (
          <p className="text-[13px] font-semibold text-foreground line-clamp-2 leading-snug">{title}</p>
        )}
        {description && (
          <p className="text-[12px] text-muted-foreground line-clamp-1 mt-0.5">{description}</p>
        )}
      </div>
    </div>
  );
}
```

---

### iMessage Card

**Confidence: MEDIUM-LOW** — Apple does not publish precise rendering dimensions. Derived from Apple developer forums, TN3156 technote (behind JS wall), third-party tools, and developer posts.

**What iMessage shows:**

OG fields iMessage uses:
- `og:title` (falls back to `<title>`) — displayed as the card heading
- `og:image` (falls back to `apple-touch-icon.png`) — displayed prominently
- `og:site_name` or domain from URL — shown as small text (domain/site name)
- `og:description` — NOT reliably shown in iMessage link cards; most sources indicate iMessage only displays title + image + domain

**Visual layout:**
- The card is a rounded rectangle with a white/light background (a "bubble" style)
- Image appears as a **wide banner at the top**, roughly 16:9 or close to it — filling the card width
  - Note: Some sources say iMessage crops to near-square, but current iOS 17/18 behavior shows the image at approximately the OG aspect ratio, usually wider than tall
  - The safe approach: render at a fixed aspect ratio. Multiple sources suggest ~16:9 is what appears for typical 1.91:1 OG images when letterboxed/cropped. Use `aspect-[1.91/1]` for maximum fidelity.
- Below the image: site domain/name in small muted text
- Title: medium weight, dark, ~44 char before ellipsis
- Description: NOT shown (confirmed by multiple sources — iMessage only shows image + title + domain in the card)
- Card border: light border or subtle shadow, fully rounded corners (`rounded-2xl` or `rounded-xl`)
- Character limit for title: ~44 characters before truncation (confirmed by avenuecode.com/mc.dev)

```typescript
// IMessageCard — Source: research synthesis, confidence MEDIUM-LOW
export function IMessageCard({ ogData }: PlatformCardProps) {
  const { title, image } = resolveDisplayData(ogData);
  const domain = extractDomain(ogData);

  return (
    <div className="w-full border border-border rounded-2xl overflow-hidden">
      <div className="aspect-[1.91/1] bg-muted">
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
      </div>
      <div className="px-3 py-2">
        {domain && (
          <p className="text-[11px] text-muted-foreground truncate mb-0.5">{domain}</p>
        )}
        {title && (
          <p className="text-[13px] font-medium text-foreground line-clamp-2 leading-snug">
            {title}
          </p>
        )}
      </div>
    </div>
  );
}
```

**Why no description in IMessageCard:** iMessage link previews do not display `og:description` in the card. Only title and image are shown. Displaying description would be inaccurate.

---

### WhatsApp Card

**Confidence: MEDIUM** — Verified by metatagpreview.com (described two layouts explicitly), cross-referenced with ogrilla.com guide and ogpreview.app.

**What WhatsApp shows (mobile, full-width variant):**
- WhatsApp has two layout modes:
  1. **Full-width vertical card (mobile, primary):** Image full width at top (1.91:1), title below, description below title, domain name at bottom
  2. **Thumbnail horizontal (desktop):** 90px thumbnail on left, title + description on right

- For this extension (simulating mobile WhatsApp): use the full-width vertical card
- Image: full width, 1.91:1 aspect ratio
- Below image: title (~60 char before clamp), description (~1-2 lines), domain at bottom
- Card: has a slight border or shadow, rounded corners, light gray background in text area
- Domain appears at the **bottom** of the text area (unlike Facebook where domain is at top)
- Title: ~14px, medium weight
- Description: ~12-13px, muted, 2-line clamp
- Domain: small, muted, at bottom

```typescript
// WhatsAppCard — Source: metatagpreview.com layout description, confidence MEDIUM
export function WhatsAppCard({ ogData }: PlatformCardProps) {
  const { title, description, image } = resolveDisplayData(ogData);
  const domain = extractDomain(ogData);

  return (
    <div className="w-full border border-border rounded-lg overflow-hidden">
      <div className="aspect-[1.91/1] bg-muted">
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
      </div>
      <div className="px-3 py-2 bg-muted/30">
        {title && (
          <p className="text-[14px] font-medium text-foreground line-clamp-2 leading-snug">{title}</p>
        )}
        {description && (
          <p className="text-[12px] text-muted-foreground line-clamp-2 mt-0.5">{description}</p>
        )}
        {domain && (
          <p className="text-[11px] text-muted-foreground/70 truncate mt-1">{domain}</p>
        )}
      </div>
    </div>
  );
}
```

**Key distinction from Facebook:** Domain position is at the BOTTOM of the text block, not the top. Title comes first. No uppercase styling on domain.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL parsing for domain | Custom regex | `new URL(ogData.url).hostname` | Handles edge cases (ports, paths, malformed) correctly |
| Text truncation | JS string slice | CSS `line-clamp-N` | Native, zero JS, correct behavior in all cases |
| Field fallback | Inline conditionals per card | `resolveDisplayData()` from `lib/og-display.ts` | Already tested, correct fallback behavior |
| Theme-aware colors | Hardcoded hex values | Tailwind CSS tokens (`text-muted-foreground`, `bg-muted`, `border-border`) | Works in both light and dark mode |
| Tab overflow handling | Custom scrollbar component | `overflow-x-auto` + `scrollbar-hide` (Tailwind v4) on TabsList | Standard CSS scroll pattern |

**Key insight:** Phase 6 is an additive layout exercise. The architectural pattern is identical to Phase 4. The risk is spec accuracy on under-documented platforms (iMessage), not implementation complexity.

---

## Common Pitfalls

### Pitfall 1: Tab Label Overflow with 6 Platforms

**What goes wrong:** Six tab triggers in a 380px popup using `flex-1` each gives ~63px per trigger — too narrow for labels like "Facebook", "LinkedIn", "FB Mobile", "iMessage", "WhatsApp".

**Why it happens:** The existing `TabsList` uses `w-full` with each trigger `flex-1`. Three triggers worked fine; six will overflow or truncate badly.

**How to avoid:** Switch `TabsList` to `overflow-x-auto` (horizontal scroll) and drop `flex-1` from triggers — let them size to content with a minimum width. Add `scrollbar-hide` or equivalent. Alternatively use short labels: "X", "FB", "LI", "FB Mob", "iMsg", "WA".

**Warning signs:** Tab labels squished to 1-2 characters or overflowing outside the popup.

---

### Pitfall 2: iMessage Description Showing

**What goes wrong:** Developer sees `description` in `OgData` and adds it to `IMessageCard` "for completeness."

**Why it happens:** The existing Facebook and WhatsApp cards show description, so it feels natural.

**How to avoid:** iMessage does NOT display `og:description` in link cards. Only title + image + domain are shown. Adding description makes the card inaccurate. Explicitly do NOT destructure `description` from `resolveDisplayData` in `IMessageCard`.

**Warning signs:** iMessage tab shows more text than X tab for the same URL.

---

### Pitfall 3: FacebookMobileCard Too Similar to FacebookCard (Desktop)

**What goes wrong:** The two Facebook cards look identical — users wonder why there are two Facebook tabs.

**Why it happens:** The differences are subtle (border-radius, font size, description clamp). If the developer just copies `FacebookCard`, the visual distinction disappears.

**How to avoid:** Ensure the mobile card has visibly more rounded corners, slightly tighter text, and a 1-line description cap. The visual differentiation must be legible at a glance.

**Warning signs:** Users can't distinguish which is which at first sight.

---

### Pitfall 4: WhatsApp Domain at Top Instead of Bottom

**What goes wrong:** Developer copies the `FacebookCard` pattern (domain at top, uppercase) and applies it to WhatsApp.

**Why it happens:** The Facebook card's domain-at-top pattern is prominent in the codebase. WhatsApp's domain is at the bottom, lowercase, smaller.

**How to avoid:** In `WhatsAppCard`, render domain AFTER title and description in the JSX. Do not apply `uppercase` to the domain. Do not copy the Facebook card structure directly.

**Warning signs:** WhatsApp card looks like a reskin of the Facebook card with domain at the top.

---

### Pitfall 5: Image Aspect Ratio Breaking Layout on 6-Tab View

**What goes wrong:** All three new cards use the full-width 1.91:1 image layout. If a user tabs between X (16:9), Facebook (1.91:1), and then these three (1.91:1), the tab content height changes between tabs, causing the popup to jump in height.

**Why it happens:** Different aspect ratios produce different heights. X's 16:9 is shorter than 1.91:1 for the same width.

**How to avoid:** This is a pre-existing behavior from Phase 4 (X vs Facebook already differ). Phase 6 does not introduce a new problem here — it extends the existing pattern. Document it as expected behavior.

---

### Pitfall 6: iMessage Image Aspect Ratio Mismatch with Real iOS Behavior

**What goes wrong:** Research indicates iMessage on iOS 16+ may crop or letterbox images differently than the 1.91:1 assumption.

**Why it happens:** Apple documentation is behind a JS wall and does not specify exact pixel rendering dimensions. Multiple developer forum posts note that 1200x628 stopped working correctly after iOS 16, with some suggesting the image needs to be taller or square for correct rendering.

**How to avoid:** Use 1.91:1 as the best available approximation for the card simulator. This is a known gap: the iMessage card is labeled MEDIUM-LOW confidence in the research. The card should have a visible note or the tab label could include "~approx" — but practically, 1.91:1 is what most tools (ogpreview.app, renderform) use for their iMessage preview simulation.

---

## Code Examples

### PreviewsTab — Phase 6 Extension

```typescript
// entrypoints/popup/components/PreviewsTab.tsx (updated)
// Adds 3 new imports and 3 new explicit tab entries
// Source: existing Phase 4 PreviewsTab.tsx pattern
import type { OgData } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { XCard } from './platform/XCard';
import { FacebookCard } from './platform/FacebookCard';
import { LinkedInCard } from './platform/LinkedInCard';
import { FacebookMobileCard } from './platform/FacebookMobileCard';
import { IMessageCard } from './platform/IMessageCard';
import { WhatsAppCard } from './platform/WhatsAppCard';

interface PreviewsTabProps {
  ogData: OgData;
}

export function PreviewsTab({ ogData }: PreviewsTabProps) {
  return (
    <Tabs defaultValue="twitter" className="w-full">
      <TabsList className="w-full overflow-x-auto">
        <TabsTrigger value="twitter">X</TabsTrigger>
        <TabsTrigger value="facebook">Facebook</TabsTrigger>
        <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
        <TabsTrigger value="facebook-mobile">FB Mobile</TabsTrigger>
        <TabsTrigger value="imessage">iMessage</TabsTrigger>
        <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
      </TabsList>
      <TabsContent value="twitter" className="p-3">
        <XCard ogData={ogData} />
      </TabsContent>
      <TabsContent value="facebook" className="p-3">
        <FacebookCard ogData={ogData} />
      </TabsContent>
      <TabsContent value="linkedin" className="p-3">
        <LinkedInCard ogData={ogData} />
      </TabsContent>
      <TabsContent value="facebook-mobile" className="p-3">
        <FacebookMobileCard ogData={ogData} />
      </TabsContent>
      <TabsContent value="imessage" className="p-3">
        <IMessageCard ogData={ogData} />
      </TabsContent>
      <TabsContent value="whatsapp" className="p-3">
        <WhatsAppCard ogData={ogData} />
      </TabsContent>
    </Tabs>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| iMessage used separate LPLinkMetadata API for native apps | Web pages use og: tags for iMessage rich previews | iOS 9+ | og:title + og:image is the correct approach |
| WhatsApp required a specific "thumbnail" image tag | WhatsApp reads standard og:image | ~2016 | Standard OG tags work; no special WhatsApp-specific meta needed |
| iMessage correctly displayed 1200x628 images | iMessage may require larger images (2400x1256) after iOS 16 | iOS 16 (2022) | For the card simulator, use 1.91:1 ratio as the display container regardless — this is a known approximation |
| iMessage iOS 18 now shows richer link cards for more URL types | iMessage link cards expanded to social media post URLs | iOS 18 (2024) | The og:title + og:image spec for web URLs is unchanged |

**Deprecated/outdated:**
- **WhatsApp-specific `og:image:secure_url`:** Not needed; standard `og:image` HTTPS URL suffices.
- **iMessage requiring 1200x1200 "square" images:** Older guidance; current iMessage uses whatever og:image is provided, cropped/fitted to the card container.

---

## Open Questions

1. **Tab overflow — exact layout approach**
   - What we know: 6 tabs will not fit comfortably with `flex-1` in 380px
   - What's unclear: Whether the tabs should scroll horizontally or use abbreviated labels. The Phase 4 decision was "text labels because brand icons are pro-only" — this remains true.
   - Recommendation: Use `overflow-x-auto` on `TabsList` with `scrollbar-hide` (or equivalent Tailwind v4 approach). Abbreviated labels: "X", "Facebook", "LinkedIn", "FB Mobile", "iMessage", "WhatsApp" — but shortened for the trigger text to "X", "FB", "LI", "FB Mob", "iMsg", "WApp". The planner should decide; either approach is implementable.

2. **iMessage image aspect ratio accuracy**
   - What we know: iMessage on iOS 16+ has quirks with standard 1.91:1 images. Some developers report needing 2:1 or square images for correct rendering.
   - What's unclear: The exact aspect ratio iMessage uses in its card container.
   - Recommendation: Use 1.91:1 as the simulator container aspect ratio (consistent with ogpreview.app and renderform tools). Flag in the component comment that this is an approximation. The spec is LOW-MEDIUM confidence.

3. **Facebook Mobile vs Facebook Desktop — is the distinction worth a separate tab?**
   - What we know: The visual differences are real but subtle (rounded corners, font size, description truncation).
   - What's unclear: Whether users of this extension would benefit from seeing both, or whether it creates noise.
   - Recommendation: Implement as required by PLATF-03. The requirement is explicit; implement it. The visual differences (rounded vs. less-rounded, description clamp 1 vs 2) are accurate to real-world behavior.

4. **WhatsApp description length**
   - What we know: WhatsApp shows description on mobile. ogrilla.com suggests 160 char limit; ogpreview.app guide says "under 60 chars for title."
   - What's unclear: The exact character count before truncation in WhatsApp's UI.
   - Recommendation: Use `line-clamp-2` for description in `WhatsAppCard`. This is consistent with what multiple preview tools show and is safe regardless of the exact character limit.

---

## Sources

### Primary (HIGH confidence)
- Project source: `entrypoints/popup/components/PreviewsTab.tsx` — existing tab host to extend
- Project source: `entrypoints/popup/components/platform/FacebookCard.tsx` — desktop Facebook card pattern to adapt for mobile variant
- Project source: `entrypoints/popup/components/platform/XCard.tsx` — component pattern to follow
- Project source: `.planning/phases/04-core-platform-previews/04-RESEARCH.md` — established patterns, anti-patterns, prior decisions

### Secondary (MEDIUM confidence)
- [metatagpreview.com — WhatsApp layout description](https://metatagpreview.com/blog/whatsapp-link-preview-optimization) — explicitly described mobile (vertical, image top) vs desktop (thumbnail left 90px) layouts
- [blog.avenuecode.com — iMessage rich previews](https://blog.avenuecode.com/rich-previews-of-shared-links) — confirmed og:title + og:image, minimum 150x150, recommended 1200x1200, 44-char title limit
- [mc.dev — enabling rich previews](https://mc.dev/enabling-rich-previews-of-shared-links/) — confirmed square image recommendation 1200x1200, iMessage crops to display area
- [ogpreview.app/whatsapp](https://ogpreview.app/whatsapp) — confirmed 1.91:1 aspect ratio, og:title/description/image/url required
- [Apple TN3156](https://developer.apple.com/documentation/technotes/tn3156-create-rich-previews-for-messages) — official Apple technote (content behind JS wall, not directly readable, but referenced by multiple credible dev sources)
- Multiple marketing guides (buffer.com, hootsuite.com) — cross-confirmed 1200x630 / 1.91:1 as universal OG image recommendation

### Tertiary (LOW confidence)
- Facebook Mobile-specific layout differences — no official Meta developer documentation found describing exact pixel differences between mobile and desktop link preview rendering; inferred from cross-referencing multiple marketing blog posts
- iMessage exact card aspect ratio in current iOS — reported quirks with standard 1.91:1 after iOS 16 found in Apple Developer Forums but not officially documented

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; identical pattern to Phase 4
- Architecture / PreviewsTab extension: HIGH — full source code inspected, additive pattern is clear
- Facebook Mobile card spec: MEDIUM — differences from desktop are real but exact pixel values are estimated
- iMessage card spec: MEDIUM-LOW — Apple docs not accessible directly; community consensus on general layout is clear; exact dimensions are approximations
- WhatsApp card spec: MEDIUM — two layout modes confirmed by credible source; mobile full-width layout spec is well-described
- Pitfalls: HIGH — derived from code inspection and known CSS/React patterns
- Tab overflow issue: HIGH — calculable from fixed 380px width and current trigger count

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (WhatsApp and iMessage UI updates are rare; Facebook Mobile layout changes occasionally)

# Phase 3: Popup Shell - Context

**Gathered:** 2026-02-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Browser popup with two display modes: compact preview card (shown on every toolbar click) and expanded view with two tabs — Previews and Metadata. Includes loading states, empty states, and dark mode. Platform preview content (actual cards) is Phase 4. Metadata tab content (raw data, export) is Phase 5. Phase 3 builds the shell, states, and navigation scaffolding.

</domain>

<decisions>
## Implementation Decisions

### Component library
- Use **shadcn/ui** for all UI components
- Init preset: `pnpm dlx shadcn@latest create --preset "https://ui.shadcn.com/init?base=radix&style=mira&baseColor=neutral&theme=neutral&iconLibrary=hugeicons&font=inter&menuAccent=subtle&menuColor=default&radius=default&template=vite&rtl=false" --template vite`
- Use **hugeicons** icon library (included in preset)
- Style: `mira`, base color: `neutral`

### Compact card design
- Shows: OG image + title + description
- Image layout: full-width banner spanning the top of the card
- Title and description stacked below the image
- Width and text truncation: Claude's discretion (optimize for og:image 1.91:1 aspect ratio and typical popup dimensions)

### Expand / collapse behavior
- Trigger: dedicated expand chevron/button visible in the compact card
- Expanded: popup resizes to a taller window — compact card stays at top, tabs appear below
- Collapse: same chevron/button toggles back to compact (same position, same area)
- Memory: always starts compact — no state persistence between popup opens

### Empty states
- **No OG tags found**: use shadcn `Empty` component with a placeholder icon and message "No OG metadata detected"
  - Reference: https://ui.shadcn.com/docs/components/radix/empty
- **Partial data** (some fields present, some missing): render the partial card with whatever data exists, plus a visible "missing fields" indicator section below the card
- **Missing fields in expanded view**: a list of missing field names with one-line explanations of what each field does (e.g. "og:image — required for image previews on social platforms")
- **Loading state**: shadcn `Skeleton` component shaped like the card (image placeholder + title/description lines) — shown during the brief loading window before data arrives

### Expanded view — tab structure
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

</decisions>

<specifics>
## Specific Ideas

- shadcn `Empty` component from Radix for the no-OG-tags state
- shadcn `Skeleton` for the loading state card
- Platform icon/logo tabs for switching between platform previews (not text labels)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-popup-shell*
*Context gathered: 2026-02-18*

---
created: 2026-02-19T20:24:13.205Z
title: Fix tab switching bug and consolidate missing fields to metadata tab
area: ui
files:
  - entrypoints/popup/App.tsx
  - entrypoints/popup/components/Toolbar.tsx
  - entrypoints/popup/components/CompactCard.tsx
  - entrypoints/popup/components/MetadataTab.tsx
  - entrypoints/popup/components/MissingFields.tsx
---

## Problem

Three related issues with the newly implemented toolbar tabs:

1. **Tab switching bug:** Previews and Metadata tabs don't switch on normal click. User has to hold the button, and data just appears under CompactCard without proper tab switching behavior. Likely the `onClick` handler on `TabsTrigger` (for click-to-collapse) is interfering with Radix's built-in `onValueChange` — the collapse check fires before the tab value updates.

2. **Missing fields on wrong tab:** `MissingFields` component is rendered inside `CompactCard`, making it visible in the Previews view. All metadata-related information (including missing fields) should live exclusively on the Metadata tab.

3. **Missing fields display format:** Missing fields are shown in a different format than existing metadata. They should be rendered as a table matching the existing metadata table format in `MetadataTab` for visual consistency.

## Solution

1. Fix tab switching: investigate the `onClick` → `onCollapse` interaction in `Toolbar.tsx` TabsTrigger. The collapse check likely needs to happen conditionally or be moved to avoid preventing Radix's native value change. Consider using `onValueChange` callback instead of `onClick` for collapse detection.

2. Remove `MissingFields` from `CompactCard.tsx` (and the `isPartial` prop). Render missing fields inside `MetadataTab` instead.

3. Refactor `MissingFields` to render as rows in the same table/grid format used by `MetadataTab` for existing metadata fields. Unified visual language — present fields show values, missing fields show "missing" indicator.

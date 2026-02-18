---
created: 2026-02-19T19:49:53.520Z
title: Move tabs above CompactCard and add toolbar icons
area: ui
files:
  - entrypoints/popup/App.tsx
  - entrypoints/popup/components/CompactCard.tsx
  - entrypoints/popup/components/ExpandedView.tsx
  - entrypoints/popup/components/SettingsPage.tsx
---

## Problem

Currently the tab bar (Previews/Metadata) sits inside the ExpandedView and only appears after OG data loads successfully. The tabs should be **always visible** regardless of the current state (loading, error, empty, or data loaded), placed **above** the CompactCard.

Additionally, three quick-action icons are needed **to the right of the tabs**:

1. **Hover Preview toggler** — toggles `hoverPreview` setting on/off; uses `group-data-[state=on]/toggle:fill-foreground` pattern to visually indicate active state via fill color change
2. **Theme picker** — opens a dropdown/popover with three options: System, Dark, Light
3. **Settings** — navigates to SettingsPage (same behavior as current settings button)

## Solution

- Restructure `App.tsx` layout: move the `Tabs`/`TabsList` to a persistent top bar rendered outside the conditional state (loading/error/data) block
- Create a new `Toolbar` component containing the tab triggers on the left and the three icon buttons on the right
- Use shadcn MCP to find appropriate components: `toggle` for hover preview, `dropdown-menu` or `popover` for theme picker, icon button for settings
- Use `group-data-[state=on]/toggle:fill-foreground` CSS pattern for hover preview toggle active state
- Maintain Swiss design principles: minimal chrome, clear visual hierarchy, consistent spacing
- Wire hover preview toggle to `setSetting('hoverPreview', ...)` and theme picker to `setSetting('theme', ...)`

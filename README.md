# OG Preview

[![CI](https://github.com/timofeevAV/og-preview-extension/actions/workflows/ci.yml/badge.svg)](https://github.com/timofeevAV/og-preview-extension/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/timofeevAV/og-preview-extension)](https://github.com/timofeevAV/og-preview-extension/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

See exactly how any page looks when shared on social media — without posting it.

A browser extension that previews Open Graph cards for the current page or any link you hover over. Renders pixel-accurate simulations for **X**, **Facebook** (desktop & mobile), **LinkedIn**, **iMessage**, and **WhatsApp**.

<!-- TODO: Add screenshot/demo GIF here -->
<!-- ![OG Preview screenshot](docs/screenshot.png) -->

## Features

- **Popup preview** — click the extension icon to see OG cards for the current tab
- **Hover tooltips** — hover any link to preview how it will look when shared
- **6 platform previews** — X, Facebook (desktop + mobile), LinkedIn, iMessage, WhatsApp
- **Metadata inspector** — view all OG/Twitter meta tags with copy & export
- **Missing tag detection** — highlights which tags are missing
- **Dark/light theme** — follows system preference or manual toggle
- **Configurable** — hover delay, default tab, theme preference

## Install

### From Releases

1. Download the latest `.zip` from [Releases](https://github.com/timofeevAV/og-preview-extension/releases/latest)
2. Unzip and load as an unpacked extension:
   - **Chrome**: `chrome://extensions` → Enable Developer mode → Load unpacked
   - **Edge**: `edge://extensions` → Enable Developer mode → Load unpacked
   - **Brave**: `brave://extensions` → Enable Developer mode → Load unpacked

### From Source

```bash
git clone https://github.com/timofeevAV/og-preview-extension.git
cd og-preview-extension
pnpm install
pnpm build        # Chrome
pnpm build:edge   # Edge
```

Load `.output/chrome-mv3/` (or `edge-mv3/`) as an unpacked extension.

## Development

**Prerequisites:** Node.js 22+, pnpm 10+

```bash
pnpm install
pnpm dev          # Chrome dev server with HMR
pnpm dev:edge     # Edge dev server with HMR
```

### Commands

| Command          | Description                                 |
| ---------------- | ------------------------------------------- |
| `pnpm dev`       | Chrome dev server with HMR                  |
| `pnpm build`     | Production build (Chrome)                   |
| `pnpm check`     | Run all checks (lint, format, types, tests) |
| `pnpm test`      | Unit tests (Vitest)                         |
| `pnpm typecheck` | TypeScript check                            |
| `pnpm lint`      | ESLint                                      |
| `pnpm format`    | Prettier format                             |

### Architecture

```
entrypoints/
  background.ts       # Service worker — fetches & parses OG data
  content.tsx          # Content script — DOM extraction + hover tooltip
  popup/              # React 19 popup SPA
    components/
      platform/       # Platform-specific card simulations
lib/                  # Shared utilities (types, messaging, settings, parsing)
components/           # Shared UI components (shadcn)
```

**Messaging flow:**

```
Popup           → getPageOgData → Background → Content script (DOM extraction)
Tooltip (hover) → getOgData     → Background (fetch + parse remote URL)
```

## Tech Stack

[WXT](https://wxt.dev) ・ [React 19](https://react.dev) ・ [TypeScript](https://www.typescriptlang.org) ・ [Tailwind CSS v4](https://tailwindcss.com) ・ [shadcn/ui](https://ui.shadcn.com) ・ [Vitest](https://vitest.dev) ・ [htmlparser2](https://github.com/fb55/htmlparser2)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions and guidelines. This project uses [Conventional Commits](https://www.conventionalcommits.org/) — PR titles are validated by CI.

## License

[MIT](LICENSE)

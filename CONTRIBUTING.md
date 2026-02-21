# Contributing

Thanks for your interest in contributing to OG Preview Extension!

## Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [pnpm](https://pnpm.io/) 10+

## Getting Started

```bash
git clone https://github.com/<owner>/og-preview-extension.git
cd og-preview-extension
pnpm install
pnpm dev          # Start Chrome dev server with HMR
pnpm dev:edge     # Start Edge dev server with HMR
```

## Available Scripts

| Command             | Description                            |
| ------------------- | -------------------------------------- |
| `pnpm dev`          | Start Chrome dev server with HMR       |
| `pnpm dev:edge`     | Start Edge dev server with HMR         |
| `pnpm build`        | Production build for Chrome            |
| `pnpm build:edge`   | Production build for Edge              |
| `pnpm typecheck`    | TypeScript type check (`tsc --noEmit`) |
| `pnpm lint`         | Run ESLint                             |
| `pnpm lint:fix`     | Run ESLint with auto-fix               |
| `pnpm format`       | Format code with Prettier              |
| `pnpm format:check` | Check formatting without writing       |
| `pnpm test`         | Run Vitest unit tests                  |

## Project Structure

```
entrypoints/
  background.ts       # Service worker — fetches and parses OG data
  content.tsx          # Content script — DOM extraction + hover tooltip
  popup/               # React popup SPA
    App.tsx
    components/
      platform/        # Platform-specific card previews
lib/                   # Shared utilities (types, messaging, settings, parsing)
components/            # Shared UI components (shadcn)
```

## Making Changes

1. Create a branch from `main`
2. Make your changes
3. Run all checks:
   ```bash
   pnpm lint && pnpm format:check && pnpm typecheck && pnpm test
   ```
4. Submit a pull request

## Pre-commit Hooks

This project uses `simple-git-hooks` and `lint-staged` to automatically run ESLint and Prettier on staged files before each commit. No setup required -- hooks are installed automatically via `pnpm install`.

## Code Style

- **ESLint** with `strictTypeChecked` rules and `perfectionist` import sorting
- **Prettier** with Tailwind CSS class sorting

Both are enforced automatically. No manual configuration needed.

## Pull Request Guidelines

- Use a descriptive title
- Reference related issues (e.g., "Closes #42")
- Ensure CI passes before requesting review

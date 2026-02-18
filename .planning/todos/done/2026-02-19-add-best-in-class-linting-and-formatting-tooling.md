---
created: 2026-02-19T19:24:32.426Z
title: Add best-in-class linting and formatting tooling
area: tooling
files:
  - wxt.config.ts
  - tsconfig.json
  - package.json
---

## Problem

The project has no linting or formatting tooling configured. As a Chromium MV3 extension (WXT + React 19 + TypeScript + Tailwind v4), consistent code quality and style enforcement is needed before CWS submission and any future collaboration.

Need a comprehensive analysis of the best current tools and configurations, considering:
- ESLint (flat config, v9+) vs alternatives (Biome, oxlint, etc.)
- Prettier vs alternatives (Biome formatter, dprint, etc.)
- Best practices for React 19 + TypeScript + Tailwind projects
- Import sorting and organization
- Pre-commit hooks (husky + lint-staged, lefthook, etc.)
- Editor integration (.vscode settings, extensions recommendations)
- Performance comparison of tools (speed matters for DX)
- The specific needs of a browser extension project (content scripts, service workers, shadow DOM)

## Solution

1. Research phase: comprehensive comparison of existing tools (ESLint vs Biome vs oxlint, Prettier vs Biome formatter vs dprint)
2. Evaluate trade-offs: ecosystem maturity, plugin availability, speed, config complexity
3. Select best-in-class stack for this specific project context
4. Configure with project-aware rules (React 19 patterns, WXT entrypoints, Tailwind class sorting)
5. Add pre-commit hooks for automated enforcement
6. Add editor config for consistent DX

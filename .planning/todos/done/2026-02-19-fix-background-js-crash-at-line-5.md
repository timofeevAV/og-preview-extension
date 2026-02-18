---
created: 2026-02-19T12:00:33.121Z
title: Fix background.js crash at line 5
area: general
files:
  - entrypoints/background.ts
---

## Problem

A runtime error is thrown from `background.js:5 (anonymous function)` — the compiled background service worker bundle. The user reported the error via Chrome DevTools showing a stack trace pointing to line 5 of the compiled `background.js` (the top-level IIFE wrapper).

The actual error message was not captured in the report. Likely candidates:
- Initialization failure in the background service worker (messaging setup, storage access, or fetch handler registration)
- An unchecked `runtime.lastError` from a Chrome API call
- A crash in the `getOgData` or `getPageOgData` message handlers

The background entrypoint (`entrypoints/background.ts`) is the source; `background.js` is the compiled output in `.output/chrome-mv3/`.

## Solution

1. Reproduce: open Chrome DevTools → Service Workers → inspect background and look for the actual error message in the console
2. Check Chrome's `runtime.lastError` handling in message handlers
3. Verify session storage cache access works correctly in the service worker context
4. Review WXT's `defineBackground` wrapper for any initialization order issues

import './tooltip/style.css';
import ReactDOM from 'react-dom/client';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';

import { onMessage } from '@/lib/messaging';
import { extractOgFromDOM, normalizeOgData } from '@/lib/og-parser';
import {
  getSettings,
  onSettingsChanged,
  type OgPreviewSettings,
} from '@/lib/settings';

import { TooltipApp, type Controller } from './tooltip/TooltipApp';

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  runAt: 'document_idle',

  async main(ctx) {
    // Existing Phase 2 handler — unchanged
    onMessage('getPageOgData', () => {
      const rawTags = extractOgFromDOM();
      if (Object.keys(rawTags).length === 0) {
        return null;
      }
      return normalizeOgData(rawTags);
    });

    // Tooltip: create one persistent shadow host at init time (never on hover)
    const controller: Controller = {
      show: () => {},
      hide: () => {},
    };

    const ui = await createShadowRootUi(ctx, {
      name: 'og-preview-tooltip',
      position: 'modal',
      zIndex: 2147483647,
      onMount: (container) => {
        const wrapper = document.createElement('div');
        container.append(wrapper);
        const root = ReactDOM.createRoot(wrapper);
        root.render(<TooltipApp controllerRef={controller} />);
        return root;
      },
      onRemove: (root) => {
        root?.unmount();
      },
    });
    ui.mount();

    // Read settings at init; conditionally enable hover delegation
    const settings = await getSettings();
    let cleanup: (() => void) | null = null;

    // Apply initial tooltip theme to shadow host
    function applyShadowTheme(theme: OgPreviewSettings['theme']) {
      const host = document.querySelector('og-preview-tooltip');
      if (!host) return;
      if (theme === 'system') {
        host.removeAttribute('data-theme');
      } else {
        host.setAttribute('data-theme', theme);
      }
    }
    applyShadowTheme(settings.theme);

    if (settings.hoverPreview) {
      cleanup = setupHoverDelegation(controller, settings.hoverDelay);
    }

    // Track current hoverDelay locally for storage change handler
    let currentDelay = settings.hoverDelay;

    onSettingsChanged((changes) => {
      if ('theme' in changes && changes.theme !== undefined) {
        applyShadowTheme(changes.theme);
      }

      if ('hoverDelay' in changes && changes.hoverDelay !== undefined) {
        currentDelay = changes.hoverDelay;
      }

      if ('hoverPreview' in changes) {
        if (changes.hoverPreview === false && cleanup) {
          cleanup();
          cleanup = null;
          controller.hide();
        } else if (changes.hoverPreview === true && !cleanup) {
          cleanup = setupHoverDelegation(controller, currentDelay);
        }
      } else if ('hoverDelay' in changes && cleanup) {
        // Restart delegation with new delay
        cleanup();
        cleanup = setupHoverDelegation(controller, currentDelay);
      }
    });
  },
});

function setupHoverDelegation(
  controller: Controller,
  delayMs: number,
): () => void {
  const ac = new AbortController();
  const { signal } = ac;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let activeUrl: string | null = null;

  document.addEventListener(
    'mouseover',
    (e: MouseEvent) => {
      const link = (e.target as Element).closest('a[href]');
      if (!link) return;

      let url: string;
      try {
        const parsed = new URL((link as HTMLAnchorElement).href);
        // Skip non-http(s) links (mailto:, javascript:, tel:, #anchors)
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return;
        url = parsed.href;
      } catch {
        return;
      }

      // Already showing this URL — do nothing (prevents rapid child-element mouseover spam)
      if (url === activeUrl) return;

      // Cancel any pending timer and hide current tooltip
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (activeUrl) controller.hide();

      timer = setTimeout(() => {
        const rect = link.getBoundingClientRect();
        controller.show(url, rect.left, rect.top, rect.bottom);
        activeUrl = url;
        timer = null;
      }, delayMs);
    },
    { signal },
  );

  document.addEventListener(
    'mouseout',
    (e: MouseEvent) => {
      const link = (e.target as Element).closest('a[href]');
      if (!link) return;

      // Ignore mouseout when moving to a child element of the same link (e.g., <img> inside <a>)
      if (link.contains(e.relatedTarget as Node)) return;

      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      controller.hide();
      activeUrl = null;
    },
    { signal },
  );

  return () => {
    ac.abort();
  };
}

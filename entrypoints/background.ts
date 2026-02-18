import type { OgData } from '@/lib/types';

import { getCachedOgData, setCachedOgData } from '@/lib/cache';
import { onMessage, sendMessage } from '@/lib/messaging';
import { parseOgTags, normalizeOgData } from '@/lib/og-parser';

/**
 * Domains that Chrome treats as restricted — extensions cannot bypass CORS
 * for these even with host_permissions: ['<all_urls>'].
 * Fetching from them always fails with a CORS/network error.
 */
const RESTRICTED_DOMAINS = [
  'chromewebstore.google.com',
  'chrome.google.com',
  'accounts.google.com',
  'clients1.google.com',
  'clients2.google.com',
  'microsoftedge.microsoft.com',
  'addons.mozilla.org',
];

/**
 * Check if a URL is known to be unfetchable from an extension background
 * service worker (restricted schemes or Chrome-protected domains).
 */
function isUnfetchableUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return true;
  }

  // Only http(s) is fetchable
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return true;
  }

  return RESTRICTED_DOMAINS.includes(parsed.hostname);
}

async function fetchWithTimeout(
  url: string,
  timeoutMs = 8000,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'text/html' },
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export default defineBackground(() => {
  onMessage('getOgData', async (message) => {
    const { url } = message.data;

    // Skip URLs that are known to be unfetchable (restricted schemes/domains)
    if (isUnfetchableUrl(url)) {
      return null;
    }

    try {
      // Check cache first
      const cached = await getCachedOgData(url);
      if (cached) {
        return cached;
      }

      // Fetch with timeout
      const response = await fetchWithTimeout(url, 8000);

      // Validate content-type
      const contentType = response.headers.get('content-type') ?? '';
      if (
        !contentType.includes('text/html') &&
        !contentType.includes('application/xhtml')
      ) {
        return null;
      }

      // Parse OG tags
      const html = await response.text();
      const rawTags = parseOgTags(html);
      const ogData: OgData = normalizeOgData(rawTags);

      // Cache if meaningful
      if (ogData.title || ogData.image) {
        await setCachedOgData(url, ogData);
      }

      return ogData;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.debug('OG fetch timed out:', url);
      } else {
        console.debug('OG fetch failed:', url, error);
      }
      return null;
    }
  });

  onMessage('getPageOgData', async (message) => {
    const { tabId } = message.data;
    try {
      return await sendMessage('getPageOgData', { tabId }, tabId);
    } catch {
      // Restricted page (chrome://, extension pages, etc.) or content script not yet ready
      return null;
    }
  });
});

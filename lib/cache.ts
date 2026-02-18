// lib/cache.ts
// Source: WXT storage docs — session: prefix uses chrome.storage.session

import { storage } from 'wxt/utils/storage';

import type { OgData } from './types';

/**
 * Key prefix for all OG cache entries in chrome.storage.session.
 * The "session:" prefix instructs the WXT storage utility to use
 * chrome.storage.session, which is cleared on browser restart.
 */
const CACHE_PREFIX = 'session:ogcache:';

/**
 * Retrieve cached OgData for a given URL.
 * Returns null if the URL has not been cached in this session.
 */
export async function getCachedOgData(url: string): Promise<OgData | null> {
  return await storage.getItem<OgData>(`${CACHE_PREFIX}${url}`);
}

/**
 * Store OgData in the session cache under the given URL key.
 * Data is automatically cleared when the browser is closed.
 */
export async function setCachedOgData(
  url: string,
  data: OgData,
): Promise<void> {
  await storage.setItem(`${CACHE_PREFIX}${url}`, data);
}

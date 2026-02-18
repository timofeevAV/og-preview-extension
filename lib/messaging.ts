// lib/messaging.ts
// Source: @webext-core/messaging docs (function syntax protocol map)

import { defineExtensionMessaging } from '@webext-core/messaging';

import type { OgData } from './types';

/**
 * Type-safe message protocol map for the OG Preview extension.
 *
 * Messages use the function syntax: name(data): ReturnType
 *
 * - getOgData: Popup/tooltip sends a URL to the service worker, which fetches
 *   and parses the remote page's OG data. Used for link preview tooltips and
 *   inspecting arbitrary URLs.
 *
 * - getPageOgData: Service worker asks the content script on a specific tab to
 *   extract OG meta tags from the live DOM and return them. Used by the popup
 *   to get the current tab's OG data without an extra network request.
 */
interface OgProtocolMap {
  getOgData(data: { url: string }): OgData | null;
  getPageOgData(data: { tabId: number }): OgData | null;
}

export const { sendMessage, onMessage } =
  defineExtensionMessaging<OgProtocolMap>();

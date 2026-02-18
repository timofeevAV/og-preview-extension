// lib/og-parser.ts
// Source: htmlparser2 callback API + OG Protocol spec + Twitter Card fallback behavior

import { Parser } from 'htmlparser2';

import type { OgData } from './types';

/**
 * Parse OG and Twitter meta tags from an HTML string using htmlparser2.
 * Stops processing after </head> for performance.
 */
export function parseOgTags(html: string): Record<string, string> {
  const tags: Record<string, string> = {};
  let done = false;

  const parser = new Parser(
    {
      onopentag(name, attributes) {
        if (done) return;
        if (name !== 'meta') return;
        const property =
          (attributes['property'] as string | undefined) ||
          (attributes['name'] as string | undefined);
        const content = attributes['content'] as string | undefined;
        if (!property || !content) return;
        if (property.startsWith('og:') || property.startsWith('twitter:')) {
          tags[property] = content;
        }
      },
      onclosetag(name) {
        if (name === 'head') {
          done = true;
        }
      },
    },
    {
      decodeEntities: true,
      lowerCaseTags: true,
      lowerCaseAttributeNames: true,
    },
  );

  parser.write(html);
  parser.end();
  return tags;
}

/**
 * Normalize a raw Record<string, string> of meta tag key/values to a typed OgData object.
 * Maps og: and twitter: property names to OgData fields.
 * Handles og:image:url as fallback for og:image, and twitter:image:src as fallback for twitter:image.
 */
export function normalizeOgData(raw: Record<string, string>): OgData {
  return {
    title: raw['og:title'],
    description: raw['og:description'],
    url: raw['og:url'],
    siteName: raw['og:site_name'],
    type: raw['og:type'],
    locale: raw['og:locale'],
    image: raw['og:image'] ?? raw['og:image:url'],
    imageAlt: raw['og:image:alt'],
    imageWidth: raw['og:image:width'],
    imageHeight: raw['og:image:height'],
    imageType: raw['og:image:type'],
    twitterCard: raw['twitter:card'],
    twitterSite: raw['twitter:site'],
    twitterCreator: raw['twitter:creator'],
    twitterTitle: raw['twitter:title'],
    twitterDescription: raw['twitter:description'],
    twitterImage: raw['twitter:image'] ?? raw['twitter:image:src'],
    twitterImageAlt: raw['twitter:image:alt'],
  };
}

/**
 * Extract OG and Twitter meta tags from the current page's live DOM.
 * Used by the content script (requires DOM APIs).
 */
export function extractOgFromDOM(): Record<string, string> {
  const tags: Record<string, string> = {};

  const metas = document.querySelectorAll(
    'meta[property^="og:"], meta[property^="twitter:"], meta[name^="twitter:"]',
  );

  metas.forEach((meta) => {
    const key = meta.getAttribute('property') ?? meta.getAttribute('name');
    const content = meta.getAttribute('content');
    if (key && content) {
      tags[key] = content;
    }
  });

  return tags;
}

/**
 * Returns the effective title, preferring Twitter's title when available.
 */
export function getEffectiveTitle(data: OgData): string | undefined {
  return data.twitterTitle ?? data.title;
}

/**
 * Returns the effective description, preferring Twitter's description when available.
 */
export function getEffectiveDescription(data: OgData): string | undefined {
  return data.twitterDescription ?? data.description;
}

/**
 * Returns the effective image URL, preferring Twitter's image when available.
 */
export function getEffectiveImage(data: OgData): string | undefined {
  return data.twitterImage ?? data.image;
}

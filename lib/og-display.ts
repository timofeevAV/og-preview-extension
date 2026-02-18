// lib/og-display.ts
// Pure business logic helpers for popup UI — no DOM or React dependencies.
import type { OgData } from '@/lib/types';

/**
 * The five states the popup UI can be in.
 * - 'loading'  : sendMessage not yet resolved (initial state, not derived here)
 * - 'error'    : sendMessage returned null (restricted page / content script not injected)
 * - 'empty'    : OgData present but no meaningful core fields
 * - 'partial'  : at least one of title/description/image is set, but not all three
 * - 'complete' : title, description, and image are all non-empty
 */
export type OgDataStatus =
  | 'loading'
  | 'error'
  | 'empty'
  | 'partial'
  | 'complete';

/**
 * Derives the display status from the OgData returned by the content script.
 *
 * @param data - OgData from sendMessage, or null if the message failed
 * @returns OgDataStatus
 */
export function getOgDataStatus(data: OgData | null): OgDataStatus {
  if (data === null) return 'error';

  const hasCore = !!(data.title || data.description || data.image);
  if (!hasCore) return 'empty';

  const hasAll = !!(data.title && data.description && data.image);
  if (!hasAll) return 'partial';

  return 'complete';
}

/**
 * Resolves display-priority values for title, description, and image.
 * Twitter Card fields take precedence over Open Graph equivalents when set.
 *
 * @param data - OgData (non-null)
 * @returns Resolved title, description, image — each may be undefined
 */
export function resolveDisplayData(data: OgData): {
  title: string | undefined;
  description: string | undefined;
  image: string | undefined;
} {
  return {
    title: data.twitterTitle || data.title,
    description: data.twitterDescription || data.description,
    image: data.twitterImage || data.image,
  };
}

/**
 * All known OG fields shown in the MissingFields component.
 * At minimum: title, description, image, url, siteName, type.
 */
export const KNOWN_OG_FIELDS: Array<{
  key: keyof OgData;
  label: string;
  description: string;
}> = [
  {
    key: 'title',
    label: 'og:title',
    description: 'Page title shown in link previews',
  },
  {
    key: 'description',
    label: 'og:description',
    description: 'Summary text shown below the title',
  },
  {
    key: 'image',
    label: 'og:image',
    description: 'Required for image previews on social platforms',
  },
  {
    key: 'url',
    label: 'og:url',
    description: 'Canonical URL of the page',
  },
  {
    key: 'siteName',
    label: 'og:site_name',
    description: 'Name of the website',
  },
  {
    key: 'type',
    label: 'og:type',
    description: 'Content type (website, article, etc.)',
  },
];

/**
 * Full registry of all supported OG and Twitter Card fields for the Metadata tab.
 * Includes per-field descriptions and required flag for missing-fields display.
 * Do NOT replace or modify KNOWN_OG_FIELDS — that is used by the compact MissingFields component.
 */
export const ALL_OG_FIELDS: Array<{
  key: keyof OgData;
  label: string;
  description: string;
  required: boolean;
}> = [
  {
    key: 'title',
    label: 'og:title',
    description: 'Page title shown in link previews',
    required: true,
  },
  {
    key: 'description',
    label: 'og:description',
    description: 'Summary text shown below the title',
    required: true,
  },
  {
    key: 'image',
    label: 'og:image',
    description: 'Required for image previews on social platforms',
    required: true,
  },
  {
    key: 'url',
    label: 'og:url',
    description: 'Canonical URL of the page',
    required: true,
  },
  {
    key: 'siteName',
    label: 'og:site_name',
    description: 'Name of the website',
    required: true,
  },
  {
    key: 'type',
    label: 'og:type',
    description: 'Content type (website, article, etc.)',
    required: true,
  },
  {
    key: 'locale',
    label: 'og:locale',
    description: 'Language/locale of the content (e.g. en_US)',
    required: false,
  },
  {
    key: 'imageAlt',
    label: 'og:image:alt',
    description: 'Alt text for the OG image (accessibility)',
    required: false,
  },
  {
    key: 'imageWidth',
    label: 'og:image:width',
    description: 'Image width in pixels (recommended: 1200)',
    required: false,
  },
  {
    key: 'imageHeight',
    label: 'og:image:height',
    description: 'Image height in pixels (recommended: 630)',
    required: false,
  },
  {
    key: 'imageType',
    label: 'og:image:type',
    description: 'MIME type of the image (e.g. image/jpeg)',
    required: false,
  },
  {
    key: 'twitterCard',
    label: 'twitter:card',
    description: 'Twitter card type (summary_large_image recommended)',
    required: false,
  },
  {
    key: 'twitterSite',
    label: 'twitter:site',
    description: '@username of the website on Twitter/X',
    required: false,
  },
  {
    key: 'twitterCreator',
    label: 'twitter:creator',
    description: '@username of the content creator on Twitter/X',
    required: false,
  },
  {
    key: 'twitterTitle',
    label: 'twitter:title',
    description: 'Title override for Twitter/X (overrides og:title)',
    required: false,
  },
  {
    key: 'twitterDescription',
    label: 'twitter:description',
    description: 'Description override for Twitter/X',
    required: false,
  },
  {
    key: 'twitterImage',
    label: 'twitter:image',
    description: 'Image override for Twitter/X cards',
    required: false,
  },
  {
    key: 'twitterImageAlt',
    label: 'twitter:image:alt',
    description: 'Alt text for Twitter/X card image',
    required: false,
  },
];

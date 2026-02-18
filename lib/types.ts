// lib/types.ts
// Source: Open Graph Protocol (ogp.me) + Twitter Card specification

export interface OgData {
  // Core OG properties
  title?: string;
  description?: string;
  url?: string;
  siteName?: string;
  type?: string;
  locale?: string;

  // Image
  image?: string;
  imageAlt?: string;
  imageWidth?: string;
  imageHeight?: string;
  imageType?: string;

  // Twitter Card overrides (when different from OG)
  twitterCard?: string; // summary, summary_large_image, app, player
  twitterSite?: string; // @username
  twitterCreator?: string; // @username
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  twitterImageAlt?: string;
}

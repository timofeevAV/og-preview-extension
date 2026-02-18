import type { OgData } from '@/lib/types';

import { resolveDisplayData } from '@/lib/og-display';

interface PlatformCardProps {
  ogData: OgData;
}

function extractDomain(ogData: OgData): string {
  if (ogData.url) {
    try {
      return new URL(ogData.url).hostname.replace(/^www\./, '');
    } catch {
      // malformed URL
    }
  }
  return ogData.siteName ?? '';
}

export function XCard({ ogData }: PlatformCardProps) {
  const { title, image } = resolveDisplayData(ogData);
  const domain = extractDomain(ogData);
  const isSummary = ogData.twitterCard === 'summary';

  if (isSummary) {
    // summary: horizontal thumbnail-left layout (~80x80px)
    return (
      <div className="flex w-full flex-row items-stretch overflow-hidden rounded-2xl border border-border">
        <div className="h-[80px] w-[80px] shrink-0 bg-muted">
          {image ? (
            <img
              src={image}
              alt={ogData.imageAlt ?? title ?? ''}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-muted" />
          )}
        </div>
        <div className="flex min-w-0 flex-col justify-center px-3 py-2">
          {domain && (
            <p className="truncate text-[11px] text-muted-foreground">
              {domain}
            </p>
          )}
          {title && (
            <p className="line-clamp-2 text-[13px] leading-snug font-medium text-foreground">
              {title}
            </p>
          )}
        </div>
      </div>
    );
  }

  // summary_large_image (default): full-width 16:9 with bottom gradient overlay
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border">
      <div className="relative aspect-video bg-muted">
        {image ? (
          <img
            src={image}
            alt={ogData.imageAlt ?? title ?? ''}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <span className="text-xs text-muted-foreground">No image</span>
          </div>
        )}
        {/* Gradient overlay — always rendered so domain/title text is legible on any image */}
        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/0 to-transparent" />
        {/* Domain + title over image at bottom */}
        <div className="absolute right-0 bottom-0 left-0 px-3 py-2">
          {domain && (
            <p className="truncate text-[11px] text-white/60">{domain}</p>
          )}
          {title && (
            <p className="truncate text-[13px] font-medium text-white">
              {title}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

import type { OgData } from '@/lib/types';

import { resolveDisplayData } from '@/lib/og-display';

interface PlatformCardProps {
  ogData: OgData;
}

function extractDomain(ogData: OgData): string {
  if (ogData.url) {
    try {
      return new URL(ogData.url).hostname.replace(/^www\./, '');
    } catch {}
  }
  return ogData.siteName ?? '';
}

export function IMessageCard({ ogData }: PlatformCardProps) {
  const { title, image } = resolveDisplayData(ogData);
  const domain = extractDomain(ogData);

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border">
      <div className="aspect-[1.91/1] bg-muted">
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
      </div>
      <div className="px-3 py-2">
        {/* iMessage: approximation — Apple does not publish exact pixel specs. Aspect ratio 1.91:1, no description shown. */}
        {domain && (
          <p className="mb-0.5 truncate text-[11px] text-muted-foreground">
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

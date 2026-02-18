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

export function FacebookMobileCard({ ogData }: PlatformCardProps) {
  const { title, description, image } = resolveDisplayData(ogData);
  const domain = extractDomain(ogData);

  return (
    <div className="w-full overflow-hidden rounded-xl border border-border">
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
      <div className="bg-muted/30 px-3 py-1.5">
        {domain && (
          <p className="mb-0.5 truncate text-[10px] text-muted-foreground uppercase">
            {domain}
          </p>
        )}
        {title && (
          <p className="line-clamp-2 text-[13px] leading-snug font-semibold text-foreground">
            {title}
          </p>
        )}
        {description && (
          <p className="mt-0.5 line-clamp-1 text-[12px] text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

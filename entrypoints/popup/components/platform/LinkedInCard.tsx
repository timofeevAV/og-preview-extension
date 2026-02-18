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

export function LinkedInCard({ ogData }: PlatformCardProps) {
  const { title, description, image } = resolveDisplayData(ogData);
  const domain = extractDomain(ogData);

  return (
    <div className="flex w-full flex-row items-stretch overflow-hidden rounded-lg border border-border">
      {/* Left: fixed-size square thumbnail — always 96x96 even without image */}
      <div className="h-[96px] w-[96px] shrink-0 bg-muted">
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
      {/* Right: text stack */}
      <div className="flex min-w-0 flex-col justify-center px-3 py-2">
        {title && (
          <p className="line-clamp-2 text-[13px] leading-snug font-medium text-foreground">
            {title}
          </p>
        )}
        {domain && (
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {domain}
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

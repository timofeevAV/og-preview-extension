import type { OgData } from '@/lib/types';

import { resolveDisplayData } from '@/lib/og-display';

interface TooltipCardProps {
  ogData: OgData;
  url: string;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function TooltipCard({ ogData, url }: TooltipCardProps) {
  const { title, description, image } = resolveDisplayData(ogData);
  const domain = extractDomain(url);

  return (
    <div className="w-full">
      {image && (
        <div className="h-[90px] w-full overflow-hidden">
          <img
            src={image}
            alt={ogData.imageAlt ?? title ?? ''}
            className="size-full object-cover"
          />
        </div>
      )}
      <div className="space-y-0.5 px-3 py-2">
        {title && (
          <p className="line-clamp-2 text-sm/snug font-semibold">{title}</p>
        )}
        {description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {description}
          </p>
        )}
        <p className="truncate text-xs text-muted-foreground/70">{domain}</p>
      </div>
    </div>
  );
}

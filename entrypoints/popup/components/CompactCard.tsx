import type { OgData } from '@/lib/types';

import { resolveDisplayData } from '@/lib/og-display';

interface CompactCardProps {
  ogData: OgData;
}

export function CompactCard({ ogData }: CompactCardProps) {
  const { title, description, image } = resolveDisplayData(ogData);

  return (
    <div>
      {/* Image banner — full width, no border-radius, 1.91:1 aspect ratio */}
      <div
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: '1.91' }}
      >
        {image ? (
          <img
            src={image}
            alt={ogData.imageAlt ?? title ?? 'Page preview image'}
            className="size-full rounded-none object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-muted">
            <span className="text-xs text-muted-foreground">No image</span>
          </div>
        )}
      </div>

      {/* Title + description + site name */}
      <div className="px-4 py-3">
        {title && (
          <p className="truncate text-sm/snug font-semibold">{title}</p>
        )}
        {description && (
          <p className="mt-0.5 line-clamp-2 text-xs/relaxed text-muted-foreground">
            {description}
          </p>
        )}
        {ogData.siteName && (
          <p className="mt-1 truncate text-[10px] tracking-widest text-muted-foreground/60 uppercase">
            {ogData.siteName}
          </p>
        )}
      </div>
    </div>
  );
}

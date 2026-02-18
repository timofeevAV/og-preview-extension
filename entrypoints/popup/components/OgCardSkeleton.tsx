import { Skeleton } from '@/components/ui/skeleton';

export function OgCardSkeleton() {
  return (
    <div className="w-full">
      {/* Image banner at 1.91:1 ratio: 380px wide → ~199px tall — matches CompactCard */}
      <Skeleton
        className="w-full rounded-none"
        style={{ aspectRatio: '1.91' }}
      />
      {/* Text area: mirrors CompactCard's px-4 py-3 spacing */}
      <div className="space-y-2 px-4 py-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

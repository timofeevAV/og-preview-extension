import { Skeleton } from '@/components/ui/skeleton';

export function TooltipSkeleton() {
  return (
    <div className="w-full">
      <Skeleton className="h-[90px] w-full rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-3.5 w-4/5" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

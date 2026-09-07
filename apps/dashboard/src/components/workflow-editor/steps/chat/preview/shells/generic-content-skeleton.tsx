import { Skeleton } from '@/components/primitives/skeleton';

/**
 * Default loading body for providers without a dedicated skeleton yet
 * (text + image + action buttons).
 */
export function GenericContentSkeleton() {
  return (
    <div className="flex w-full flex-col gap-2" aria-hidden>
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-[15px] w-[92%] rounded-sm" />
        <Skeleton className="h-[15px] w-[78%] rounded-sm" />
      </div>

      <Skeleton className="my-1 h-28 w-full max-w-[280px] rounded" />

      <div className="mb-1 flex flex-wrap items-center gap-2">
        <Skeleton className="h-7 w-20 rounded" />
        <Skeleton className="h-7 w-24 rounded" />
        <Skeleton className="h-7 w-16 rounded" />
      </div>
    </div>
  );
}

import { Skeleton } from '@/components/primitives/skeleton';

export function PageContentSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-2" aria-busy="true" aria-label="Loading page">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

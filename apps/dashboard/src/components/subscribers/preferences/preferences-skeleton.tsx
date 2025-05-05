import { Skeleton } from '@/components/primitives/skeleton';

export function PreferencesSkeleton() {
  return (
    <div className="flex h-full flex-col items-stretch">
      <div className="flex items-center gap-2 bg-neutral-50 px-4 py-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="size-3 rounded-full" />
      </div>

      <div className="p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="mt-2 flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="size-5 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-5 w-9 rounded-full" />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 bg-neutral-50 px-4 py-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="size-3 rounded-full" />
      </div>

      <div className="space-y-3 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-neutral-100 p-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-32" />
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1, 2].map((j) => (
                    <Skeleton key={j} className="size-6 rounded-full" />
                  ))}
                </div>
                <Skeleton className="size-3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

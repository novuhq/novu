import { Separator } from '@radix-ui/react-dropdown-menu';
import { Skeleton } from '../primitives/skeleton';

export function SubscriberOverviewSkeleton() {
  return (
    <div className="flex flex-col items-stretch gap-8 p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="size-[3.75rem] rounded-full" />
        <div className="flex flex-1 items-center gap-2.5">
          <Skeleton className="h-6 flex-1" />
          <Skeleton className="h-6 flex-1" />
        </div>
      </div>
      <div>
        <Skeleton className="h-6 flex-1" />
      </div>
      <div className="flex flex-1 items-center gap-2.5">
        <Skeleton className="h-6 flex-1" />
        <Skeleton className="h-6 flex-1" />
      </div>
      <Separator />
      <div className="flex flex-1 items-center gap-2.5">
        <Skeleton className="h-6 w-1/4" />
        <Skeleton className="h-6 flex-1" />
      </div>
      <Skeleton className="h-32" />
    </div>
  );
}

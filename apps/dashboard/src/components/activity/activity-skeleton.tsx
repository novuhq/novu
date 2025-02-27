import { motion } from 'motion/react';

import { Skeleton } from '@/components/primitives/skeleton';
import { cn } from '@/utils/ui';
import { fadeIn } from '@/utils/animation';

export function ActivitySkeleton({ headerClassName }: { headerClassName?: string }) {
  return (
    <motion.div {...fadeIn} data-testid="activity-panel-skeleton">
      <div
        className={cn(
          'flex items-center gap-2 border-b border-t border-neutral-200 border-b-neutral-100 p-2',
          headerClassName
        )}
      >
        <Skeleton className="h-3 w-3 rounded-full" />
        <Skeleton className="h-[20px] w-32" />
      </div>

      <div className="px-3 py-2">
        <div className="flex flex-col gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-t border-neutral-100 p-2">
        <Skeleton className="h-3 w-3 rounded-full" />
        <Skeleton className="h-4 w-16" />
      </div>

      <div className="flex flex-col gap-6 bg-white p-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

import { motion } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from '../../primitives/card';
import { FlickeringGrid } from '../charts/flickering-grid';
import { cn } from '@/utils/ui';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.04,
    },
  },
};

const rowVariants = {
  hidden: { opacity: 0, y: 22, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 360,
      damping: 26,
    },
  },
};

const METRIC_CARD =
  'rounded-12 border border-border/40 bg-bg-white shadow-popover p-2.5 min-h-[88px]';

function MetricCardSkeleton() {
  return (
    <div className={cn(METRIC_CARD, 'flex flex-col gap-1')}>
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 rounded-sm bg-neutral-alpha-100" />
        <div className="h-3 w-8 rounded-sm bg-neutral-alpha-100" />
      </div>
      <div className="h-8 w-24 rounded-sm bg-neutral-alpha-100 mt-0.5" />
      <div className="h-3 w-28 rounded-sm bg-neutral-alpha-100 mt-2" />
    </div>
  );
}

function ChartSkeletonCard({
  className,
  showGrid = true,
}: {
  className?: string;
  showGrid?: boolean;
}) {
  return (
    <div className={cn('h-full min-h-0 flex flex-col', className)}>
      <Card className="shadow-box-xs border-none h-full flex flex-col min-h-0 overflow-hidden">
        <CardHeader className="bg-transparent p-2.5 pb-0 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="font-code text-[12px] text-text-sub font-normal uppercase tracking-[normal] shrink-0">
              <span className="inline-block h-3 w-16 rounded-sm bg-neutral-alpha-100" />
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-2.5 pt-1.5 flex flex-col gap-1.5 flex-1 min-h-0 overflow-hidden">
          <div className="relative flex-1 min-h-[120px] rounded-sm overflow-hidden">
            {showGrid ? (
              <>
                <div className="absolute inset-0 z-0">
                  <FlickeringGrid
                    squareSize={1.5}
                    gridGap={2}
                    maxOpacity={0.14}
                    minOpacity={0.06}
                    color="hsl(var(--text-soft))"
                  />
                </div>
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-12 z-1 bg-linear-to-t from-bg-white to-transparent"
                  aria-hidden
                />
              </>
            ) : (
              <div className="absolute inset-0 bg-neutral-alpha-100 rounded-sm" />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function AnalyticsPageSkeleton() {
  return (
    <motion.div
      className="relative flex flex-col gap-1.5 overflow-hidden"
      variants={containerVariants}
      initial="hidden"
      animate="show"
      aria-busy="true"
    >
      <span className="sr-only">Loading analytics</span>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-1.5 items-start"
        variants={rowVariants}
      >
        {[0, 1, 2, 3].map((i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </motion.div>

      <motion.div
        className="grid grid-cols-1 lg:grid-cols-3 gap-1.5 lg:grid-rows-1 lg:h-[200px]"
        variants={rowVariants}
      >
        {[0, 1, 2].map((i) => (
          <ChartSkeletonCard key={i} />
        ))}
      </motion.div>

      <motion.div variants={rowVariants}>
        <ChartSkeletonCard className="min-h-[200px]" showGrid />
      </motion.div>

      <motion.div
        className="grid grid-cols-1 lg:grid-cols-12 gap-1.5 items-stretch lg:h-[200px]"
        variants={rowVariants}
      >
        <ChartSkeletonCard className="lg:col-span-8" showGrid />
        <ChartSkeletonCard className="lg:col-span-4" showGrid />
      </motion.div>

      <div
        className="absolute inset-0 pointer-events-none z-10 overflow-hidden"
        aria-hidden
      >
        <div
          className="absolute inset-0 h-full w-full bg-[linear-gradient(110deg,transparent_0%,transparent_32%,rgba(255,255,255,0.6)_50%,transparent_68%,transparent_100%)] animate-[shimmer-sweep_1.8s_ease-in-out_infinite]"
          style={{ width: '55%' }}
        />
      </div>
    </motion.div>
  );
}

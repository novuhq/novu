import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { RiGroup2Fill } from 'react-icons/ri';
import { cn } from '@/utils/ui';
import { InboxBellFilled } from '../../icons/inbox-bell-filled';
import { StackedDots } from '../../icons/stacked-dots';
import { TargetArrow } from '../../icons/target-arrow';
import { Card, CardContent, CardHeader, CardTitle } from '../../primitives/card';
import { FlickeringGridPlaceholder } from './flickering-grid-placeholder';

const ROW_STAGGER = 0.32;
const CARD_STAGGER = 0.1;
const REVEAL_EASE = [0.22, 1, 0.36, 1] as const;

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: ROW_STAGGER,
      delayChildren: 0.12,
    },
  },
};

const rowVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: CARD_STAGGER,
      delayChildren: 0.06,
    },
  },
};

const cardRevealVariants = {
  hidden: {
    opacity: 0,
    y: 24,
    scale: 0.94,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.72,
      ease: REVEAL_EASE,
    },
  },
};

const METRIC_CARDS = [
  { title: 'Messages delivered', icon: InboxBellFilled },
  { title: 'Active subscribers', icon: RiGroup2Fill },
  { title: '<Inbox /> Interactions', icon: TargetArrow },
  { title: 'Avg. Messages per subscriber', icon: StackedDots },
] as const;

function MetricCardSkeleton({
  title,
  icon: Icon,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div
      className={cn('bg-bg-white rounded-xl border-none p-2.5 shadow-box-xs w-full min-h-[88px] flex flex-col gap-1')}
    >
      <div className="flex items-center justify-between shrink-0">
        <div className="flex min-w-0 items-center gap-1">
          <Icon className="size-4 shrink-0 text-icon-sub" />
          <span className="font-code text-[12px] text-text-sub uppercase whitespace-nowrap">{title}</span>
        </div>
      </div>
      <FlickeringGridPlaceholder minHeight={52} topFadeHeight={24} bottomFadeHeight={24} className="mt-0.5" />
    </div>
  );
}

const CHART_TITLES_ROW_2 = ['Delivery trend', 'Top workflows by volume', 'Interaction trend'] as const;
const CHART_TITLE_ROW_3 = 'Workflow runs';
const CHART_TITLES_ROW_4 = ['Active subscribers', 'Top providers by volume'] as const;

const X_AXIS_LABELS = ['Feb 26', 'Mar 26', 'Apr 26', 'May 26', 'Jun 26'] as const;

const X_AXIS_MASK_GRADIENT =
  'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.12) 24%, rgba(0,0,0,0.45) 32%, black 50%, rgba(0,0,0,0.45) 68%, rgba(0,0,0,0.12) 76%, transparent 100%)';

function ChartSkeletonCard({
  className,
  title,
  showGrid = true,
}: {
  className?: string;
  title: string;
  showGrid?: boolean;
}) {
  return (
    <div className={cn('h-full min-h-0 flex flex-col', className)}>
      <Card className="shadow-box-xs border-none h-full flex flex-col min-h-0">
        <CardHeader className="bg-transparent p-2.5 pb-0 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="font-code text-[12px] text-text-sub font-normal uppercase tracking-[normal] shrink-0">
              {title}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-2.5 pt-1.5 flex flex-col gap-0 flex-1 min-h-0 overflow-visible">
          <div className="flex flex-col flex-1 min-h-0 rounded-sm overflow-hidden">
            <div className="relative flex-1 min-h-[100px] overflow-hidden">
              {showGrid ? (
                <FlickeringGridPlaceholder
                  className="absolute inset-0"
                  minHeight={100}
                  topFadeHeight={40}
                  bottomFadeHeight={32}
                />
              ) : (
                <div className="absolute inset-0 rounded-sm bg-neutral-alpha-100 animate-[skeleton-pulse_1.8s_ease-in-out_infinite]" />
              )}
            </div>
            <div
              className="relative flex shrink-0 h-5 items-end justify-between px-1 pb-0.5 overflow-hidden mask-no-repeat"
              data-x-axis-strip
              aria-hidden
              style={{
                maskImage: X_AXIS_MASK_GRADIENT,
                WebkitMaskImage: X_AXIS_MASK_GRADIENT,
                maskSize: 'calc(var(--shimmer-mask-size, 50) * 1%) 100%',
                WebkitMaskSize: 'calc(var(--shimmer-mask-size, 50) * 1%) 100%',
                WebkitMaskRepeat: 'no-repeat',
                maskPosition: 'calc((var(--shimmer-mask-x, -50) - var(--shimmer-mask-size, 18) * 0.5) * 1%) 0',
                WebkitMaskPosition: 'calc((var(--shimmer-mask-x, -50) - var(--shimmer-mask-size, 18) * 0.5) * 1%) 0',
              }}
            >
              {X_AXIS_LABELS.map((label) => (
                <span
                  key={label}
                  className="text-[10px] text-text-disabled opacity-45"
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const SHIMMER_DURATION_MS = 2200;

function useShimmerSyncToXAxisStrips(
  containerRef: React.RefObject<HTMLElement | null>,
  shimmerRef: React.RefObject<HTMLDivElement | null>
) {
  useEffect(() => {
    const container = containerRef.current;
    const shimmerEl = shimmerRef.current;
    if (!container || !shimmerEl) return;

    let rafId: number;

    function update() {
      const c = containerRef.current;
      const s = shimmerRef.current;
      if (!c || !s) return;

      const animations = s.getAnimations();
      const sweep = animations.length > 0 ? animations[0] : undefined;
      const currentTime =
        typeof sweep?.currentTime === 'number' ? sweep.currentTime : 0;
      const progress = (currentTime % SHIMMER_DURATION_MS) / SHIMMER_DURATION_MS;

      const containerRect = c.getBoundingClientRect();
      const shimmerCenterPx = containerRect.width * (-0.25 + progress);
      const brightBandWidthPx = containerRect.width * 0.18;

      const strips = c.querySelectorAll<HTMLElement>('[data-x-axis-strip]');
      for (const strip of strips) {
        const stripRect = strip.getBoundingClientRect();
        const stripLeftInContainer = stripRect.left - containerRect.left;
        const maskCenter = ((shimmerCenterPx - stripLeftInContainer) / stripRect.width) * 100;
        const maskSizePercent = (brightBandWidthPx / stripRect.width) * 100;
        strip.style.setProperty('--shimmer-mask-x', String(maskCenter));
        strip.style.setProperty('--shimmer-mask-size', String(maskSizePercent));
      }

      rafId = requestAnimationFrame(update);
    }

    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [containerRef, shimmerRef]);
}

export function AnalyticsPageSkeleton() {
  const containerRef = useRef<HTMLDivElement>(null);
  const shimmerRef = useRef<HTMLDivElement>(null);
  useShimmerSyncToXAxisStrips(containerRef, shimmerRef);

  return (
    <motion.div
      ref={containerRef}
      className="relative flex flex-col gap-1.5 overflow-visible px-0.5 pb-2 pt-0"
      variants={containerVariants}
      initial="hidden"
      animate="show"
      aria-busy="true"
    >
      <span className="sr-only">Loading analytics</span>

      <motion.div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-1.5 items-start" variants={rowVariants}>
        {METRIC_CARDS.map(({ title, icon }) => (
          <motion.div key={title} variants={cardRevealVariants} className="rounded-xl">
            <MetricCardSkeleton title={title} icon={icon} />
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        className="grid grid-cols-1 lg:grid-cols-3 gap-1.5 lg:grid-rows-1 lg:h-[200px]"
        variants={rowVariants}
      >
        {CHART_TITLES_ROW_2.map((title) => (
          <motion.div key={title} variants={cardRevealVariants} className="rounded-xl h-full min-h-0">
            <ChartSkeletonCard title={title} />
          </motion.div>
        ))}
      </motion.div>

      <motion.div className="grid grid-cols-1" variants={rowVariants}>
        <motion.div variants={cardRevealVariants} className="rounded-xl min-h-[200px]">
          <ChartSkeletonCard className="min-h-[200px]" title={CHART_TITLE_ROW_3} showGrid />
        </motion.div>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 lg:grid-cols-12 gap-1.5 items-stretch lg:h-[200px]"
        variants={rowVariants}
      >
        <motion.div variants={cardRevealVariants} className="rounded-xl lg:col-span-8 h-full min-h-0">
          <ChartSkeletonCard className="h-full" title={CHART_TITLES_ROW_4[0]} showGrid />
        </motion.div>
        <motion.div variants={cardRevealVariants} className="rounded-xl lg:col-span-4 h-full min-h-0">
          <ChartSkeletonCard className="h-full" title={CHART_TITLES_ROW_4[1]} showGrid />
        </motion.div>
      </motion.div>

      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden" aria-hidden>
        <div
          ref={shimmerRef}
          className="absolute inset-0 h-full w-full bg-[linear-gradient(110deg,transparent_0%,transparent_32%,rgba(255,255,255,0.5)_50%,transparent_68%,transparent_100%)] animate-[shimmer-sweep_2.2s_ease-in-out_infinite]"
          style={{ width: '50%' }}
        />
      </div>
    </motion.div>
  );
}

import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { RiCheckboxCircleFill, RiLoader3Line, RiLoader4Fill } from 'react-icons/ri';
import { cn } from '@/utils/ui';

export type GenerationStep = {
  id: string;
  text: string;
};

type GenerationStatusProps = {
  steps: ReadonlyArray<GenerationStep>;
  stepDelayMs?: number;
  className?: string;
  /**
   * Height of the scrolling viewport in pixels. Lower this when embedding the status inside a
   * fixed-height region (e.g. a dialog footer) so the container does not push the parent taller.
   * The fade mask scales with this value, so very small heights effectively show a single row.
   */
  containerHeight?: number;
};

const DEFAULT_STEP_DELAY_MS = 2000;
const ITEM_HEIGHT = 16;
const GAP = 8;
const DEFAULT_CONTAINER_HEIGHT = 80;

export function GenerationStatus({
  steps,
  stepDelayMs = DEFAULT_STEP_DELAY_MS,
  className,
  containerHeight = DEFAULT_CONTAINER_HEIGHT,
}: GenerationStatusProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (steps.length <= 1) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => Math.min(prev + 1, steps.length - 1));
    }, stepDelayMs);

    return () => clearInterval(interval);
  }, [steps.length, stepDelayMs]);

  return (
    <div className={cn('relative flex flex-col overflow-hidden', className)} style={{ height: containerHeight }}>
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 35%, black 65%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 35%, black 65%, transparent 100%)',
        }}
      >
        <motion.div
          className="absolute left-0 right-0 flex flex-col"
          style={{ gap: GAP }}
          initial={false}
          animate={{ y: containerHeight / 2 - ITEM_HEIGHT / 2 - activeIndex * (ITEM_HEIGHT + GAP) }}
          transition={{ type: 'tween', ease: 'easeInOut' }}
        >
          {steps.map((step, index) => {
            const status = index < activeIndex ? 'success' : index === activeIndex ? 'progress' : 'pending';

            return (
              <motion.div
                key={step.id}
                className="flex shrink-0 items-center gap-2"
                animate={{ opacity: index === activeIndex ? 1 : 0.4 }}
                transition={{ duration: 0.2 }}
              >
                {status === 'success' && <RiCheckboxCircleFill className="text-success size-3 shrink-0" />}
                {status === 'progress' && <RiLoader4Fill className="text-text-sub size-3 shrink-0 animate-spin" />}
                {status === 'pending' && <RiLoader3Line className="text-text-sub size-3 shrink-0" />}
                <span className="text-label-xs text-text-sub leading-4">{step.text}</span>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}

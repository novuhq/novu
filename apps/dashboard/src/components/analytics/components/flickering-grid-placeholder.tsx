import { motion } from 'motion/react';
import { cn } from '@/utils/ui';
import { FlickeringGrid } from '../charts/flickering-grid';

type FlickeringGridPlaceholderProps = {
  className?: string;
  minHeight?: number;
  topFadeHeight?: number;
  bottomFadeHeight?: number;
};

export function FlickeringGridPlaceholder({
  className,
  minHeight = 100,
  topFadeHeight = 24,
  bottomFadeHeight = 32,
}: FlickeringGridPlaceholderProps) {
  return (
    <div
      className={cn('relative flex-1 min-h-0 rounded-sm overflow-hidden', className)}
      style={{ minHeight }}
      aria-hidden
    >
      <motion.div
        className="absolute inset-0 z-0"
        animate={{ opacity: [0.94, 1, 0.94] }}
        transition={{
          duration: 2.4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <FlickeringGrid
          squareSize={1.5}
          gridGap={2}
          maxOpacity={0.14}
          minOpacity={0.06}
          color="hsl(var(--text-disabled))"
        />
      </motion.div>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-1 bg-linear-to-b from-bg-white to-transparent"
        style={{ height: topFadeHeight }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-1 bg-linear-to-t from-bg-white to-transparent"
        style={{ height: bottomFadeHeight }}
        aria-hidden
      />
    </div>
  );
}

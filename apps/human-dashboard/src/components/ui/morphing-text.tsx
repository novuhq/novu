'use client';

import { useMeasuredWidth } from '@/hooks/use-measured-width';
import { cn } from '@/lib/utils';

/**
 * Words that change in place, such as a button's label: the new words fade in, and the room they take grows
 * or shrinks to them instead of jumping, so what sits next to them slides along.
 */
export function MorphingText({ text, className }: { text: string; className?: string }) {
  const { ref, width } = useMeasuredWidth();

  return (
    <span
      style={{ width }}
      className={cn(
        'inline-block overflow-hidden align-top whitespace-nowrap transition-[width] duration-300 ease-out motion-reduce:transition-none',
        className
      )}
    >
      <span ref={ref} key={text} className="inline-block animate-overlay-in motion-reduce:animate-none">
        {text}
      </span>
    </span>
  );
}

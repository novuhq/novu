import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** Adds the dithered orange glow in the top right corner, for the card that needs attention. */
  glow?: boolean;
  /** A dashed outline for something that isn't set up yet. */
  dashed?: boolean;
};

export function Card({ glow = false, dashed = false, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-subtle',
        dashed && 'border-dashed bg-transparent',
        glow && 'dot-glow',
        className
      )}
      {...rest}
    />
  );
}

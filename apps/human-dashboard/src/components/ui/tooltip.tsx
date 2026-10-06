'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import type { ReactElement, ReactNode } from 'react';

export const TooltipProvider = TooltipPrimitive.Provider;

type TooltipProps = {
  label: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** The element the tooltip describes. It must accept a ref and DOM props. */
  children: ReactElement;
};

/** A short hint on hover or keyboard focus. Needs a `TooltipProvider` above it. */
export function Tooltip({ label, side = 'top', children }: TooltipProps) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className="z-50 animate-overlay-in rounded bg-foreground px-2 py-1 text-xs font-medium tracking-tight text-background shadow-lg motion-reduce:animate-none"
        >
          {label}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

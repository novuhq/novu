'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { type ReactElement, type ReactNode, useState } from 'react';

export const TooltipProvider = TooltipPrimitive.Provider;

type TooltipProps = {
  label: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Keeps the hint closed, for an element that says the same on its own for now. */
  disabled?: boolean;
  /** The element the tooltip describes. It must accept a ref and DOM props. */
  children: ReactElement;
};

/** A short hint on hover or keyboard focus. Needs a `TooltipProvider` above it. */
export function Tooltip({ label, side = 'top', disabled = false, children }: TooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <TooltipPrimitive.Root open={open && !disabled} onOpenChange={setOpen}>
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

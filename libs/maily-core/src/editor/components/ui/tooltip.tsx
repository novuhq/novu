'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as React from 'react';
import { cn } from '@/editor/utils/classname';

// Explicit type annotations to avoid TS2742 errors
const TooltipProvider: React.FC<React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Provider>> =
  TooltipPrimitive.Provider;

const Tooltip: React.FC<React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>> = TooltipPrimitive.Root;

const TooltipTrigger: React.FC<React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>> =
  TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'mly-z-50 mly-overflow-hidden mly-rounded-md mly-border mly-border-gray-200 mly-bg-white mly-px-2 mly-py-1 mly-text-xs mly-animate-in mly-fade-in-0 mly-zoom-in-95',
      className
    )}
    {...props}
  />
)) as React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> &
    React.RefAttributes<React.ElementRef<typeof TooltipPrimitive.Content>>
>;

TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };

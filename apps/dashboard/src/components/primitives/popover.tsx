import * as PopoverPrimitive from '@radix-ui/react-popover';
import * as React from 'react';

import { cn } from '@/utils/ui';

const arrowClipPathClassName = `[&_.arrow]:[clip-path:inset(0_-10px_-10px_-10px)]`;

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverAnchor = PopoverPrimitive.Anchor;

const PopoverPortal = PopoverPrimitive.Portal;
const PopoverClose = PopoverPrimitive.Close;
const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> & { portal?: boolean }
>(({ className, align = 'center', portal = true, sideOffset = 4, ...props }, ref) => {
  const body = (
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        `bg-background text-foreground-950 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-72 overflow-auto rounded-md border p-4 shadow-md outline-none ${arrowClipPathClassName}`,
        className
      )}
      {...props}
    />
  );

  return portal ? <PopoverPrimitive.Portal>{body}</PopoverPrimitive.Portal> : body;
});

const PopoverArrow = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Arrow>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Arrow> & { portal?: boolean }
>(({ className, ...props }, ref) => {
  return (
    <PopoverPrimitive.Arrow
      ref={ref}
      className={cn('arrow fill-background [filter:drop-shadow(0_0_4px_hsl(var(--neutral-alpha-600)))]', className)}
      {...props}
    />
  );
});

PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverAnchor, PopoverArrow, PopoverClose, PopoverContent, PopoverPortal, PopoverTrigger };

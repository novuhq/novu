import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

import { cn } from '@/utils/ui';
import { cva, VariantProps } from 'class-variance-authority';

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const tooltipContentVariants = cva(
  `z-50 overflow-hidden  px-3 py-1.5 text-xs  animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2`,
  {
    variants: {
      variant: {
        default: 'bg-neutral-950 text-foreground-0',
        light: 'border border-neutral-alpha-400 bg-background shadow-xs',
      },
      size: {
        default: 'rounded-md',
        '2xs': '',
        xs: '',
        lg: 'p-3 w-72 rounded-[12px]',
      },
    },
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
  }
);

type TooltipContentProps = React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> &
  VariantProps<typeof tooltipContentVariants>;

const TooltipContent = React.forwardRef<React.ElementRef<typeof TooltipPrimitive.Content>, TooltipContentProps>(
  ({ className, sideOffset = 4, variant, size, ...props }, ref) => (
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(tooltipContentVariants({ variant, size }), className)}
      {...props}
    />
  )
);

const tooltipArrowVariants = cva(``, {
  variants: {
    variant: {
      default: 'fill-primary',
      light: 'fill-background drop-shadow-[0_0_0_rgb(0,0,0)]',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

type TooltipArrowProps = React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Arrow> &
  VariantProps<typeof tooltipArrowVariants>;

const TooltipArrow = React.forwardRef<React.ElementRef<typeof TooltipPrimitive.Arrow>, TooltipArrowProps>(
  ({ className, variant, ...props }, ref) => (
    <TooltipPrimitive.Arrow ref={ref} className={cn(tooltipArrowVariants({ variant }), className)} {...props} />
  )
);

TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, TooltipArrow };

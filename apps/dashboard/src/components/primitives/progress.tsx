import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';

import { cn } from '@/utils/ui';
import { cva, VariantProps } from 'class-variance-authority';

const indicatorVariants = cva(`h-full w-full flex-1 transition-all`, {
  variants: {
    variant: {
      default: 'bg-neutral-800',
      novu: 'bg-information',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

type ProgressProps = React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> &
  VariantProps<typeof indicatorVariants>;

const Progress = React.forwardRef<React.ElementRef<typeof ProgressPrimitive.Root>, ProgressProps>(
  ({ className, variant, value, max, ...props }, ref) => {
    const percentage = (value ?? 100) / (max ?? 100);
    const translateX = (percentage - 1) * 100;

    return (
      <ProgressPrimitive.Root
        ref={ref}
        className={cn('relative h-1.5 w-full overflow-hidden rounded-full bg-neutral-200', className)}
        max={max}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={indicatorVariants({ variant })}
          style={{ transform: `translateX(${translateX}%)` }}
        />
      </ProgressPrimitive.Root>
    );
  }
);
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };

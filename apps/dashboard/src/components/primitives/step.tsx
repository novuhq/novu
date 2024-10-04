import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/utils/ui';

const stepVariants = cva(
  'inline-flex items-center rounded-full border text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-secondary-alpha-100 bg-secondary-alpha-50 text-secondary-alpha-400',
        feature: 'border-feature/30  bg-foreground/2.5 text-feature/30',
        information: 'border-information/30 bg-foreground/2.5 text-information/30',
        highlighted: 'border-highlighted/30  bg-foreground/2.5 text-highlighted/30',
        stable: 'border-stable/30  bg-foreground/2.5 text-stable/30',
      },
      size: {
        default: 'p-2 [&>svg]:size-3.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface StepProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof stepVariants> {}

function Step({ className, variant, ...props }: StepProps) {
  return <div className={cn(stepVariants({ variant }), className)} {...props} />;
}

export { Step, stepVariants };

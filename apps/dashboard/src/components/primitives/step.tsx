import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/utils/ui';

const stepVariants = cva(
  'inline-flex items-center rounded-full border-1.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-muted-foreground/5 bg-muted/50 text-muted-foreground/50',
        feature: 'border-feature/30 bg-transparent text-feature/30',
        information: 'border-information/30 bg-transparent text-information/30',
        highlighted: 'border-highlighted/30 bg-transparent text-highlighted/30',
        stable: 'border-stable/30 bg-transparent text-stable/30',
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

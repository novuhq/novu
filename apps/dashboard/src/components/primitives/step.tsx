import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/utils/ui';

const stepVariants = cva(
  'inline-flex items-center shadow-xs rounded-full border text-xs font-semibold transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-neutral-50',
  {
    variants: {
      variant: {
        // use solid bg here because we usually stack these on top of each other
        neutral: 'border-neutral-100 text-neutral-400',
        feature: 'border-feature/30 text-feature/30',
        information: 'border-information/30 text-information/30',
        highlighted: 'border-highlighted/30 text-highlighted/30',
        stable: 'border-stable/30 text-stable/30',
        verified: 'border-verified/30 text-verified/30',
        destructive: 'border-destructive/30 text-destructive/30',
        warning: 'border-warning/30 text-warning/30',
        alert: 'border-alert/30 text-alert/30',
      },
      size: {
        default: 'p-1 [&>svg]:size-3.5',
      },
    },
    defaultVariants: {
      variant: 'neutral',
      size: 'default',
    },
  }
);

export interface StepProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof stepVariants> {}

function Step({ className, variant, ...props }: StepProps) {
  return <div className={cn(stepVariants({ variant }), className)} {...props} />;
}

export { Step };

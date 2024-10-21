import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/utils/ui';

const tagVariants = cva(
  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-neutral-alpha-100 text-neutral-alpha-500',
        feature: 'bg-feature/10 text-feature',
        information: 'bg-information/10 text-information',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface TagProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof tagVariants> {}

function Tag({ className, variant, ...props }: TagProps) {
  return <div className={cn(tagVariants({ variant }), className)} {...props} />;
}

export { Tag };

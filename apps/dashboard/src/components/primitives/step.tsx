import * as React from 'react';
import { type VariantProps } from 'class-variance-authority';

import { cn } from '@/utils/ui';
import { stepVariants } from './variants';

export interface StepProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof stepVariants> {}

function Step({ className, variant, ...props }: StepProps) {
  return <div className={cn(stepVariants({ variant }), className)} {...props} />;
}

export { Step };

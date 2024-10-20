import * as React from 'react';
import { type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/ui';
import { badgeContentVariants, badgeVariants } from './variants';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, kind, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, kind }), className)} {...props} />;
}

export interface BadgeContentProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeContentVariants> {}

function BadgeContent({ className, variant, ...props }: BadgeContentProps) {
  return <span className={cn(badgeContentVariants({ variant }), className)} {...props} />;
}

export { Badge, BadgeContent };

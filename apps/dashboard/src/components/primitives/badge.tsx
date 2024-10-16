import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/ui';

const badgeVariants = cva(
  'inline-flex items-center h-5 border px-2 py-1 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        neutral: 'border-neutral-500 bg-neutral-500',
        feature: 'border-feature bg-feature',
        information: 'border-information bg-information',
        highlighted: 'border-highlighted bg-highlighted',
        stable: 'border-stable bg-stable',
        verified: 'border-verified bg-verified',
        destructive: 'border-destructive bg-destructive',
        'destructive-light': 'border-transparent bg-destructive/10',
        success: 'border-success bg-success',
        'success-light': 'border-transparent bg-success/10',
        warning: 'border-warning bg-warning',
        'warning-light': 'border-transparent bg-warning/10',
        alert: 'border-alert bg-alert',
        soft: 'border-neutral-alpha-200 bg-neutral-alpha-200',
      },
      kind: {
        default: 'rounded-md',
        pill: 'rounded-full',
        'pill-stroke': 'rounded-full bg-transparent',
      },
    },
    defaultVariants: {
      variant: 'neutral',
      kind: 'default',
    },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, kind, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, kind }), className)} {...props} />;
}

const badgeContentVariants = cva('text-xs font-medium', {
  variants: {
    variant: {
      foreground: 'text-foreground',
      'neutral-foreground': 'text-neutral-foreground',
      neutral: 'text-neutral-500',
      feature: 'text-feature',
      information: 'text-information',
      highlighted: 'text-highlighted',
      stable: 'text-stable',
      verified: 'text-verified',
      destructive: 'text-destructive',
      success: 'text-success',
      warning: 'text-warning',
      alert: 'text-alert',
    },
  },
  defaultVariants: {
    variant: 'foreground',
  },
});

export interface BadgeContentProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeContentVariants> {}

function BadgeContent({ className, variant, ...props }: BadgeContentProps) {
  return <span className={cn(badgeContentVariants({ variant }), className)} {...props} />;
}

export { Badge, BadgeContent, badgeVariants, badgeContentVariants };

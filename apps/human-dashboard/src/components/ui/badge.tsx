import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type BadgeVariant = 'success' | 'pending' | 'danger' | 'neutral' | 'accent';

const VARIANTS: Record<BadgeVariant, string> = {
  success: 'bg-raised text-foreground ring-border',
  pending: 'bg-raised text-foreground ring-border',
  danger: 'bg-raised text-foreground ring-border',
  neutral: 'font-mono text-[11px] tracking-wider text-muted uppercase ring-border-strong',
  accent: 'font-mono text-[11px] tracking-wider text-accent uppercase ring-accent',
};

const DOTS: Partial<Record<BadgeVariant, string>> = {
  success: 'bg-success',
  pending: 'bg-pending',
  danger: 'bg-danger',
};

type BadgeProps = {
  variant?: BadgeVariant;
  className?: string;
  children: ReactNode;
};

/**
 * A small status label. `success`, `pending` and `danger` lead with a colored dot ("Connected",
 * "Invite sent"); `neutral` and `accent` are the uppercase mono tags ("NOT SET UP", "BETA").
 */
export function Badge({ variant = 'neutral', className, children }: BadgeProps) {
  const dot = DOTS[variant];

  return (
    <span
      className={cn(
        'inline-flex h-5.5 shrink-0 items-center gap-1.5 rounded-sm px-1.5 text-xs font-medium tracking-tight whitespace-nowrap ring-1',
        VARIANTS[variant],
        className
      )}
    >
      {dot && <span aria-hidden="true" className={cn('size-1.5 rounded-full', dot)} />}
      {children}
    </span>
  );
}

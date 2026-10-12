import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type BadgeVariant = 'success' | 'pending' | 'danger' | 'neutral' | 'accent';

const STATUS = 'h-5.5 gap-1.5 rounded bg-raised pr-2 pl-1.75 text-xs leading-4 font-medium text-default';
const TAG =
  'h-5 rounded-[3px] px-1.5 font-mono text-[10px] leading-3.5 font-medium tracking-[0.06em] uppercase ring-1 ring-inset';

const VARIANTS: Record<BadgeVariant, string> = {
  success: STATUS,
  pending: STATUS,
  danger: STATUS,
  neutral: `${TAG} text-secondary ring-border`,
  accent: `${TAG} text-accent ring-accent`,
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
    <span className={cn('inline-flex shrink-0 items-center whitespace-nowrap', VARIANTS[variant], className)}>
      {dot && <span aria-hidden="true" className={cn('size-1.5 rounded-full', dot)} />}
      {children}
    </span>
  );
}

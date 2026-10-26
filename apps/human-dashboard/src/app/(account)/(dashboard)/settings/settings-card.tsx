import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type SettingsCardProps = {
  className?: string;
  children: ReactNode;
};

/** One block of the Settings page. Sits on the page's own background, so only its border sets it apart. */
export function SettingsCard({ className, children }: SettingsCardProps) {
  return (
    <section className={cn('rounded-lg border border-border bg-background px-5 py-4.5', className)}>{children}</section>
  );
}

type CardHeadingProps = {
  title: ReactNode;
  description: ReactNode;
  /** Dimmer text, for the card nobody should reach for. */
  muted?: boolean;
};

export function CardHeading({ title, description, muted = false }: CardHeadingProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <h2 className="flex items-center gap-2 text-[13px] leading-4.5 font-medium text-foreground">{title}</h2>
      <p className={cn('text-xs leading-4', muted ? 'text-muted' : 'text-secondary')}>{description}</p>
    </div>
  );
}

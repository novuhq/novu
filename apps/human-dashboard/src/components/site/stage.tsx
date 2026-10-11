import type { ReactNode } from 'react';

import { Brand } from '@/components/site/brand';
import { cn } from '@/lib/utils';

type StageProps = {
  /** Shown on the right of the top bar, such as the signed-in email. */
  aside?: ReactNode;
  children: ReactNode;
};

/**
 * A full-screen page with only the brand bar and one card in the middle, over the dithered glow.
 * For screens outside the dashboard: authorizing the CLI, an expired link, page not found.
 */
export function Stage({ aside, children }: StageProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-15 shrink-0 items-center justify-between gap-4 border-b border-border px-7">
        <Brand />
        {aside && <div className="min-w-0 truncate font-mono text-[11px] leading-4 text-secondary">{aside}</div>}
      </header>
      <main className="relative isolate flex flex-1 items-center justify-center overflow-hidden px-4 py-10">
        {/*
          `Illustration/texture-glow`, exported as it is. At its own size against the bottom right corner, 80px
          of it below the edge as in the design, so its pixel grid is never scaled.
        */}
        <img
          src="/illustrations/texture-glow.svg"
          alt=""
          aria-hidden="true"
          width={1728}
          height={1152}
          className="pointer-events-none absolute right-0 -bottom-20 -z-10 h-288 w-432 max-w-none opacity-55 select-none"
        />
        {children}
      </main>
    </div>
  );
}

type StageCardProps = {
  /** Illustration above the title, such as the mascot or a warning mark. */
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  className?: string;
  children?: ReactNode;
};

export function StageCard({ icon, title, description, className, children }: StageCardProps) {
  return (
    <section className={cn('w-full max-w-md rounded-lg border border-border bg-subtle p-7', className)}>
      {icon && <div className="mb-5">{icon}</div>}
      <h1 className="text-xl tracking-tight text-foreground">{title}</h1>
      {description && <p className="mt-3 text-sm leading-normal tracking-tight text-secondary">{description}</p>}
      {children && <div className="mt-5 flex flex-col gap-4">{children}</div>}
    </section>
  );
}

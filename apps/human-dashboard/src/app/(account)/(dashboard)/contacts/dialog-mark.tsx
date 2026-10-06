import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type DialogMarkProps = {
  tone: 'accent' | 'danger';
  children: ReactNode;
};

/** The round dithered mark above a dialog's title: orange for something that worked, red for a warning. */
export function DialogMark({ tone, children }: DialogMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative flex size-10 items-center justify-center overflow-hidden rounded-full ring-1',
        tone === 'accent' ? 'text-accent ring-accent/40' : 'text-danger ring-danger-border'
      )}
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle,currentColor_1px,transparent_1.5px)] bg-size-[4px_4px] opacity-40" />
      <span className="relative flex size-5 items-center justify-center rounded-full bg-subtle">{children}</span>
    </span>
  );
}

import type { ReactNode } from 'react';

export function RequiredFieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-text-strong flex items-center gap-px text-label-xs font-medium">
      <span>{children}</span>
      <span className="text-primary-base text-label-sm leading-5 tracking-tight" aria-hidden>
        *
      </span>
      <span className="sr-only">(required)</span>
    </label>
  );
}

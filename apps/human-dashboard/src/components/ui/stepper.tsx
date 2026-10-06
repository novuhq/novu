import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type StepStatus = 'done' | 'current' | 'upcoming' | 'error';

/** The numbered steps of a setup flow, one card per step. */
export function Stepper({ className, children }: { className?: string; children: ReactNode }) {
  return <ol className={cn('flex flex-col gap-3', className)}>{children}</ol>;
}

type StepProps = {
  /** The step number shown in the marker, starting at 1. */
  index: number;
  title: string;
  status: StepStatus;
  /** One line under the title once the step is done, such as "@my_bot · token saved". */
  summary?: ReactNode;
  /** A control on the right of the header, such as "redo this step". */
  action?: ReactNode;
  /** The step's instructions and inputs. Only shown while the step is current or has an error. */
  children?: ReactNode;
  /** The bottom bar with the Back and Continue buttons. Only shown with `children`. */
  footer?: ReactNode;
  /** Adds the dithered orange glow, for a step that waits on something outside the page. */
  glow?: boolean;
};

export function Step({ index, title, status, summary, action, children, footer, glow = false }: StepProps) {
  const open = status === 'current' || status === 'error';

  return (
    <li
      aria-current={open ? 'step' : undefined}
      className={cn(
        'rounded-lg border border-border bg-raised',
        status === 'upcoming' && 'bg-transparent',
        glow && open && 'dot-glow'
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <StepMarker index={index} status={status} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3
            className={cn(
              'text-sm font-medium tracking-tight',
              status === 'upcoming' ? 'text-muted' : 'text-foreground'
            )}
          >
            {title}
          </h3>
          {status === 'done' && summary && <p className="truncate text-xs tracking-tight text-secondary">{summary}</p>}
        </div>
        {action}
      </div>
      {open && children && <div className="flex flex-col gap-3 px-4 pb-4 pl-13">{children}</div>}
      {open && children && footer && (
        <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">{footer}</div>
      )}
    </li>
  );
}

function StepMarker({ index, status }: { index: number; status: StepStatus }) {
  if (status === 'done') {
    return (
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-success text-background">
        <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
        <span className="sr-only">Done</span>
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-xs',
        status === 'current' && 'bg-foreground text-background',
        status === 'error' && 'bg-danger text-on-accent',
        status === 'upcoming' && 'text-muted ring-1 ring-border-strong'
      )}
    >
      {index}
    </span>
  );
}

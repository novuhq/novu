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
  /** Lays the body out differently, such as centered across the whole card instead of under the title. */
  bodyClassName?: string;
};

/** How a step's parts move when the flow goes from one step to the next. */
const EASE = 'duration-300 ease-out motion-reduce:transition-none';

export function Step({
  index,
  title,
  status,
  summary,
  action,
  children,
  footer,
  glow = false,
  bodyClassName,
}: StepProps) {
  const open = status === 'current' || status === 'error';
  const hasBody = Boolean(children);

  return (
    <li
      aria-current={open ? 'step' : undefined}
      className={cn('overflow-hidden rounded-[10px] border border-border bg-background', glow && open && 'dot-glow')}
    >
      <div className="flex items-start gap-3 px-4.5 py-4">
        <StepMarker index={index} status={status} />
        <div className="flex min-w-0 flex-1 flex-col">
          <h3
            className={cn(
              'text-sm leading-5.25 font-medium transition-colors',
              EASE,
              status === 'upcoming' ? 'text-muted' : 'text-foreground'
            )}
          >
            {title}
          </h3>
          {summary && (
            <Fold open={status === 'done'}>
              <p className="truncate pt-0.5 text-xs leading-4 text-secondary">{summary}</p>
            </Fold>
          )}
        </div>
        {action}
      </div>
      {/* Kept in the page while closed, so the step can grow open and fold shut instead of popping. */}
      {hasBody && (
        <Fold open={open}>
          <div className={cn('flex flex-col gap-3.5 pt-0.5 pr-4.5 pb-4.5 pl-13', bodyClassName)}>{children}</div>
          {footer && (
            <div className="flex items-center justify-between gap-2 border-t border-border bg-background px-4.5 py-3">
              {footer}
            </div>
          )}
        </Fold>
      )}
    </li>
  );
}

/**
 * Grows its content open and folds it shut. While shut the content is still there but out of reach:
 * `inert` keeps the keyboard and screen readers away from a step that isn't the current one.
 */
export function Fold({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div
      inert={!open}
      className={cn(
        'grid transition-[grid-template-rows,opacity]',
        EASE,
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

/** The number of a step, which turns into a check mark once the step is done. */
function StepMarker({ index, status }: { index: number; status: StepStatus }) {
  const done = status === 'done';
  const layer = cn('col-start-1 row-start-1 transition-[opacity,scale]', EASE);

  return (
    <span
      className={cn(
        'grid size-5.5 shrink-0 place-items-center rounded-full font-mono text-[11px] leading-4 transition-colors',
        EASE,
        done && 'bg-success text-background',
        status === 'current' && 'bg-foreground text-background',
        status === 'error' && 'bg-danger text-on-accent',
        status === 'upcoming' && 'bg-raised text-muted'
      )}
    >
      <span aria-hidden="true" className={cn(layer, done && 'scale-50 opacity-0')}>
        {index}
      </span>
      <Check aria-hidden="true" className={cn(layer, 'size-3', !done && 'scale-50 opacity-0')} strokeWidth={3} />
      {done && <span className="sr-only">Done</span>}
    </span>
  );
}

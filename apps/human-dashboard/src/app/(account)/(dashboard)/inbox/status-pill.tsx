import { describeState, type InboxPerson, type InboxThreadState, type InboxTone } from '@/lib/inbox';
import { cn } from '@/lib/utils';

/** Filled for what needs someone (new, waiting), outlined for what doesn't (open, resolved). */
const PILL_TONES: Record<InboxTone, string> = {
  accent: 'bg-accent/12 text-accent',
  warning: 'bg-warning/12 text-warning',
  open: 'border border-border-strong bg-raised text-default',
  muted: 'border border-border-strong text-muted',
};

/** The colour of a state written out in running text, such as the Status in Details. */
export const STATE_TEXT_TONES: Record<InboxTone, string> = {
  accent: 'text-accent',
  warning: 'text-warning',
  open: 'text-foreground',
  muted: 'text-foreground',
};

type StatusPillProps = {
  state: InboxThreadState;
  waitingOn?: InboxPerson[];
  className?: string;
};

/** Where a thread stands, in a row and in the drawer's header: "new", "waiting on Maya", "resolved". */
export function StatusPill({ state, waitingOn, className }: StatusPillProps) {
  const { label, tone } = describeState(state, waitingOn);

  return (
    <span
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center rounded px-1.75 py-0.5 font-mono text-[11px] leading-4 whitespace-nowrap',
        PILL_TONES[tone],
        className
      )}
    >
      {/* Its own box, so a long name can end in an ellipsis where the pill is given less room. */}
      <span className="min-w-0 truncate">{label}</span>
    </span>
  );
}

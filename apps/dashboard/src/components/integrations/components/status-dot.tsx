import { cn } from '@/utils/ui';

export type StatusTone = 'success' | 'error' | 'warning' | 'neutral';

const TONE_STYLE: Record<StatusTone, { halo: string; dot: string }> = {
  success: { halo: 'bg-success/15', dot: 'bg-success' },
  error: { halo: 'bg-error-base/15', dot: 'bg-error-base' },
  warning: { halo: 'bg-warning/15', dot: 'bg-warning' },
  neutral: { halo: 'bg-neutral-alpha-100', dot: 'bg-text-soft' },
};

/** A small dot in a soft halo of the same colour, for an integration's status. */
export function StatusDot({ tone }: { tone: StatusTone }) {
  const style = TONE_STYLE[tone];

  return (
    <span className={cn('flex size-4 shrink-0 items-center justify-center rounded-full', style.halo)}>
      <span className={cn('size-1.5 rounded-full', style.dot)} />
    </span>
  );
}

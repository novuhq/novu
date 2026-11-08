import { type LucideIcon, SquareMinus, SquarePlus, TriangleAlert } from 'lucide-react';
import type { ChangeDiffStat } from '@/hooks/use-changes-tree';
import { cn } from '@/utils/ui';
import { Badge, BadgeIcon } from '../primitives/badge';

const DIFF_BAR_COUNT = 5;

function getAddedBarCount({ added, deleted }: ChangeDiffStat): number {
  const total = added + deleted;
  if (total === 0) return 0;

  const addedBars = Math.round((added / total) * DIFF_BAR_COUNT);
  if (added > 0 && addedBars === 0) return 1;
  if (deleted > 0 && addedBars === DIFF_BAR_COUNT) return DIFF_BAR_COUNT - 1;

  return addedBars;
}

export function DiffStat({ stat, showBars = true }: { stat: ChangeDiffStat; showBars?: boolean }) {
  const addedBars = getAddedBarCount(stat);

  return (
    <span
      role="img"
      className="flex shrink-0 items-center gap-0.5"
      aria-label={`${stat.added} added, ${stat.deleted} deleted`}
    >
      <span className="flex items-center gap-1 text-label-xs">
        {stat.added > 0 && <span className="text-success-base">+{stat.added}</span>}
        {stat.deleted > 0 && <span className="text-error-base">-{stat.deleted}</span>}
      </span>
      {showBars && (
        <span className="flex h-2.5 items-center gap-px" aria-hidden>
          {Array.from({ length: DIFF_BAR_COUNT }, (_, index) => (
            <span
              key={index}
              className={cn('h-full w-[3px]', index < addedBars ? 'bg-success-base/40' : 'bg-error-base/40')}
            />
          ))}
        </span>
      )}
    </span>
  );
}

export function BreakingBadge() {
  return (
    <Badge variant="lighter" size="sm" color="orange" className="gap-0.5 pl-1 pr-2">
      <BadgeIcon as={TriangleAlert} className="mx-0" />
      Breaking
    </Badge>
  );
}

export function ResourceStatusBadge({ status }: { status: 'added' | 'deleted' | 'breaking' }) {
  switch (status) {
    case 'added':
      return (
        <Badge variant="lighter" size="sm" color="green" className="gap-0.5 pl-1 pr-2">
          <BadgeIcon as={SquarePlus} className="mx-0" />
          Added
        </Badge>
      );
    case 'deleted':
      return (
        <Badge variant="lighter" size="sm" color="red" className="gap-0.5 pl-1 pr-2">
          <BadgeIcon as={SquareMinus} className="mx-0" />
          Deleted
        </Badge>
      );
    case 'breaking':
      return <BreakingBadge />;
    default: {
      const _exhaustiveCheck: never = status;

      return _exhaustiveCheck;
    }
  }
}

/** Neutral note. Color stays on the icon, matching the publish-diff note rule. */
export function ChangeNote({
  icon: Icon,
  tone,
  text,
  className,
}: {
  icon: LucideIcon;
  tone: 'error' | 'warning';
  text: string;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start gap-2 rounded-md bg-bg-muted px-2.5 py-[7px]', className)}>
      <span className="flex size-4 shrink-0 items-center justify-center">
        <Icon className={cn('size-3.5', tone === 'error' ? 'text-error-base' : 'text-warning-base')} />
      </span>
      <p className="text-label-xs text-text-sub">{text}</p>
    </div>
  );
}

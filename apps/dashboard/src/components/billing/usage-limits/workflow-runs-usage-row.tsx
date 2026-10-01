import { RiBarChartBoxLine } from 'react-icons/ri';
import { LinkButton } from '@/components/primitives/button-link';
import { formatShortDate } from '@/utils/format-date';
import { formatCompactNumber, formatNumber } from '@/utils/number-formatting';
import type { UsageLimitsView, WorkflowRunsUsage } from './usage-limits-view';
import { useUsageLimitsDrawerParam } from './use-usage-limits-drawer-param';

function toPercent(value: number, total: number): number {
  return total > 0 ? (value / total) * 100 : 0;
}

function UsageBar({ usage }: { usage: WorkflowRunsUsage }) {
  const { state, current, included } = usage;
  const scale = Math.max(usage.max, current);

  switch (state) {
    case 'paused':
      return <div className="h-[5px] w-full rounded-[2px] bg-error-base" />;
    case 'within_included':
      return (
        <div className="flex h-[5px] w-full overflow-hidden rounded-[2px] bg-bg-muted">
          <div className="h-full bg-neutral-700" style={{ width: `${toPercent(current, scale)}%` }} />
        </div>
      );
    case 'billed_on_demand':
      return (
        <div className="flex h-[5px] w-full gap-px overflow-hidden rounded-[2px] bg-bg-muted">
          <div className="h-full bg-neutral-700" style={{ width: `${toPercent(included, scale)}%` }} />
          <div
            className="h-full bg-[image:repeating-linear-gradient(-45deg,hsl(var(--neutral-700))_0_2px,hsl(var(--neutral-300))_2px_4px)]"
            style={{ width: `${toPercent(current - included, scale)}%` }}
          />
        </div>
      );
    default: {
      const exhaustiveCheck: never = state;

      return exhaustiveCheck;
    }
  }
}

function UsageStatusLabel({ usage }: { usage: WorkflowRunsUsage }) {
  const { state, resetsAt } = usage;

  switch (state) {
    case 'within_included':
      return <span className="text-text-soft">{Math.floor(toPercent(usage.current, usage.max))}% used</span>;
    case 'billed_on_demand':
      return <span className="text-warning-base">Billed on-demand</span>;
    case 'paused':
      return <span className="text-error-base">Paused{resetsAt && ` · Resumes ${formatShortDate(resetsAt)}`}</span>;
    default: {
      const exhaustiveCheck: never = state;

      return exhaustiveCheck;
    }
  }
}

type WorkflowRunsUsageRowProps = {
  view: UsageLimitsView;
};

export function WorkflowRunsUsageRow({ view }: WorkflowRunsUsageRowProps) {
  const { setIsDrawerRequested } = useUsageLimitsDrawerParam();
  const { usage, canEdit } = view;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-label-xs text-text-soft">
          <RiBarChartBoxLine className="size-4" />
          <span>Workflow runs</span>
        </div>
        <span className="text-label-xs">
          <span className="text-text-sub">{formatNumber(usage.current)}</span>{' '}
          <span className="text-text-soft">/ {formatNumber(usage.max)}</span>
        </span>
      </div>
      <UsageBar usage={usage} />
      <div className="flex items-center justify-between gap-2 text-label-xs">
        <UsageStatusLabel usage={usage} />
        <span className="text-text-soft">
          {formatCompactNumber(usage.included)} included
          {usage.onDemandLimit !== null && ` · ${formatCompactNumber(usage.onDemandLimit)} on-demand`}
          {canEdit && (
            <>
              {' · '}
              <LinkButton variant="gray" size="sm" className="text-label-xs" onClick={() => setIsDrawerRequested(true)}>
                {usage.onDemandLimit !== null ? 'Edit limit' : 'Set limit'}
              </LinkButton>
            </>
          )}
        </span>
      </div>
    </div>
  );
}

import type { GetSubscriptionDto } from '@novu/shared';
import { RiBarChartBoxLine } from 'react-icons/ri';
import { LinkButton } from '@/components/primitives/button-link';
import {
  getIncludedWorkflowRuns,
  getWorkflowRunsUsageState,
  type WorkflowRunsUsageState,
} from './workflow-runs-usage-state';

const compactNumberFormatter = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

function formatCompactNumber(value: number): string {
  return compactNumberFormatter.format(value).toLowerCase();
}

function formatResumeDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function toPercent(value: number, total: number): number {
  return total > 0 ? (value / total) * 100 : 0;
}

type UsageBarProps = {
  state: WorkflowRunsUsageState;
  current: number;
  included: number;
  denominator: number;
};

function UsageBar({ state, current, included, denominator }: UsageBarProps) {
  const scale = Math.max(denominator, current);

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
    case 'limit_crossed':
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

type UsageStatusLabelProps = {
  state: WorkflowRunsUsageState;
  current: number;
  denominator: number;
  currentPeriodEnd: string | null;
};

function UsageStatusLabel({ state, current, denominator, currentPeriodEnd }: UsageStatusLabelProps) {
  switch (state) {
    case 'within_included':
      return <span className="text-text-soft">{Math.floor(toPercent(current, denominator))}% used</span>;
    case 'billed_on_demand':
    case 'limit_crossed':
      return <span className="text-warning-base">Billed on-demand</span>;
    case 'paused':
      return (
        <span className="text-error-base">
          Paused{currentPeriodEnd && ` · Resumes ${formatResumeDate(currentPeriodEnd)}`}
        </span>
      );
    default: {
      const exhaustiveCheck: never = state;

      return exhaustiveCheck;
    }
  }
}

type WorkflowRunsUsageRowProps = {
  subscription: GetSubscriptionDto;
  canConfigure: boolean;
  onEditLimit: () => void;
};

export function WorkflowRunsUsageRow({ subscription, canConfigure, onEditLimit }: WorkflowRunsUsageRowProps) {
  const { events } = subscription;
  const state = getWorkflowRunsUsageState(events);
  const included = getIncludedWorkflowRuns(subscription);
  const denominator = events.limit ?? included;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-label-xs text-text-soft">
          <RiBarChartBoxLine className="size-4" />
          <span>Workflow runs</span>
        </div>
        <span className="text-label-xs">
          <span className="text-text-sub">{events.current.toLocaleString()}</span>{' '}
          <span className="text-text-soft">/ {denominator.toLocaleString()}</span>
        </span>
      </div>
      <UsageBar state={state} current={events.current} included={included} denominator={denominator} />
      <div className="flex items-center justify-between gap-2 text-label-xs">
        <UsageStatusLabel
          state={state}
          current={events.current}
          denominator={denominator}
          currentPeriodEnd={subscription.currentPeriodEnd}
        />
        <span className="text-text-soft">
          {formatCompactNumber(included)} included
          {events.headroom !== null && ` · ${formatCompactNumber(events.headroom)} on-demand`}
          {canConfigure && (
            <>
              {' · '}
              <LinkButton variant="gray" size="sm" className="text-label-xs" onClick={onEditLimit}>
                {events.headroom !== null ? 'Edit limit' : 'Set limit'}
              </LinkButton>
            </>
          )}
        </span>
      </div>
    </div>
  );
}

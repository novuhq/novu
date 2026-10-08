import { type GetSubscriptionDto, USAGE_LIMITS_DASHBOARD_PATH } from '@novu/shared';
import { RiArrowRightSLine, RiCalendarEventLine, RiErrorWarningFill, RiErrorWarningLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { getWorkflowRunsMax } from '@/components/billing/usage-limits/usage-limits-view';
import { useFetchConversationUsage } from '@/hooks/use-fetch-conversation-usage';
import { useTelemetry } from '@/hooks/use-telemetry';
import { formatShortDate } from '@/utils/format-date';
import { formatCompactNumber } from '@/utils/number-formatting';
import { ROUTES } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';
import { Button } from '../primitives/button';
import { Progress } from '../primitives/progress';
import type { SidebarPlanCardVariant } from './sidebar-plan-card-variant';

type UsageMetric = {
  label: string;
  current: number;
  max: number;
};

const getUsagePercentage = (current: number, limit: number): number => Math.min((current / limit) * 100, 100);

const isLimitReached = ({ current, max }: UsageMetric): boolean => current >= max;

function useUsageCard(
  variant: Extract<SidebarPlanCardVariant, 'free_usage' | 'paused_usage'>,
  subscription: GetSubscriptionDto
) {
  const track = useTelemetry();
  const { conversationUsage } = useFetchConversationUsage();

  const workflowRuns: UsageMetric = {
    label: 'Workflow runs',
    current: subscription.events.current,
    max: getWorkflowRunsMax(subscription),
  };
  const metrics = [workflowRuns];

  // Unlimited conversation tiers don't need the nudge.
  if (conversationUsage && conversationUsage.included !== null) {
    metrics.push({ label: 'Conversations', current: conversationUsage.current, max: conversationUsage.included });
  }

  const trackClick = () => {
    track(TelemetryEvent.USAGE_CARD_CLICKED, {
      variant,
      currentEvents: workflowRuns.current,
      maxEvents: workflowRuns.max,
      usagePercentage: getUsagePercentage(workflowRuns.current, workflowRuns.max),
      isLimitReached: isLimitReached(workflowRuns),
    });
  };

  return { metrics, trackClick };
}

type FreeUsageCardProps = {
  subscription: GetSubscriptionDto;
};

/** Free plans block at each limit, so every reached limit is called out with an upgrade prompt. */
export function FreeUsageCard({ subscription }: FreeUsageCardProps) {
  const { metrics, trackClick } = useUsageCard('free_usage', subscription);

  return (
    <Link
      to={ROUTES.SETTINGS_BILLING}
      className="bg-bg-white group relative mb-2 flex min-h-[58px] cursor-pointer flex-col rounded-lg"
      onClick={trackClick}
    >
      <FreeUsageCardContent metrics={metrics} resetDate={subscription.currentPeriodEnd} />
    </Link>
  );
}

type PausedUsageCardProps = {
  subscription: GetSubscriptionDto;
  canEditUsageLimits: boolean;
};

/** The header names the one blocking limit, so the rows only show usage. */
export function PausedUsageCard({ subscription, canEditUsageLimits }: PausedUsageCardProps) {
  const { metrics, trackClick } = useUsageCard('paused_usage', subscription);
  const resetDate = subscription.currentPeriodEnd;

  return (
    <Link
      to={canEditUsageLimits ? USAGE_LIMITS_DASHBOARD_PATH : ROUTES.SETTINGS_BILLING}
      className="bg-warning-lighter mb-2 flex flex-col rounded-lg"
      onClick={trackClick}
    >
      <span className="text-warning-dark text-label-xs flex items-center gap-1 px-2 py-1">
        <RiErrorWarningFill className="text-warning-base size-3.5 shrink-0" />
        You've reached your usage limit.
        <RiArrowRightSLine className="ml-auto size-3.5 shrink-0" />
      </span>
      <div className="bg-bg-white space-y-2 rounded-lg p-2">
        {metrics.map((metric) => (
          <UsageMetricRow key={metric.label} metric={metric} />
        ))}
        {resetDate && <ResetDateLabel resetDate={resetDate} />}
      </div>
    </Link>
  );
}

type UsageMetricRowProps = {
  metric: UsageMetric;
  showsLimitReached?: boolean;
};

function UsageMetricRow({ metric, showsLimitReached = false }: UsageMetricRowProps) {
  const { label, current, max } = metric;
  const percentage = getUsagePercentage(current, max);

  return (
    <div className="space-y-1">
      <div className="flex items-center">
        {showsLimitReached ? (
          <span className="text-error-base text-label-xs flex items-center gap-1">
            <RiErrorWarningLine className="size-3.5" />
            {label} limit reached
          </span>
        ) : (
          <span className="text-label-xs">{label}</span>
        )}
        <span className="text-foreground-600 text-label-xs ml-auto text-[12px]">
          {formatCompactNumber(current)} / <span className="text-text-soft">{formatCompactNumber(max)}</span>
        </span>
      </div>
      <Progress
        value={percentage}
        max={100}
        variant={percentage >= 80 ? 'error' : 'default'}
        className="h-1 rounded-lg"
      />
    </div>
  );
}

function UpgradeButton() {
  return (
    <Button className="h-[24px] w-full" variant="secondary" mode="lighter" size="2xs">
      Upgrade now
    </Button>
  );
}

function ResetDateLabel({ resetDate }: { resetDate: string }) {
  return (
    <span className="text-text-soft text-label-xs flex items-center gap-1 leading-[16px]">
      <RiCalendarEventLine className="size-3.5" />
      Usage resets on {formatShortDate(resetDate)}
    </span>
  );
}

type FreeUsageCardContentProps = {
  metrics: UsageMetric[];
  resetDate: string | null;
};

function FreeUsageCardContent({ metrics, resetDate }: FreeUsageCardContentProps) {
  if (metrics.some(isLimitReached)) {
    return (
      <div className="flex flex-col p-2">
        <div className="space-y-2">
          {metrics.map((metric) => (
            <UsageMetricRow key={metric.label} metric={metric} showsLimitReached={isLimitReached(metric)} />
          ))}
          {resetDate && <ResetDateLabel resetDate={resetDate} />}
        </div>
        <div className="mt-2">
          <UpgradeButton />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col overflow-hidden p-2">
      <div className="space-y-2 transition-transform duration-200 ease-out group-hover:-translate-y-1">
        {metrics.map((metric) => (
          <UsageMetricRow key={metric.label} metric={metric} />
        ))}
      </div>

      <div className="relative mt-2 h-6">
        {resetDate && (
          <div className="absolute inset-0 flex items-center transition-all duration-200 ease-out group-hover:-translate-y-1 group-hover:opacity-0">
            <ResetDateLabel resetDate={resetDate} />
          </div>
        )}
        <div className="absolute inset-0 flex items-center translate-y-1 opacity-0 transition-all duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100">
          <UpgradeButton />
        </div>
      </div>
    </div>
  );
}

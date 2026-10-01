import type { GetSubscriptionDto } from '@novu/shared';
import type { ReactNode } from 'react';
import { RiArrowRightSLine, RiCalendarEventLine, RiErrorWarningFill, RiErrorWarningLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { getWorkflowRunsMax } from '@/components/billing/usage-limits/usage-limits-view';
import { USAGE_LIMITS_DRAWER_ROUTE } from '@/components/billing/usage-limits/use-usage-limits-drawer-param';
import { useFetchConversationUsage } from '@/hooks/use-fetch-conversation-usage';
import { useTelemetry } from '@/hooks/use-telemetry';
import { formatShortDate } from '@/utils/format-date';
import { formatCompactNumber } from '@/utils/number-formatting';
import { ROUTES } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';
import { Button } from '../primitives/button';
import { Progress } from '../primitives/progress';
import type { SidebarPlanCardVariant } from './sidebar-plan-card-variant';

type UsageCardVariant = Extract<SidebarPlanCardVariant, 'free_usage' | 'paused_usage'>;

type UsageMetric = {
  label: string;
  current: number;
  max: number;
  isLimitReached: boolean;
};

const getUsagePercentage = (current: number, limit: number): number => Math.min((current / limit) * 100, 100);

function useUsageCardMetrics(variant: UsageCardVariant, subscription: GetSubscriptionDto): UsageMetric[] {
  const { conversationUsage } = useFetchConversationUsage();
  // Free plans block at each limit; the paused paid card's header names its one blocking limit.
  const flagsReachedLimits = variant === 'free_usage';

  const toMetric = (label: string, current: number, max: number): UsageMetric => ({
    label,
    current,
    max,
    isLimitReached: flagsReachedLimits && current >= max,
  });

  const metrics = [toMetric('Workflow runs', subscription.events.current, getWorkflowRunsMax(subscription))];

  // Unlimited conversation tiers don't need the nudge.
  if (conversationUsage && conversationUsage.included !== null) {
    metrics.push(toMetric('Conversations', conversationUsage.current, conversationUsage.included));
  }

  return metrics;
}

type UsageCardLinkProps = {
  variant: UsageCardVariant;
  subscription: GetSubscriptionDto;
  to: string;
  className: string;
  children: ReactNode;
};

function UsageCardLink({ variant, subscription, to, className, children }: UsageCardLinkProps) {
  const track = useTelemetry();

  const handleClick = () => {
    const currentEvents = subscription.events.current;
    const maxEvents = getWorkflowRunsMax(subscription);

    track(TelemetryEvent.USAGE_CARD_CLICKED, {
      variant,
      currentEvents,
      maxEvents,
      usagePercentage: getUsagePercentage(currentEvents, maxEvents),
      isLimitReached: currentEvents >= maxEvents,
    });
  };

  return (
    <Link to={to} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}

type UsageCardProps = {
  subscription: GetSubscriptionDto;
};

export function UsageCard({ subscription }: UsageCardProps) {
  const metrics = useUsageCardMetrics('free_usage', subscription);

  return (
    <UsageCardLink
      variant="free_usage"
      subscription={subscription}
      to={ROUTES.SETTINGS_BILLING}
      className="bg-bg-white group relative mb-2 flex min-h-[58px] cursor-pointer flex-col rounded-lg"
    >
      <CardContent metrics={metrics} resetDate={subscription.currentPeriodEnd} />
    </UsageCardLink>
  );
}

type PausedUsageCardProps = {
  subscription: GetSubscriptionDto;
  canEditUsageLimits: boolean;
};

/** Sidebar card for paid orgs whose workflow runs are paused at their usage limit. */
export function PausedUsageCard({ subscription, canEditUsageLimits }: PausedUsageCardProps) {
  const metrics = useUsageCardMetrics('paused_usage', subscription);

  return (
    <UsageCardLink
      variant="paused_usage"
      subscription={subscription}
      to={canEditUsageLimits ? USAGE_LIMITS_DRAWER_ROUTE : ROUTES.SETTINGS_BILLING}
      className="bg-warning-lighter mb-2 flex flex-col rounded-lg"
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
        {subscription.currentPeriodEnd && <ResetDateLabel resetDate={subscription.currentPeriodEnd} />}
      </div>
    </UsageCardLink>
  );
}

function UsageMetricRow({ metric }: { metric: UsageMetric }) {
  const { label, current, max, isLimitReached } = metric;
  const percentage = getUsagePercentage(current, max);

  return (
    <div className="space-y-1">
      <div className="flex items-center">
        {isLimitReached ? (
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

type CardContentProps = {
  metrics: UsageMetric[];
  resetDate: string | null;
};

function CardContent({ metrics, resetDate }: CardContentProps) {
  if (metrics.some((metric) => metric.isLimitReached)) {
    return (
      <div className="flex flex-col p-2">
        <div className="space-y-2">
          {metrics.map((metric) => (
            <UsageMetricRow key={metric.label} metric={metric} />
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

import { GetSubscriptionDto } from '@novu/shared';
import { format } from 'date-fns';
import { RiCalendarEventLine, RiErrorWarningLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { useFetchConversationUsage } from '@/hooks/use-fetch-conversation-usage';
import { useTelemetry } from '@/hooks/use-telemetry';
import { ROUTES } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';
import { Button } from '../primitives/button';
import { Progress } from '../primitives/progress';

type UsageStatus = {
  progressVariant: 'error' | 'warning' | 'default';
  isComplete: boolean;
};

type UsageMetric = {
  label: string;
  current: number;
  max: number;
};

export type UsageCardProps = {
  subscription: GetSubscriptionDto | undefined;
};

export function UsageCard({ subscription }: UsageCardProps) {
  const track = useTelemetry();
  const { conversationUsage } = useFetchConversationUsage();

  if (!subscription) {
    return null;
  }

  const currentEvents = subscription.events?.current ?? 0;
  const maxEvents = subscription.events?.included ?? 10000;
  const resetDate = subscription.currentPeriodEnd ?? null;

  const metrics: UsageMetric[] = [
    { label: 'Workflow Runs', current: Math.min(currentEvents, maxEvents), max: maxEvents },
  ];

  // Only show conversations when the tier has a finite included limit
  // (unlimited tiers don't need the nudge).
  if (conversationUsage && conversationUsage.included !== null) {
    // Keep the raw current value so over-limit usage (e.g. 1,200 / 1,000) is
    // visible; the progress bar is clamped separately in `getUsagePercentage`.
    metrics.push({
      label: 'Conversations',
      current: conversationUsage.current,
      max: conversationUsage.included,
    });
  }

  const handleUsageCardClick = () => {
    track(TelemetryEvent.USAGE_CARD_CLICKED, {
      currentEvents,
      maxEvents,
      usagePercentage: getUsagePercentage(currentEvents, maxEvents),
      isLimitReached: getUsageStatus(currentEvents, maxEvents).isComplete,
    });
  };

  return (
    <Link
      to={ROUTES.SETTINGS_BILLING}
      className="bg-bg-white group relative mb-2 flex min-h-[58px] cursor-pointer flex-col rounded-lg"
      onClick={handleUsageCardClick}
    >
      <CardContent metrics={metrics} resetDate={resetDate} />
    </Link>
  );
}

const formatNumber = (num: number): string =>
  num >= 1000 ? `${(num / 1000).toFixed(1).replace(/\.0$/, '')}k` : num.toLocaleString();

const getUsagePercentage = (current: number, limit: number): number => Math.min((current / limit) * 100, 100);

const getUsageStatus = (current: number, limit: number): UsageStatus => {
  const percentage = getUsagePercentage(current, limit);
  const isComplete = percentage >= 100;

  return {
    progressVariant: percentage >= 80 ? 'error' : 'default',
    isComplete,
  };
};

function UsageMetricRow({ label, current, max }: UsageMetric) {
  const percentage = getUsagePercentage(current, max);
  const { progressVariant, isComplete } = getUsageStatus(current, max);

  return (
    <div className="space-y-1">
      <div className="flex items-center">
        {isComplete ? (
          <span className="text-error-base text-label-xs flex items-center gap-1">
            <RiErrorWarningLine className="size-3.5" />
            {label} limit reached
          </span>
        ) : (
          <span className="text-label-xs">{label}</span>
        )}
        <span className="text-foreground-600 text-label-xs ml-auto text-[12px]">
          {formatNumber(current)} / <span className="text-text-soft">{formatNumber(max)}</span>
        </span>
      </div>
      <Progress value={percentage} max={100} variant={progressVariant} className="h-1 rounded-lg" />
    </div>
  );
}

type CardContentProps = {
  metrics: UsageMetric[];
  resetDate: string | null;
};

function CardContent({ metrics, resetDate }: CardContentProps) {
  const anyComplete = metrics.some((metric) => getUsageStatus(metric.current, metric.max).isComplete);
  const formattedResetDate = resetDate ? format(new Date(resetDate), 'MMM d yyyy') : '';

  return (
    <div className="relative flex flex-col overflow-hidden p-2">
      <div
        className={
          anyComplete
            ? 'space-y-2'
            : 'space-y-2 transition-all duration-200 ease-out group-hover:translate-y-[-8px] group-hover:opacity-0'
        }
      >
        {metrics.map((metric) => (
          <UsageMetricRow key={metric.label} {...metric} />
        ))}
        {formattedResetDate && (
          <span className="text-text-soft text-label-xs flex items-center gap-1 leading-[16px]">
            <RiCalendarEventLine className="size-3.5" />
            Usage resets on {formattedResetDate}
          </span>
        )}
      </div>

      <div
        className={
          anyComplete
            ? 'mt-2'
            : 'absolute bottom-2 left-2 right-2 translate-y-[10px] opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100'
        }
      >
        <Button className="h-[24px] w-full" variant="secondary" mode="lighter" size="2xs">
          Upgrade now
        </Button>
      </div>
    </div>
  );
}

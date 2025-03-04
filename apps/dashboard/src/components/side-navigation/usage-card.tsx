import { ROUTES } from '@/utils/routes';
import { GetSubscriptionDto } from '@novu/shared';
import { format } from 'date-fns';
import { RiCalendarEventLine, RiErrorWarningLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { Button } from '../primitives/button';
import { Progress } from '../primitives/progress';

const transition = 'transition-all duration-300 ease-out';

const formatNumber = (num: number): string => {
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }

  return num.toLocaleString();
};

const getUsagePercentage = (current: number, limit: number): number => {
  return Math.min((current / limit) * 100, 100);
};

const getUsageStatusInfo = (current: number, limit: number): { progressVariant: 'error' | 'warning' | 'default' } => {
  const percentage = getUsagePercentage(current, limit);

  if (percentage >= 100) {
    return {
      progressVariant: 'error',
    };
  }

  if (percentage >= 80) {
    return {
      progressVariant: 'error',
    };
  }

  return {
    progressVariant: 'default',
  };
};

type CardContentProps = {
  currentEvents: number;
  maxEvents: number;
  resetDate: string | null;
};

const CardContent = ({ currentEvents, maxEvents, resetDate }: CardContentProps) => {
  const percentage = getUsagePercentage(currentEvents, maxEvents);
  const { progressVariant } = getUsageStatusInfo(currentEvents, maxEvents);
  const isComplete = percentage >= 100;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center">
        {!isComplete ? (
          <>
            <span className={`text-label-xs ${transition}`}>Events Used</span>
            <span className={`text-foreground-600 ml-auto text-[12px] ${transition}`}>
              {formatNumber(currentEvents)}/
              <span className={`text-text-soft ${transition}`}>{formatNumber(maxEvents)}</span>
            </span>
          </>
        ) : (
          <>
            <span className={`text-error-base text-label-xs flex items-center gap-1 ${transition}`}>
              <RiErrorWarningLine className={`size-3.5 ${transition}`} />
              No events left
            </span>
            <span className={`text-foreground-600 ml-auto text-[12px] ${transition}`}>
              {formatNumber(currentEvents)}/
              <span className={`text-text-soft ${transition}`}>{formatNumber(maxEvents)}</span>
            </span>
          </>
        )}
      </div>

      {!isComplete ? (
        <>
          <div
            className={`max-h-3 overflow-hidden opacity-100 ${transition} group-hover:max-h-0 group-hover:opacity-0`}
          >
            <Progress
              value={percentage}
              max={100}
              variant={progressVariant}
              className={`h-1 rounded-lg ${transition}`}
            />
          </div>
          <span
            className={`text-text-soft text-label-xs flex items-center gap-1 ${transition} max-h-6 overflow-hidden opacity-100 group-hover:max-h-0 group-hover:opacity-0`}
          >
            <RiCalendarEventLine className={`size-3.5 ${transition}`} />
            Usage reset on {resetDate ? format(new Date(resetDate), 'MMM d yyyy') : ''}
          </span>
          <div
            className={`-mt-2 max-h-0 overflow-hidden opacity-0 ${transition} group-hover:max-h-8 group-hover:opacity-100`}
          >
            <Button
              className={`w-full translate-y-full ${transition} group-hover:translate-y-0`}
              variant="secondary"
              mode="lighter"
              size="2xs"
            >
              Upgrade now
            </Button>
          </div>
        </>
      ) : (
        <div className={`mt-1 ${transition}`}>
          <Button className={`w-full ${transition}`} variant="error" mode="lighter" size="2xs">
            Upgrade now
          </Button>
        </div>
      )}
    </div>
  );
};

export type UsageCardProps = {
  subscription?: GetSubscriptionDto;
};

export const UsageCard = ({ subscription }: UsageCardProps) => {
  const currentEvents = subscription?.events?.current ?? 0;
  const maxEvents = subscription?.events?.included ?? 10000;

  const cardClassName =
    'bg-bg-white border border-bg-weak group relative left-2 mb-2 flex w-[calc(100%-1rem)] cursor-pointer flex-col gap-2 rounded-lg p-3 shadow';

  return (
    <Link to={ROUTES.SETTINGS_BILLING} className={cardClassName}>
      <CardContent
        currentEvents={currentEvents || 15000}
        maxEvents={maxEvents}
        resetDate={subscription?.currentPeriodEnd ?? null}
      />
    </Link>
  );
};

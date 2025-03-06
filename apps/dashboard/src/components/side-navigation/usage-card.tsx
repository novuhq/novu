import { ROUTES } from '@/utils/routes';
import { GetSubscriptionDto } from '@novu/shared';
import { format } from 'date-fns';
import { RiCalendarEventLine, RiErrorWarningLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { Button } from '../primitives/button';
import { Progress } from '../primitives/progress';

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
    <div className="relative flex flex-col overflow-hidden p-2">
      <div className="flex items-center">
        {!isComplete ? (
          <>
            <span className="text-label-xs">Events Used</span>
            <span className="text-foreground-600 text-label-xs ml-auto text-[12px]">
              {formatNumber(currentEvents)}/<span className="text-text-soft">{formatNumber(maxEvents)}</span>
            </span>
          </>
        ) : (
          <>
            <span className="text-error-base text-label-xs flex items-center gap-1">
              <RiErrorWarningLine className="size-3.5" />
              No events left
            </span>
            <span className="text-foreground-600 ml-auto text-[12px]">
              {formatNumber(currentEvents)}/<span className="text-text-soft">{formatNumber(maxEvents)}</span>
            </span>
          </>
        )}
      </div>

      {!isComplete ? (
        <>
          <div className="mt-1 space-y-1 transition-all duration-200 ease-out group-hover:translate-y-[-8px] group-hover:opacity-0">
            <Progress value={percentage} max={100} variant={progressVariant} className="h-1 rounded-lg" />
            <span className="text-text-soft text-label-xs flex items-center gap-1 leading-[16px]">
              <RiCalendarEventLine className="size-3.5" />
              Usage reset on {resetDate ? format(new Date(resetDate), 'MMM d yyyy') : ''}
            </span>
          </div>
          <div className="absolute bottom-2 left-2 right-2 translate-y-[10px] opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100">
            <Button className="h-[24px] w-full" variant="secondary" mode="lighter" size="2xs">
              Upgrade now
            </Button>
          </div>
        </>
      ) : (
        <div className="mt-1">
          <Button className="h-[24px] w-full" variant="error" mode="lighter" size="2xs">
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

  return (
    <Link
      to={ROUTES.SETTINGS_BILLING}
      className={'bg-bg-white group relative mb-2 flex h-[58px] cursor-pointer flex-col rounded-lg'}
    >
      <CardContent
        currentEvents={currentEvents || 15000}
        maxEvents={maxEvents}
        resetDate={subscription?.currentPeriodEnd ?? null}
      />
    </Link>
  );
};

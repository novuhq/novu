import { Badge } from '@/components/primitives/badge';
import { Card } from '@/components/primitives/card';
import { Progress } from '@/components/primitives/progress';
import { Skeleton } from '@/components/primitives/skeleton';
import { CalendarDays } from 'lucide-react';
import { useFetchSubscription } from '../../hooks/use-fetch-subscription';
import { cn } from '../../utils/ui';
import { PlanActionButton } from './plan-action-button';

interface ActivePlanBannerProps {
  selectedBillingInterval: 'month' | 'year';
}

export function ActivePlanBanner({ selectedBillingInterval }: ActivePlanBannerProps) {
  const { subscription, daysLeft } = useFetchSubscription();

  const getProgressColor = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage > 90) return 'text-destructive';
    if (percentage > 75) return 'text-warning';

    return '';
  };

  const getProgressBarColor = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage > 90) return 'bg-gradient-to-r from-red-500 to-red-400';
    if (percentage > 75) return 'bg-gradient-to-r from-amber-500 to-amber-400';

    return 'bg-gradient-to-r from-emerald-500 to-emerald-400';
  };

  const formatDate = (date: string | number) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="mt-6 flex space-y-3">
      <Card className="mx-auto w-full max-w-[500px] overflow-hidden border shadow-none">
        <div className="space-y-5 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                {!subscription ? (
                  <Skeleton className="h-7 w-24" />
                ) : (
                  <h3 className="text-lg font-semibold capitalize">{subscription.apiServiceLevel?.toLowerCase()}</h3>
                )}
                {subscription?.trial.isActive && (
                  <Badge variant="light" color="gray" size="sm">
                    Trial
                  </Badge>
                )}
              </div>
              {subscription?.trial.isActive && (
                <div className="text-warning text-sm font-medium">{daysLeft} days left for trial</div>
              )}
            </div>

            <PlanActionButton
              selectedBillingInterval={selectedBillingInterval}
              mode="outline"
              size="sm"
              className="shrink-0"
            />
          </div>

          <div className="space-y-4">
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <CalendarDays className="h-4 w-4" />
              {!subscription ? (
                <Skeleton className="h-4 w-48" />
              ) : (
                <span>
                  {formatDate(subscription.currentPeriodStart ?? Date.now())} -{' '}
                  {formatDate(subscription.currentPeriodEnd ?? Date.now())}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                {subscription ? (
                  <>
                    <div>
                      <span
                        className={cn(
                          'font-medium',
                          getProgressColor(subscription.events.current ?? 0, subscription.events.included ?? 0)
                        )}
                      >
                        {subscription.events.current?.toLocaleString() ?? 0}
                      </span>{' '}
                      <span className="text-muted-foreground">
                        of {subscription.events.included?.toLocaleString() ?? 0} events
                      </span>
                    </div>
                    <span className="text-muted-foreground text-xs">Updates hourly</span>
                  </>
                ) : (
                  <>
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-4 w-24" />
                  </>
                )}
              </div>
              {subscription ? (
                <Progress
                  value={Math.min(
                    ((subscription.events.current ?? 0) / (subscription.events.included ?? 0)) * 100,
                    100
                  )}
                  className={cn(
                    'h-1.5 rounded-lg transition-all duration-300',
                    getProgressBarColor(subscription.events.current ?? 0, subscription.events.included ?? 0)
                  )}
                />
              ) : (
                <Skeleton className="h-1.5 w-full" />
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

import { ApiServiceLevelEnum } from '@novu/shared';
import { IS_SELF_HOSTED } from '@/config';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';

export type PausedUsagePlan = 'free' | 'paid';

/**
 * Which paused-usage experience applies while new workflow runs are paused; null when they aren't.
 * `usageLimits` is null while IS_WORKFLOW_RUN_USAGE_LIMITS_ENABLED is off for the organization, as evaluated by the API.
 */
export function usePausedUsagePlan(): PausedUsagePlan | null {
  const { subscription } = useFetchSubscription();

  if (IS_SELF_HOSTED || !subscription?.usageLimits || !subscription.events.isPaused) {
    return null;
  }

  switch (subscription.apiServiceLevel) {
    case ApiServiceLevelEnum.FREE:
      return 'free';
    case ApiServiceLevelEnum.PRO:
    case ApiServiceLevelEnum.BUSINESS:
      return 'paid';
    case ApiServiceLevelEnum.ENTERPRISE:
    case ApiServiceLevelEnum.UNLIMITED:
      return null;
    default: {
      const _exhaustive: never = subscription.apiServiceLevel;

      return null;
    }
  }
}

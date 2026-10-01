import { ApiServiceLevelEnum, type GetSubscriptionDto } from '@novu/shared';
import type { PausedUsagePlan } from '@/components/billing/usage-limits/usage-limits-view';

export type SidebarPlanCardVariant = 'trial' | 'free_usage' | 'paused_usage';

export function getSidebarPlanCardVariant(
  subscription: Pick<GetSubscriptionDto, 'apiServiceLevel' | 'trial'> | undefined,
  pausedPlan: PausedUsagePlan | null
): SidebarPlanCardVariant | null {
  if (!subscription) {
    return null;
  }

  if (subscription.trial.isActive) {
    return 'trial';
  }

  if (subscription.apiServiceLevel === ApiServiceLevelEnum.FREE) {
    return 'free_usage';
  }

  if (pausedPlan === 'paid') {
    return 'paused_usage';
  }

  return null;
}

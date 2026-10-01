import { PermissionsEnum } from '@novu/shared';
import { IS_SELF_HOSTED } from '@/config';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { useHasPermission } from '@/hooks/use-has-permission';
import { getUsageLimitsView, type UsageLimitsView } from './usage-limits-view';

export function useUsageLimitsView(): UsageLimitsView | null {
  const { subscription } = useFetchSubscription();
  const has = useHasPermission();

  if (IS_SELF_HOSTED) {
    return null;
  }

  return getUsageLimitsView(subscription, has({ permission: PermissionsEnum.BILLING_WRITE }));
}

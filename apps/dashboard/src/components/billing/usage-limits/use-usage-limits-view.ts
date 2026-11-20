import { FeatureFlagsKeysEnum, PermissionsEnum } from '@novu/shared';
import { IS_SELF_HOSTED } from '@/config';
import { useNumericFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { useHasPermission } from '@/hooks/use-has-permission';
import { getUsageLimitsView, resolveUsageAlertsAllowanceOverride, type UsageLimitsView } from './usage-limits-view';

export function useUsageLimitsView(): UsageLimitsView | null {
  const { subscription } = useFetchSubscription();
  const has = useHasPermission();
  const allowanceOverride = useNumericFeatureFlag(FeatureFlagsKeysEnum.USAGE_ALERTS_ALLOWANCE_OVERRIDE_NUMBER, 0);

  if (IS_SELF_HOSTED) {
    return null;
  }

  return getUsageLimitsView(
    subscription,
    has({ permission: PermissionsEnum.BILLING_WRITE }),
    resolveUsageAlertsAllowanceOverride(allowanceOverride)
  );
}

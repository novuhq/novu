import { ApiServiceLevelEnum, FeatureFlagsKeysEnum, FeatureNameEnum, getFeatureForTierAsBoolean } from '@novu/shared';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';

export function useIsRbacEnabled(): boolean {
  const { subscription } = useFetchSubscription();
  const isRbacFlagEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_RBAC_ENABLED, false);

  return (
    isRbacFlagEnabled &&
    getFeatureForTierAsBoolean(
      FeatureNameEnum.ACCOUNT_ROLE_BASED_ACCESS_CONTROL_BOOLEAN,
      subscription?.apiServiceLevel || ApiServiceLevelEnum.FREE
    )
  );
}

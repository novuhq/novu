import { Protect as ClerkProtect, type ProtectProps } from '@clerk/clerk-react';
import { ApiServiceLevelEnum, FeatureFlagsKeysEnum, FeatureNameEnum, getFeatureForTierAsBoolean } from '@novu/shared';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';

export const Protect = (props: ProtectProps) => {
  const { subscription } = useFetchSubscription();
  const isRbacFlagEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_RBAC_ENABLED);
  const isRbacFeatureEnabled =
    getFeatureForTierAsBoolean(
      FeatureNameEnum.ACCOUNT_ROLE_BASED_ACCESS_CONTROL_BOOLEAN,
      subscription?.apiServiceLevel ?? ApiServiceLevelEnum.FREE
    ) && isRbacFlagEnabled;

  if (!isRbacFeatureEnabled) {
    return props.children;
  }

  return <ClerkProtect {...props} />;
};

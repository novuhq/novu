import { useAuth } from '@clerk/clerk-react';
import type { CheckAuthorizationWithCustomPermissions } from '@clerk/types';
import {
  ApiServiceLevelEnum,
  FeatureFlagsKeysEnum,
  FeatureNameEnum,
  GetSubscriptionDto,
  getFeatureForTierAsBoolean,
} from '@novu/shared';
import { useMemo } from 'react';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';

function isRbacEnabled(isRbacFlagEnabled: boolean, subscription: GetSubscriptionDto | undefined): boolean {
  return (
    isRbacFlagEnabled &&
    getFeatureForTierAsBoolean(
      FeatureNameEnum.ACCOUNT_ROLE_BASED_ACCESS_CONTROL_BOOLEAN,
      subscription?.apiServiceLevel || ApiServiceLevelEnum.FREE
    )
  );
}

export function useHasPermission(): CheckAuthorizationWithCustomPermissions {
  const { has, isLoaded } = useAuth();
  const { subscription } = useFetchSubscription();
  const isRbacFlagEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_RBAC_ENABLED, false);

  const isRbacFeatureEnabled = useMemo(
    () => isRbacEnabled(isRbacFlagEnabled, subscription),
    [isRbacFlagEnabled, subscription]
  );

  return useMemo(() => {
    if (!isRbacFeatureEnabled) {
      return () => true;
    }

    if (!isLoaded) {
      return () => false;
    }

    return has as CheckAuthorizationWithCustomPermissions;
  }, [has, isLoaded, isRbacFeatureEnabled]);
}

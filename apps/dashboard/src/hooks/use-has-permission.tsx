/* eslint-disable no-restricted-syntax */
import { useMemo } from 'react';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import {
  FeatureFlagsKeysEnum,
  ApiServiceLevelEnum,
  FeatureNameEnum,
  getFeatureForTierAsBoolean,
  GetSubscriptionDto,
} from '@novu/shared';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { CheckAuthorizationWithCustomPermissions } from '@clerk/types';
import { useAuth } from '@clerk/clerk-react';

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

  // Check if RBAC is enabled for this organization
  const isRbacFeatureEnabled = useMemo(
    () => isRbacEnabled(isRbacFlagEnabled, subscription),
    [isRbacFlagEnabled, subscription]
  );

  return useMemo(() => {
    // If RBAC is not enabled, allow access
    if (!isRbacFeatureEnabled) {
      return () => true;
    }

    // If auth is still loading, restrict access
    if (!isLoaded) {
      return () => false;
    }

    // Use Clerk's permission checking system
    return has;
  }, [has, isLoaded, isRbacFeatureEnabled]);
}

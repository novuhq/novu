import type { GetToken } from '@novu/js';
import { FeatureFlagsKeysEnum, IEnvironment } from '@novu/shared';
import { useMemo } from 'react';
import { createDashboardInboxToken } from '@/api/environments';
import { useAuth } from '@/context/auth/hooks';
import { useDashboardInboxHashes } from '@/hooks/use-dashboard-inbox-hashes';
import { useFeatureFlag, useLaunchDarklyIdentified } from '@/hooks/use-feature-flag';

type InboxSubscriber = { subscriberId: string; firstName: string; lastName: string; email: string };

export type DashboardInboxIdentity =
  | { getToken: GetToken }
  | { subscriber: InboxSubscriber; subscriberHash: string | undefined };

export type DashboardInboxIdentityState =
  | { status: 'loading' }
  | { status: 'ready'; identity: DashboardInboxIdentity; remountKey: string };

export function useDashboardInboxIdentity(environment: IEnvironment | undefined): DashboardInboxIdentityState {
  const { currentUser } = useAuth();
  const isFlagSettled = useLaunchDarklyIdentified();
  const isTokenMode = useFeatureFlag(FeatureFlagsKeysEnum.IS_SUBSCRIBER_TOKENS_ENABLED, false);
  const isHashMode = isFlagSettled && !isTokenMode;
  const { subscriberHash, isSettled: isHashSettled } = useDashboardInboxHashes(environment, { enabled: isHashMode });

  const userId = currentUser?._id;
  const firstName = currentUser?.firstName ?? '';
  const lastName = currentUser?.lastName ?? '';
  const email = currentUser?.email ?? '';

  return useMemo((): DashboardInboxIdentityState => {
    if (!environment || !userId || !isFlagSettled) {
      return { status: 'loading' };
    }

    if (isTokenMode) {
      return {
        status: 'ready',
        identity: { getToken: () => createDashboardInboxToken({ environment }) },
        remountKey: `${environment._id}:token`,
      };
    }

    if (!isHashSettled) {
      return { status: 'loading' };
    }

    return {
      status: 'ready',
      identity: { subscriber: { subscriberId: userId, firstName, lastName, email }, subscriberHash },
      remountKey: `${environment._id}:hash`,
    };
  }, [environment, userId, firstName, lastName, email, isFlagSettled, isTokenMode, isHashSettled, subscriberHash]);
}

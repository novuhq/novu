import { useEffect } from 'react';
import { useLDClient } from 'launchdarkly-react-client-sdk';
import { setUser as sentrySetUser, configureScope as sentryConfigureScope } from '@sentry/react';
import { useSegment } from '../components/providers/SegmentProvider';
import { useAuth } from './useAuth';

export function useMonitoring() {
  const { currentUser, currentOrganization, shouldMonitor } = useAuth();
  const ldClient = useLDClient();
  const segment = useSegment();

  useEffect(() => {
    if (currentUser && currentOrganization && shouldMonitor) {
      segment.identify(currentUser);

      sentrySetUser({
        email: currentUser.email ?? '',
        username: `${currentUser.firstName} ${currentUser.lastName}`,
        id: currentUser._id,
        organizationId: currentOrganization._id,
        organizationName: currentOrganization.name,
      });
    } else {
      sentryConfigureScope((scope) => scope.setUser(null));
    }
  }, [currentUser, currentOrganization, segment, shouldMonitor]);

  useEffect(() => {
    if (!ldClient) {
      return;
    }

    if (currentOrganization && shouldMonitor) {
      ldClient.identify({
        kind: 'organization',
        key: currentOrganization._id,
        name: currentOrganization.name,
        createdAt: currentOrganization.createdAt,
      });
    } else {
      ldClient.identify({
        kind: 'user',
        anonymous: true,
      });
    }
  }, [ldClient, currentOrganization, shouldMonitor]);
}

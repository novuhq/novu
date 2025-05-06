import { useEffect } from 'react';
import { useLDClient } from 'launchdarkly-react-client-sdk';
import {
  setUser as sentrySetUser,
  configureScope as sentryConfigureScope,
  setTags as setSentryTags,
} from '@sentry/react';
import { useSegment } from '../components/providers/SegmentProvider';
import { useAuth } from './useAuth';

export function useMonitoring() {
  const { currentUser, currentOrganization } = useAuth();
  const ldClient = useLDClient();
  const segment = useSegment();

  const isNovuUser = currentUser && currentUser._id && !currentUser._id.startsWith('user_');
  const isNovuOrganization =
    currentOrganization && currentOrganization._id && !currentOrganization._id.startsWith('org_');

  /*
   * if the identifier present isn't a novu identifier, we don't want to pollute our data with
   * clerk identifiers, so we will skip monitoring.
   */
  const shouldMonitor = isNovuUser && isNovuOrganization;

  useEffect(() => {
    if (currentUser && currentOrganization && shouldMonitor) {
      segment.identify(currentUser);

      sentrySetUser({
        email: currentUser.email ?? '',
        username: `${currentUser.firstName} ${currentUser.lastName}`,
        id: currentUser._id,
      });

      setSentryTags({
        // user tags
        'user.createdAt': currentUser.createdAt,
        // organization tags
        'organization.id': currentOrganization._id,
        'organization.name': currentOrganization.name,
        'organization.tier': currentOrganization.apiServiceLevel,
        'organization.createdAt': currentOrganization.createdAt,
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
        tier: currentOrganization.apiServiceLevel,
      });
    } else {
      ldClient.identify({
        kind: 'user',
        anonymous: true,
      });
    }
  }, [ldClient, currentOrganization, shouldMonitor]);
}

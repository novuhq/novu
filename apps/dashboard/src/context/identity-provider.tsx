import { useEffect, useRef } from 'react';
import { useLDClient } from 'launchdarkly-react-client-sdk';
import { useAuth } from './auth/hooks';
import { useSegment } from './segment/hooks';
import { setUser as sentrySetUser, setTags as setSentryTags } from '@sentry/react';

export function IdentityProvider({ children }: { children: React.ReactNode }) {
  const ldClient = useLDClient();
  const segment = useSegment();
  const { currentUser, currentOrganization } = useAuth();
  const hasIdentified = useRef(false);

  const hasExternalId = currentUser?._id;
  const hasOrganization = currentOrganization && currentOrganization._id;
  const shouldMonitor = hasExternalId && hasOrganization;

  useEffect(() => {
    if (!currentOrganization || !currentUser || hasIdentified.current) return;

    if (shouldMonitor) {
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

      if (ldClient) {
        ldClient.identify({
          kind: 'multi',
          organization: {
            key: currentOrganization._id,
            name: currentOrganization.name,
            createdAt: currentOrganization.createdAt,
            tier: currentOrganization.apiServiceLevel,
          },
          user: {
            key: currentUser._id,
            firstName: currentUser.firstName,
            lastName: currentUser.lastName,
            email: currentUser.email,
          },
        });
      }
    } else {
      sentrySetUser(null);
    }

    hasIdentified.current = true;
  }, [ldClient, currentOrganization, currentUser, segment, shouldMonitor]);

  return <>{children}</>;
}

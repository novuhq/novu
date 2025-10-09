import { setUser as sentrySetUser, setTags as setSentryTags } from '@sentry/react';
import { useLDClient } from 'launchdarkly-react-client-sdk';
import { useEffect, useRef } from 'react';
import { useAuth } from './auth/hooks';
import { useSegment } from './segment/hooks';

export function IdentityProvider({ children }: { children: React.ReactNode }) {
  const ldClient = useLDClient();
  const segment = useSegment();
  const { currentUser, currentOrganization } = useAuth();
  const hasIdentifiedUser = useRef(false);
  const hasIdentifiedOrg = useRef(false);

  useEffect(() => {
    if (!currentUser || !ldClient || hasIdentifiedUser.current) return;

    ldClient.identify({
      kind: 'user',
      key: currentUser._id,
      firstName: currentUser.firstName,
      lastName: currentUser.lastName,
      email: currentUser.email,
    });

    hasIdentifiedUser.current = true;
  }, [ldClient, currentUser]);

  useEffect(() => {
    if (!currentOrganization || !currentUser || hasIdentifiedOrg.current) return;

    const hasExternalId = currentUser._id;
    const hasOrganization = currentOrganization._id;
    const shouldMonitor = hasExternalId && hasOrganization;

    if (shouldMonitor) {
      segment.identify(currentUser);

      sentrySetUser({
        email: currentUser.email ?? '',
        username: `${currentUser.firstName} ${currentUser.lastName}`,
        id: currentUser._id,
      });

      setSentryTags({
        'user.createdAt': currentUser.createdAt,
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

    hasIdentifiedOrg.current = true;
  }, [ldClient, currentOrganization, currentUser, segment]);

  return <>{children}</>;
}

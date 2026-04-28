import { setUser as sentrySetUser, setTags as setSentryTags } from '@sentry/react';
import { useLDClient } from 'launchdarkly-react-client-sdk';
import { useEffect, useRef } from 'react';
import { getRegionConfig, useRegion } from '@/context/region';
import { useAuth } from './auth/hooks';
import { useCustomerIo } from './customer-io/hooks';
import { useSegment } from './segment/hooks';

export function IdentityProvider({ children }: { children: React.ReactNode }) {
  const ldClient = useLDClient();
  const segment = useSegment();
  const customerIo = useCustomerIo();
  const { currentUser, currentOrganization } = useAuth();
  const { selectedRegion } = useRegion();
  const hasIdentifiedOrg = useRef(false);

  useEffect(() => {
    if (!currentOrganization || !currentUser) return;

    const hasExternalId = currentUser._id;
    const hasOrganization = currentOrganization._id;
    const shouldMonitor = hasExternalId && hasOrganization;

    if (shouldMonitor) {
      if (!hasIdentifiedOrg.current) {
        segment.identify(currentUser);
        customerIo.identify(currentUser);

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

        hasIdentifiedOrg.current = true;
      }

      if (ldClient) {
        const regionConfig = getRegionConfig(selectedRegion);
        const awsRegion = regionConfig?.awsRegion || '';

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
          region: {
            key: awsRegion || 'unknown',
            awsRegion: awsRegion,
          },
        });
      }
    } else {
      sentrySetUser(null);
    }
  }, [ldClient, currentOrganization, currentUser, segment, customerIo, selectedRegion]);

  return <>{children}</>;
}

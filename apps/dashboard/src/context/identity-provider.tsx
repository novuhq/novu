import { setUser as sentrySetUser, setTags as setSentryTags } from '@sentry/react';
import { useLDClient } from 'launchdarkly-react-client-sdk';
import { useEffect, useRef } from 'react';
import { identifyTelemetry } from '@/api/telemetry';
import { getRegionConfig, useRegion } from '@/context/region';
import { beginLaunchDarklyIdentify } from '@/hooks/use-feature-flag';
import { readPersistedCliOnboardingSessionId } from '@/utils/cli-onboarding-identity';
import { useAuth } from './auth/hooks';
import { useCustomerIo } from './customer-io/hooks';
import { useSegment } from './segment/hooks';
import { useSnitcher } from './snitcher/hooks';

export function IdentityProvider({ children }: { children: React.ReactNode }) {
  const ldClient = useLDClient();
  const segment = useSegment();
  const customerIo = useCustomerIo();
  const snitcher = useSnitcher();
  const { currentUser, currentOrganization } = useAuth();
  const { selectedRegion } = useRegion();
  const hasIdentifiedOrg = useRef(false);
  const hasAliasedCliOnboarding = useRef(false);

  useEffect(() => {
    const cliOnboardingSessionId = readPersistedCliOnboardingSessionId();

    if (!cliOnboardingSessionId) return;

    segment.setAnonymousId(cliOnboardingSessionId);
  }, [segment]);

  useEffect(() => {
    if (!currentUser?._id || hasAliasedCliOnboarding.current) return;

    const cliOnboardingSessionId = readPersistedCliOnboardingSessionId();

    if (!cliOnboardingSessionId) return;

    hasAliasedCliOnboarding.current = true;
    segment.setAnonymousId(cliOnboardingSessionId);
    segment.alias(cliOnboardingSessionId, currentUser._id);
    void identifyTelemetry(cliOnboardingSessionId).catch(() => undefined);
  }, [currentUser?._id, segment]);

  useEffect(() => {
    if (!currentOrganization || !currentUser) return;

    const hasExternalId = currentUser._id;
    const hasOrganization = currentOrganization._id;
    const shouldMonitor = hasExternalId && hasOrganization;

    if (shouldMonitor) {
      if (!hasIdentifiedOrg.current) {
        segment.identify(currentUser);
        customerIo.identify(currentUser);
        snitcher.identify(currentUser, currentOrganization);

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

        const markIdentified = beginLaunchDarklyIdentify(currentOrganization._id);

        // Settled on failure too, so a failed identify never blocks the Copilot mode from resolving.
        ldClient
          .identify({
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
          })
          .then(markIdentified, markIdentified);
      }
    } else {
      sentrySetUser(null);
    }
  }, [ldClient, currentOrganization, currentUser, segment, customerIo, snitcher, selectedRegion]);

  return <>{children}</>;
}

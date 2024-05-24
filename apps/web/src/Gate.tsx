import { type ReactNode, useEffect, useLayoutEffect } from 'react';
import { useLDClient } from 'launchdarkly-react-client-sdk';
import { useAuth } from '@novu/shared-web';

export function Gate({ children }: { children: ReactNode }) {
  const ldClient = useLDClient();
  const { isLoading, inPublicRoute, currentOrganization } = useAuth();

  useEffect(() => {
    if (!ldClient) {
      return;
    }

    console.log('Updating LaunchDarkly user context');

    if (currentOrganization) {
      ldClient.identify({
        kind: 'organization',
        key: currentOrganization._id,
        name: currentOrganization.name,
      });
    } else {
      ldClient.identify({
        kind: 'user',
        anonymous: true,
      });
    }
  }, [ldClient, currentOrganization]);

  useLayoutEffect(() => {
    if (inPublicRoute || !isLoading) {
      document.getElementById('loader')?.remove();
    }
  }, [inPublicRoute, isLoading]);

  if (inPublicRoute || !isLoading) {
    return <>{children}</>;
  }

  return null;
}

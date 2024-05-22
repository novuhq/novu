import * as Sentry from '@sentry/react';

import { asyncWithLDProvider, useLDClient, withLDProvider } from 'launchdarkly-react-client-sdk';
import { useEffect, useRef } from 'react';
import { useAuth, LAUNCH_DARKLY_CLIENT_SIDE_ID } from '@novu/shared-web';

/*
 * 👮 DX police. This TS dance is required so that TS is happy with the returned type of
 * asyncWithLDProvider.
 */
type GenericLDProvider = Awaited<ReturnType<typeof asyncWithLDProvider>>;
const DEFAULT_GENERIC_PROVIDER: GenericLDProvider = ({ children }) => <>{children}</>;

export function LaunchDarklyProvider({ children }) {
  const ldClient = useLDClient();
  const LDProvider = useRef<GenericLDProvider>(DEFAULT_GENERIC_PROVIDER);
  const auth = useAuth();
  if (!auth) {
    throw new Error('LaunchDarklyProvider must be used within <AuthProvider>!');
  }

  const { currentOrganization } = auth;

  useEffect(() => {
    if (ldClient && currentOrganization) {
      ldClient.identify({
        kind: 'organization',
        key: currentOrganization._id,
        name: currentOrganization.name,
      });
    }
  }, [ldClient, currentOrganization]);

  useEffect(() => {
    (async () => {
      try {
        LDProvider.current = await asyncWithLDProvider({
          clientSideID: LAUNCH_DARKLY_CLIENT_SIDE_ID,
          ldClient,
          reactOptions: {
            useCamelCaseFlagKeys: false,
          },
          // determine which context to use based on if an organization is available
          context: currentOrganization
            ? {
                kind: 'organization',
                key: currentOrganization._id,
                name: currentOrganization.name,
              }
            : {
                /**
                 * When user is not authenticated, assigns an id to them to ensure consistent results.
                 * https://docs.launchdarkly.com/sdk/features/anonymous#javascript
                 */
                kind: 'user',
                anonymous: true,
              },
        });
      } catch (err: unknown) {
        Sentry.captureException(err);
      }
    })();
  }, [ldClient, currentOrganization]);

  return <LDProvider.current>{children}</LDProvider.current>;
}

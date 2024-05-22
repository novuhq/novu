import * as Sentry from '@sentry/react';

import { IOrganizationEntity } from '@novu/shared';
import { asyncWithLDProvider } from 'launchdarkly-react-client-sdk';
import { PropsWithChildren, useEffect, useMemo, useRef, useState } from 'react';
import { useFeatureFlags, useAuthContext, LAUNCH_DARKLY_CLIENT_SIDE_ID } from '@novu/shared-web';
import { selectShouldInitializeLaunchDarkly } from './utils/selectShouldInitializeLaunchDarkly';

/** A provider with children required */
type GenericLDProvider = Awaited<ReturnType<typeof asyncWithLDProvider>>;

/** Simply renders the children */
const DEFAULT_GENERIC_PROVIDER: GenericLDProvider = ({ children }) => <>{children}</>;

/**
 * Async provider for feature flags.
 *
 * @requires AuthProvider must be wrapped in the AuthProvider.
 */
export const LaunchDarklyProvider: React.FC<PropsWithChildren<{}>> = ({ children }) => {
  const LDProvider = useRef<GenericLDProvider>(DEFAULT_GENERIC_PROVIDER);

  const authContext = useAuthContext();
  if (!authContext) {
    throw new Error('LaunchDarklyProvider must be used within <AuthProvider>!');
  }
  const { currentOrganization } = authContext;

  const shouldInitializeLd = useMemo(() => selectShouldInitializeLaunchDarkly(authContext), [authContext]);

  useEffect(() => {
    if (!shouldInitializeLd) {
      return;
    }

    const fetchLDProvider = async () => {
      try {
        LDProvider.current = await asyncWithLDProvider({
          clientSideID: LAUNCH_DARKLY_CLIENT_SIDE_ID,
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
    };

    fetchLDProvider();
  }, [shouldInitializeLd, currentOrganization]);

  return (
    <LDProvider.current>
      <LaunchDarklyClientWrapper org={currentOrganization}>{children}</LaunchDarklyClientWrapper>
    </LDProvider.current>
  );
};

/**
 * Refreshes feature flags on org change using the LaunchDarkly client from the provider.
 */
function LaunchDarklyClientWrapper({ children, org }: PropsWithChildren<{ org?: IOrganizationEntity }>) {
  useFeatureFlags(org);

  return <>{children}</>;
}

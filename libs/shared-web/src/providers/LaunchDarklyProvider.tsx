import { IOrganizationEntity } from '@novu/shared';
import { asyncWithLDProvider } from 'launchdarkly-react-client-sdk';
import { PropsWithChildren, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { LAUNCH_DARKLY_CLIENT_SIDE_ID } from '../config';
import { useFeatureFlags } from '../hooks';
import { useAuthContext } from './AuthProvider';
import { selectShouldShowLaunchDarklyFallback, selectShouldInitializeLaunchDarkly } from '../utils/auth-selectors';

/** A provider with children required */
type GenericLDProvider = Awaited<ReturnType<typeof asyncWithLDProvider>>;

/** Simply renders the children */
const DEFAULT_GENERIC_PROVIDER: GenericLDProvider = ({ children }) => <>{children}</>;

export interface ILaunchDarklyProviderProps {
  /** Renders when LaunchDarkly is enabled and is awaiting initialization */
  fallbackDisplay: ReactNode;
}

/**
 * Async provider for feature flags.
 *
 * @requires AuthProvider must be wrapped in the AuthProvider.
 */
export const LaunchDarklyProvider: React.FC<PropsWithChildren<ILaunchDarklyProviderProps>> = ({
  children,
  fallbackDisplay,
}) => {
  const LDProvider = useRef<GenericLDProvider>(DEFAULT_GENERIC_PROVIDER);
  const [isLDReady, setIsLDReady] = useState<boolean>(false);

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
        // FIXME: what should we do here since we don't have logging?
      } finally {
        setIsLDReady(true);
      }
    };

    fetchLDProvider();
  }, [setIsLDReady, shouldInitializeLd, currentOrganization]);

  /**
   * For self-hosted, LD will not be enabled, so do not block initialization.
   * Must not show the fallback if the user isn't logged-in to avoid issues with un-authenticated routes (i.e. login).
   */
  if (selectShouldShowLaunchDarklyFallback(authContext, isLDReady)) {
    return <>{fallbackDisplay}</>;
  }

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

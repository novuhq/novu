import { IOrganizationEntity } from '@novu/shared';
import { asyncWithLDProvider } from 'launchdarkly-react-client-sdk';
import { PropsWithChildren, ReactNode, useEffect, useRef, useState } from 'react';
import { LAUNCH_DARKLY_CLIENT_SIDE_ID } from '../config';
import { useFeatureFlags } from '../hooks';
import { checkIsUnprotectedPathname, checkShouldUseLaunchDarkly } from '../utils';
import { useAuthContext } from './AuthProvider';

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

  useEffect(() => {
    const fetchLDProvider = async () => {
      if (!currentOrganization) {
        return;
      }

      LDProvider.current = await asyncWithLDProvider({
        clientSideID: LAUNCH_DARKLY_CLIENT_SIDE_ID,
        context: {
          kind: 'organization',
          key: currentOrganization._id,
          name: currentOrganization.name,
        },
        reactOptions: {
          useCamelCaseFlagKeys: false,
        },
      });
      setIsLDReady(true);
    };
    fetchLDProvider();
  }, [setIsLDReady, currentOrganization]);

  /**
   * For self-hosted, LD will not be enabled, so do not block initialization.
   * Checking unprotected (routes without org-based auth) is required to ensure that such routes still load.
   */
  if (checkShouldUseLaunchDarkly() && !checkIsUnprotectedPathname(window.location.pathname) && !isLDReady) {
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

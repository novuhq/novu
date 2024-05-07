import { Loader } from '@mantine/core';
import { LoadingOverlay } from '@novu/design-system';
import { IOrganizationEntity } from '@novu/shared';
import { LAUNCH_DARKLY_CLIENT_SIDE_ID, useAuthContext, useFeatureFlags } from '@novu/shared-web';
import { asyncWithLDProvider, useLDClient } from 'launchdarkly-react-client-sdk';
import { PropsWithChildren, useEffect, useRef, useState } from 'react';

type GenericProvider = ({ children }: { children: React.ReactNode }) => JSX.Element;
const DEFAULT_GENERIC_PROVIDER: GenericProvider = (props) => <>{props.children}</>;

export interface ILaunchDarklyProviderProps {
  organization?: IOrganizationEntity;
}

/**
 * @requires AuthProvider must be wrapped in the AuthProvider.
 */
export const LaunchDarklyProvider: React.FC<PropsWithChildren<ILaunchDarklyProviderProps>> = ({ children }) => {
  const LDProvider = useRef<GenericProvider>(DEFAULT_GENERIC_PROVIDER);
  const [isLDReady, setIsLDReady] = useState<boolean>(false);

  const authContext = useAuthContext();
  if (!authContext) {
    throw new Error('LaunchDarklyProvider must be used within AuthProvider!');
  }
  const { currentOrganization } = authContext;
  // const ldClient = useFeatureFlags();
  // eslint-disable-next-line multiline-comment-style
  // useEffect(() => {
  //   console.log({ org: authContext.currentOrganization, ldClient });
  //   if (!authContext.currentOrganization || !ldClient) {
  //     return;
  //   }
  //   console.log('Reidentify', authContext.currentOrganization);
  //   ldClient.identify({
  //     kind: 'organization',
  //     key: authContext.currentOrganization._id,
  //     name: authContext.currentOrganization.name,
  //   });
  // }, [authContext.currentOrganization, ldClient]);

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
        // deferInitialization: true,
      });
      setIsLDReady(true);
    };
    fetchLDProvider();
  }, [setIsLDReady, currentOrganization]);

  /**
   * Current issues:
   * - This breaks login since there's no org -- can we match against "isUnprotectedUrl"?
   * -
   */

  // eslint-disable-next-line multiline-comment-style
  // if (!isLDReady) {
  //   return (
  //     <LoadingOverlay visible>
  //       <></>
  //     </LoadingOverlay>
  //   );
  // }

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

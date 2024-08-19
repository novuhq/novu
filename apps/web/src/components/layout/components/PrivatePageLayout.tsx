import { useEffect, useMemo, useState } from 'react';
import { ErrorBoundary } from '@sentry/react';
import { Outlet, useLocation } from 'react-router-dom';
import styled from '@emotion/styled';
import { IntercomProvider } from 'react-use-intercom';
import { BRIDGE_SYNC_SAMPLE_ENDPOINT, BRIDGE_ENDPOINTS_LEGACY_VERSIONS, INTERCOM_APP_ID } from '../../../config';
import { SpotLight } from '../../utils/Spotlight';
import { SpotLightProvider } from '../../providers/SpotlightProvider';
import { useEnvironment, useRedirectURL, useRouteScopes } from '../../../hooks';
// TODO: Move sidebar under layout folder as it belongs here
import { Sidebar } from '../../nav/Sidebar';
import { HeaderNav } from './v2/HeaderNav';
import { FreeTrialBanner } from './FreeTrialBanner';
import { css } from '@novu/novui/css';
import { EnvironmentEnum } from '../../../studio/constants/EnvironmentEnum';
import { SampleModeBanner } from './v2/SampleWorkflowsBanner';
import { Modal } from '@mantine/core';

const AppShell = styled.div`
  display: flex;
  width: 100vw;
  height: 100vh;
  min-width: 1024px;
`;

const ContentShell = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 0%;
  overflow: hidden; // for appropriate scroll
`;

export function PrivatePageLayout({ inModal }: { inModal?: boolean }) {
  const [isIntercomOpened, setIsIntercomOpened] = useState(false);
  const { environment } = useEnvironment();
  const location = useLocation();
  const { getRedirectURL } = useRedirectURL();
  const { inStudioRoute } = useRouteScopes();

  /**
   * TODO: this is a temporary work-around to let us work the different color palettes while testing locally.
   * Eventually, we will want to only include 'LOCAL' in the conditional.
   */
  const isLocalEnv = useMemo(
    () => [EnvironmentEnum.DEVELOPMENT].includes(environment?.name as EnvironmentEnum) && inStudioRoute,
    [environment, inStudioRoute]
  );

  const isEqualToSampleEndpoint =
    environment?.bridge?.url &&
    (environment?.bridge?.url === BRIDGE_SYNC_SAMPLE_ENDPOINT ||
      BRIDGE_ENDPOINTS_LEGACY_VERSIONS.includes(environment?.bridge?.url));
  const showSampleModeBanner = isEqualToSampleEndpoint && location.pathname.includes('/workflows');

  useEffect(() => {
    const redirectURL = getRedirectURL();
    if (redirectURL) {
      // Note: Do not use react-router-dom. The version we have doesn't do instant cross origin redirects.
      window.location.replace(redirectURL);

      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SpotLightProvider>
      <IntercomProvider
        appId={INTERCOM_APP_ID}
        onShow={() => setIsIntercomOpened(true)}
        onHide={() => setIsIntercomOpened(false)}
      >
        <ErrorBoundary
          fallback={({ error, eventId }) => (
            <>
              Sorry, but something went wrong. <br />
              Our team has been notified and we are investigating.
              <br />
              <code>
                <small style={{ color: 'lightGrey' }}>
                  Event Id: {eventId}.
                  <br />
                  {error.toString()}
                </small>
              </code>
            </>
          )}
        >
          <SpotLight>
            <AppShell className={css({ '& *': { colorPalette: isLocalEnv ? 'mode.local' : 'mode.cloud' } })}>
              <Sidebar />
              <ContentShell>
                {showSampleModeBanner && <SampleModeBanner />}
                <FreeTrialBanner />
                <HeaderNav />
                {inModal ? (
                  <Modal opened onClose={() => {}} size="90%">
                    <Outlet />
                  </Modal>
                ) : (
                  <Outlet />
                )}
              </ContentShell>
            </AppShell>
          </SpotLight>
        </ErrorBoundary>
      </IntercomProvider>
    </SpotLightProvider>
  );
}

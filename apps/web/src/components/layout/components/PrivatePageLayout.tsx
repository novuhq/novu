import { useMemo, useState } from 'react';
import { ErrorBoundary } from '@sentry/react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';

import { IntercomProvider } from 'react-use-intercom';
import { BRIDGE_SYNC_SAMPLE_ENDPOINT, INTERCOM_APP_ID, IS_EE_AUTH_ENABLED } from '../../../config';
import { EnsureOnboardingComplete } from './EnsureOnboardingComplete';
import { SpotLight } from '../../utils/Spotlight';
import { SpotLightProvider } from '../../providers/SpotlightProvider';
import { useEnvironment } from '../../../hooks';
// TODO: Move sidebar under layout folder as it belongs here
import { Sidebar } from '../../nav/Sidebar';
import { HeaderNav } from './v2/HeaderNav';
import { FreeTrialBanner } from './FreeTrialBanner';
import { css } from '@novu/novui/css';
import { EnvironmentEnum } from '../../../studio/constants/EnvironmentEnum';
import { isStudioRoute } from '../../../studio/utils/routing';
import { Group } from '@mantine/core';
import { Button, Text } from '@novu/novui';
import { colors, Warning, useColorScheme } from '@novu/design-system';
import { SampleModeBanner } from './v2/SampleWorkflowsBanner';

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

export function PrivatePageLayout() {
  const [isIntercomOpened, setIsIntercomOpened] = useState(false);
  const { environment } = useEnvironment();
  const location = useLocation();

  /**
   * TODO: this is a temporary work-around to let us work the different color palettes while testing locally.
   * Eventually, we will want to only include 'LOCAL' in the conditional.
   */
  const isLocalEnv = useMemo(
    () =>
      [EnvironmentEnum.DEVELOPMENT].includes(environment?.name as EnvironmentEnum) && isStudioRoute(location.pathname),
    [environment, location]
  );

  return (
    <EnsureOnboardingComplete>
      <SpotLightProvider>
        <IntercomProvider
          appId={INTERCOM_APP_ID}
          onShow={() => setIsIntercomOpened(true)}
          onHide={() => setIsIntercomOpened(false)}
        >
          <ErrorBoundary
            fallback={({ error, resetError, eventId }) => (
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
                  {location.pathname !== '/get-started' && environment?.bridge?.url === BRIDGE_SYNC_SAMPLE_ENDPOINT && (
                    <SampleModeBanner />
                  )}
                  <FreeTrialBanner />
                  <HeaderNav />
                  <Outlet />
                </ContentShell>
              </AppShell>
            </SpotLight>
          </ErrorBoundary>
        </IntercomProvider>
      </SpotLightProvider>
    </EnsureOnboardingComplete>
  );
}

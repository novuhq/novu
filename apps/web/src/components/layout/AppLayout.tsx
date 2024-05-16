import { useState } from 'react';
import * as Sentry from '@sentry/react';
import { Outlet } from 'react-router-dom';
import styled from '@emotion/styled';

import { ThemeProvider } from '@novu/design-system';
import { HeaderNav } from './components/HeaderNav';
import { SideNav } from './components/SideNav';
import { IntercomProvider } from 'react-use-intercom';
import { INTERCOM_APP_ID } from '../../config';
import { RequiredAuth } from './RequiredAuth';
import { SpotLight } from '../utils/Spotlight';
import { SpotLightProvider } from '../providers/SpotlightProvider';
import { useFeatureFlag } from '@novu/shared-web';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { HeaderNav as HeaderNavNew } from './components/v2/HeaderNav';
import { MainNav } from '../nav/MainNav';
import { FreeTrialBanner } from './components/FreeTrialBanner';

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

export function AppLayout() {
  const [isIntercomOpened, setIsIntercomOpened] = useState(false);

  const isInformationArchitectureEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_INFORMATION_ARCHITECTURE_ENABLED);

  return (
    <RequiredAuth>
      <SpotLightProvider>
        <ThemeProvider>
          <IntercomProvider
            appId={INTERCOM_APP_ID}
            onShow={() => setIsIntercomOpened(true)}
            onHide={() => setIsIntercomOpened(false)}
          >
            <Sentry.ErrorBoundary
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
                <AppShell>
                  {isInformationArchitectureEnabled ? <MainNav /> : <SideNav />}
                  <ContentShell>
                    <FreeTrialBanner />
                    {isInformationArchitectureEnabled ? (
                      <HeaderNavNew />
                    ) : (
                      <HeaderNav isIntercomOpened={isIntercomOpened} />
                    )}
                    <Outlet />
                  </ContentShell>
                </AppShell>
              </SpotLight>
            </Sentry.ErrorBoundary>
          </IntercomProvider>
        </ThemeProvider>
      </SpotLightProvider>
    </RequiredAuth>
  );
}

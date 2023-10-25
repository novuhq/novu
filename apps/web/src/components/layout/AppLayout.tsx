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

const AppShellNew = styled.div`
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
                  Our team been notified about it and we will look at it asap.
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
                <AppShellNew>
                  <SideNav />
                  <ContentShell>
                    <HeaderNav isIntercomOpened={isIntercomOpened} />
                    <Outlet />
                  </ContentShell>
                </AppShellNew>
              </SpotLight>
            </Sentry.ErrorBoundary>
          </IntercomProvider>
        </ThemeProvider>
      </SpotLightProvider>
    </RequiredAuth>
  );
}

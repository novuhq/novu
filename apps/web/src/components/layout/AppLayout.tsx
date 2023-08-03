import { useState } from 'react';
import { AppShell } from '@mantine/core';
import * as Sentry from '@sentry/react';
import { Outlet } from 'react-router-dom';

import { ThemeProvider } from '../../design-system/ThemeProvider';
import { HeaderNav } from './components/HeaderNav';
import { SideNav } from './components/SideNav';
import { colors } from '../../design-system';
import { IntercomProvider } from 'react-use-intercom';
import { INTERCOM_APP_ID } from '../../config';
import { HEADER_HEIGHT } from './constants';
import { RequiredAuth } from './RequiredAuth';
import { SpotLight } from '../utils/Spotlight';
import { SpotLightProvider } from '../providers/SpotlightProvider';

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
            <AppShell
              padding="lg"
              navbar={<SideNav />}
              styles={(theme) => ({
                root: { minHeight: '100vh', position: 'relative', zIndex: 1 },
                body: {
                  minHeight: `calc(100vh - ${HEADER_HEIGHT}px)`,
                  '@media (max-width: 768px)': {
                    flexDirection: 'column',
                    height: 'auto',
                  },
                },
                main: {
                  backgroundColor: theme.colorScheme === 'dark' ? colors.BGDark : colors.BGLight,
                  minHeight: 'auto',
                  padding: 0,
                  overflowX: 'hidden',
                  borderRadius: 0,
                },
              })}
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
                  <HeaderNav isIntercomOpened={isIntercomOpened} />
                  <Outlet />
                </SpotLight>
              </Sentry.ErrorBoundary>
            </AppShell>
          </IntercomProvider>
        </ThemeProvider>
      </SpotLightProvider>
    </RequiredAuth>
  );
}

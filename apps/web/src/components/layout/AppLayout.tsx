import { AppShell, useMantineTheme } from '@mantine/core';
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
  return (
    <RequiredAuth>
      <SpotLightProvider>
        <ThemeProvider>
          <SupportChatProvider>
            <AppShell
              padding="lg"
              navbar={<SideNav />}
              header={<HeaderNav />}
              styles={(theme) => ({
                root: { minHeight: '100vh', position: 'relative', zIndex: 1 },
                body: {
                  minHeight: `calc(100vh - ${HEADER_HEIGHT})`,
                  '@media (max-width: 768px)': {
                    flexDirection: 'column',
                    height: 'auto',
                  },
                },
                main: {
                  backgroundColor: theme.colorScheme === 'dark' ? colors.BGDark : colors.BGLight,
                  minHeight: 'auto',
                  padding: '30px',
                  overflowX: 'hidden',
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
                  <Outlet />
                </SpotLight>
              </Sentry.ErrorBoundary>
            </AppShell>
          </SupportChatProvider>
        </ThemeProvider>
      </SpotLightProvider>
    </RequiredAuth>
  );
}

function SupportChatProvider({ children }) {
  if (INTERCOM_APP_ID) {
    return <IntercomProvider appId={INTERCOM_APP_ID}>{children}</IntercomProvider>;
  }

  return children;
}

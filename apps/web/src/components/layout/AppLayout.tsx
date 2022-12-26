import { AppShell } from '@mantine/core';
import * as Sentry from '@sentry/react';
import { Outlet } from 'react-router-dom';
import { ThemeProvider } from '../../design-system/ThemeProvider';
import { HeaderNav } from './components/HeaderNav';
import { SideNav } from './components/SideNav';
import { colors } from '../../design-system';
import { IntercomProvider } from 'react-use-intercom';
import { INTERCOM_APP_ID } from '../../config';

export function AppLayout() {
  return (
    <ThemeProvider>
      <SupportChatProvider>
        <AppShell
          padding="lg"
          navbar={<SideNav />}
          header={<HeaderNav />}
          styles={(theme) => ({
            root: { minHeight: '100vh', position: 'relative', zIndex: 1 },
            body: {
              height: 'calc(100vh - 65px)',
              '@media (max-width: 768px)': {
                flexDirection: 'column',
                height: 'auto',
              },
            },
            main: {
              backgroundColor: theme.colorScheme === 'dark' ? colors.BGDark : colors.BGLight,
              overflow: 'auto',
              minHeight: 'auto',
              padding: '30px',
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
            <Outlet />
          </Sentry.ErrorBoundary>
        </AppShell>
      </SupportChatProvider>
    </ThemeProvider>
  );
}

function SupportChatProvider({ children }) {
  if (INTERCOM_APP_ID) {
    return <IntercomProvider appId={INTERCOM_APP_ID}>{children}</IntercomProvider>;
  }

  return children;
}

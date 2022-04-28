import { AppShell } from '@mantine/core';
import * as Sentry from '@sentry/react';
import { Outlet } from 'react-router-dom';
import { useNovu } from '../../hooks/use-novu';
import { ThemeProvider } from '../../design-system/ThemeProvider';
import { HeaderNav } from './components/HeaderNav';
import { SideNav } from './components/SideNav';
import { colors } from '../../design-system';

export function AppLayout() {
  useNovu();

  return (
    <ThemeProvider>
      <AppShell
        padding="lg"
        navbar={<SideNav />}
        header={<HeaderNav />}
        styles={(theme) => ({
          main: { backgroundColor: theme.colorScheme === 'dark' ? colors.BGDark : colors.BGLight },
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
    </ThemeProvider>
  );
}

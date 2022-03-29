import React from 'react';
import { AppShell } from '@mantine/core';
import * as Sentry from '@sentry/react';
import { useLocation, Outlet, useParams } from 'react-router-dom';
import { useNotifire } from '../../hooks/use-notifire';
import { ThemeProvider } from '../../design-system/ThemeProvider';
import { HeaderNav } from './components/HeaderNav';
import { SideNav } from './components/SideNav';
import { colors } from '../../design-system';

export function AppLayout() {
  const location = useLocation();
  const { templateId = '' } = useParams<{ templateId: string }>();

  useNotifire();

  return (
    <ThemeProvider>
      <AppShell
        padding="lg"
        navbar={<SideNav />}
        header={<HeaderNav />}
        styles={(theme) => ({
          main: { backgroundColor: theme.colorScheme === 'dark' ? colors.BGDark : colors.BGLight },
        })}>
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
          )}>
          <Outlet />
        </Sentry.ErrorBoundary>
      </AppShell>
    </ThemeProvider>
  );
}

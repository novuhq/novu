import { AppShell, Header, Navbar, Title } from '@mantine/core';
import * as Sentry from '@sentry/react';
import React from 'react';
import { useLocation } from 'react-router-dom';
import { useNotifire } from '../../hooks/use-notifire';
import { LegacyAppLayout } from '../../legacy/components/layout/app-layout/LegacyAppLayout';
import { ThemeProvider } from '../../design-system/ThemeProvider';

export function AppLayout({ children }: { children: any }) {
  const location = useLocation();
  useNotifire();

  /**
   * TODO: Remove once migrated to the new styling.
   * Add each new page when migrating
   */
  if (!['/'].includes(location.pathname)) {
    return <LegacyAppLayout>{children}</LegacyAppLayout>;
  }

  return (
    <ThemeProvider>
      <AppShell
        padding="md"
        navbar={
          <Navbar width={{ base: 300 }} padding="xs">
            <Navbar.Section grow>Menu Contents</Navbar.Section>
          </Navbar>
        }
        header={
          <Header height={60} padding="xs">
            <Title order={1}>header</Title>
            {/* Header content */}
          </Header>
        }
        styles={(theme) => ({
          main: { backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[0] },
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
          {children}
        </Sentry.ErrorBoundary>
      </AppShell>
    </ThemeProvider>
  );
}

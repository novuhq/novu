import { AppShell, Navbar, ColorSchemeProvider, ColorScheme } from '@mantine/core';
import * as Sentry from '@sentry/react';
import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useNotifire } from '../../hooks/use-notifire';
import { LegacyAppLayout } from '../../legacy/components/layout/app-layout/LegacyAppLayout';
import { ThemeProvider } from '../../design-system/ThemeProvider';
import { NavMenu } from '../../design-system/navigation/NavMenu';
import { Activity, Bolt, Settings, Team } from '../../design-system/icons';
import { HeaderNav } from './components/HeaderNav';
import { colors } from '../../design-system';

export function AppLayout({ children }: { children: any }) {
  const location = useLocation();

  const [colorScheme, setColorScheme] = useState<ColorScheme>('dark');
  const toggleColorScheme = (value?: ColorScheme) =>
    setColorScheme(value || (colorScheme === 'dark' ? 'light' : 'dark'));

  useNotifire();

  const menuItems = [
    { icon: <Bolt />, link: '/templates', label: 'Notifications', test: 'side-nav-templates-link' },
    { icon: <Activity />, link: '/activities', label: 'Activity Feed', test: 'side-nav-activities-link' },
    { icon: <Settings />, link: '/settings/widget', label: 'Settings', test: 'side-nav-settings-link' },
    {
      icon: <Team />,
      link: '/settings/organization',
      label: 'Team Members',
      test: 'side-nav-settings-organization',
    },
  ];

  /**
   * TODO: Remove once migrated to the new styling.
   * Add each new page when migrating
   */
  if (!['/', '/templates'].includes(location.pathname)) {
    return <LegacyAppLayout>{children}</LegacyAppLayout>;
  }

  return (
    <ColorSchemeProvider colorScheme={colorScheme} toggleColorScheme={toggleColorScheme}>
      <ThemeProvider colorScheme={colorScheme}>
        <AppShell
          padding="lg"
          navbar={
            <Navbar
              padding={30}
              sx={{ backgroundColor: 'transparent', borderRight: 'none', paddingRight: 0 }}
              width={{ base: 300 }}>
              <Navbar.Section>
                <NavMenu menuItems={menuItems} />
              </Navbar.Section>
            </Navbar>
          }
          header={<HeaderNav />}
          styles={(theme) => ({
            main: { backgroundColor: theme.colorScheme === 'dark' ? colors.BGDark : theme.colors.gray[0] },
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
    </ColorSchemeProvider>
  );
}

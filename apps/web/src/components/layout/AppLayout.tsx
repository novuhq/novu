import { useCallback, useState } from 'react';
import { AppShell } from '@mantine/core';
import * as Sentry from '@sentry/react';
import { Outlet } from 'react-router-dom';
import { IntercomProvider } from 'react-use-intercom';

import { ThemeProvider } from '../../design-system/ThemeProvider';
import { HeaderNav } from './components/HeaderNav';
import { SideNav } from './components/SideNav';
import { colors } from '../../design-system';
import { INTERCOM_APP_ID } from '../../config';

const SupportChatProvider = ({ children, appId, isIntercomEnabled }) => {
  if (isIntercomEnabled) {
    return <IntercomProvider appId={appId}>{children}</IntercomProvider>;
  }

  return <>{children}</>;
};

export function AppLayout() {
  const [isIntercomEnabled] = useState<boolean>(!!INTERCOM_APP_ID);

  return (
    <ThemeProvider>
      <SupportChatProvider appId={INTERCOM_APP_ID} isIntercomEnabled={isIntercomEnabled}>
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
            main: { backgroundColor: theme.colorScheme === 'dark' ? colors.BGDark : colors.BGLight, overflow: 'auto' },
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

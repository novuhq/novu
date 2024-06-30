import * as Sentry from '@sentry/react';
import { Outlet, useLocation } from 'react-router-dom';
import styled from '@emotion/styled';
import { css } from '@novu/novui/css';
import { LocalStudioHeader } from './LocalStudioHeader/LocalStudioHeader';
import { LocalStudioSidebar } from './LocalStudioSidebar';
import { isStudioOnboardingRoute } from '../../../studio/utils/routing';

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

export function LocalStudioPageLayout() {
  const { pathname } = useLocation();

  return (
    <Sentry.ErrorBoundary
      fallback={({ error, eventId }) => (
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
      <AppShell className={css({ '& *': { colorPalette: 'mode.local' } })}>
        <LocalStudioSidebar />
        <ContentShell>
          {!isStudioOnboardingRoute(pathname) && <LocalStudioHeader />}
          <Outlet />
        </ContentShell>
      </AppShell>
    </Sentry.ErrorBoundary>
  );
}

import * as Sentry from '@sentry/react';
import { Outlet, useLocation } from 'react-router-dom';
import { css } from '@novu/novui/css';
import { LocalStudioHeader } from './LocalStudioHeader/LocalStudioHeader';
import { LocalStudioSidebar } from './LocalStudioSidebar';
import { isStudioOnboardingRoute } from '../../../studio/utils/routing';
import { AppShell } from './AppShell';
import { ContentShell } from './ContentShell';
import { WithLoadingSkeleton } from '@novu/novui';
import { WorkflowsDetailPage } from '../../../studio/components/workflows/index';
import { Box } from '@novu/novui/jsx';

export const LocalStudioPageLayout: WithLoadingSkeleton = () => {
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
};

LocalStudioPageLayout.LoadingDisplay = LoadingDisplay;

function LoadingDisplay() {
  return (
    <AppShell>
      <LocalStudioSidebar.LoadingDisplay />
      <ContentShell>
        <Box bg="surface.page" h="250" />
        <WorkflowsDetailPage.LoadingDisplay />
      </ContentShell>
    </AppShell>
  );
}

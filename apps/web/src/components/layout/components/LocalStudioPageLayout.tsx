import { ErrorBoundary } from '@sentry/react';
import { Outlet, useLocation } from 'react-router-dom';
import { css } from '@novu/novui/css';
import { WithLoadingSkeleton } from '@novu/novui';
import { Box } from '@novu/novui/jsx';
import { useEffect } from 'react';
import { LocalStudioHeader } from './LocalStudioHeader/LocalStudioHeader';
import { LocalStudioSidebar } from './LocalStudioSidebar';
import { isStudioOnboardingRoute } from '../../../studio/utils/routing';
import { AppShell } from './AppShell';
import { ContentShell } from './ContentShell';
import { WorkflowsDetailPage } from '../../../studio/components/workflows/index';
import { useTelemetry } from '../../../hooks/useNovuAPI';
import { useStudioState } from '../../../studio/hooks';
import { useSegment } from '../../providers/SegmentProvider';

export const LocalStudioPageLayout: WithLoadingSkeleton = () => {
  const { pathname } = useLocation();
  const state = useStudioState();
  const segment = useSegment();

  useEffect(() => {
    if (state.anonymousId) {
      segment.setAnonymousId(state.anonymousId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <ErrorBoundary
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
    </ErrorBoundary>
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

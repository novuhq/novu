import { Suspense } from 'react';
import { Outlet, useMatches } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard-layout';
import { PageContentSkeleton } from '@/components/page-content-skeleton';
import { PersistentLayoutContext } from '@/context/page-header';
import { DashboardRouteHandle } from '@/utils/route-handle';

export function SideNavLayout() {
  const matches = useMatches();
  const hideBridgeUrl = matches.some((match) => (match.handle as DashboardRouteHandle | undefined)?.hideBridgeUrl);

  return (
    <PersistentLayoutContext.Provider value={true}>
      <DashboardLayout showBridgeUrl={!hideBridgeUrl}>
        <Suspense fallback={<PageContentSkeleton />}>
          <Outlet />
        </Suspense>
      </DashboardLayout>
    </PersistentLayoutContext.Provider>
  );
}

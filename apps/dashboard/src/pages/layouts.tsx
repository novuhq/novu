import { useEffect } from 'react';

import { AnimatedOutlet } from '@/components/animated-outlet';
import { DashboardLayout } from '@/components/dashboard-layout';
import { LayoutList } from '@/components/layouts/layout-list';
import { PageMeta } from '@/components/page-meta';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';

export const LayoutsPage = () => {
  const track = useTelemetry();

  useEffect(() => {
    track(TelemetryEvent.LAYOUTS_PAGE_VISIT);
  }, [track]);

  return (
    <>
      <PageMeta title="Email Layouts" />
      <DashboardLayout
        headerStartItems={<h1 className="text-foreground-950 flex items-center gap-1">Email Layouts</h1>}
      >
        <LayoutList />
        <AnimatedOutlet />
      </DashboardLayout>
    </>
  );
};

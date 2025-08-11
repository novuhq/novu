import { useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { PageMeta } from '@/components/page-meta';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';

export function AnalyticsPage() {
  const track = useTelemetry();

  useEffect(() => {
    track(TelemetryEvent.ANALYTICS_PAGE_VISIT);
  }, [track]);

  return (
    <>
      <PageMeta title="Analytics" />
      <DashboardLayout
        headerStartItems={
          <h1 className="text-foreground-950 flex items-center gap-1">
            <span>Analytics</span>
          </h1>
        }
      >
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-foreground-600 mb-2">Analytics Dashboard</h2>
            <p className="text-foreground-400">Coming soon...</p>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}

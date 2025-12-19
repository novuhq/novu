import { useEffect } from 'react';
import { AnimatedOutlet } from '@/components/animated-outlet';
import { ContextList } from '@/components/contexts';
import { DashboardLayout } from '@/components/dashboard-layout';
import { PageMeta } from '@/components/page-meta';
import { Badge } from '@/components/primitives/badge';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';

export const ContextsPage = () => {
  const track = useTelemetry();

  useEffect(() => {
    track(TelemetryEvent.CONTEXTS_PAGE_VISIT);
  }, [track]);

  return (
    <>
      <PageMeta title="Contexts" />
      <DashboardLayout
        headerStartItems={
          <h1 className="text-foreground-950 flex items-center gap-1">
            Contexts{' '}
            <Badge color="gray" size="sm">
              BETA
            </Badge>
          </h1>
        }
      >
        <ContextList />
        <AnimatedOutlet />
      </DashboardLayout>
    </>
  );
};

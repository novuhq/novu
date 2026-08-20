import { useEffect } from 'react';
import { AnimatedOutlet } from '@/components/animated-outlet';
import { ContextList } from '@/components/contexts';
import { PageMeta } from '@/components/page-meta';
import { PageHeader } from '@/context/page-header';
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
      <PageHeader>
        <h1 className="text-foreground-950 flex items-center gap-1">Contexts</h1>
      </PageHeader>
      <ContextList />
      <AnimatedOutlet />
    </>
  );
};

import { AnimatedOutlet } from '@/components/animated-outlet';
import { DashboardLayout } from '@/components/dashboard-layout';
import { PageMeta } from '@/components/page-meta';
import { TopicList } from '@/components/topics/topic-list';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';
import { useEffect } from 'react';

export const TopicsPage = () => {
  const track = useTelemetry();

  useEffect(() => {
    track(TelemetryEvent.TOPICS_PAGE_VISIT);
  }, [track]);

  return (
    <>
      <PageMeta title="Topics" />
      <DashboardLayout headerStartItems={<h1 className="text-foreground-950 flex items-center gap-1">Topics</h1>}>
        <TopicList className="px-2.5" />
        <AnimatedOutlet />
      </DashboardLayout>
    </>
  );
};

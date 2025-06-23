import { ActivityFeedContent } from '@/components/activity/activity-feed-content';
import { DashboardLayout } from '@/components/dashboard-layout';
import { PageMeta } from '../components/page-meta';

export function ActivityFeed() {
  return (
    <>
      <PageMeta title="Activity Feed" />
      <DashboardLayout
        headerStartItems={
          <h1 className="text-foreground-950 flex items-center gap-1">
            <span>Activity Feed</span>
          </h1>
        }
      >
        <ActivityFeedContent contentHeight="h-[calc(100vh-98px)]" />
      </DashboardLayout>
    </>
  );
}

import { ActivityFeedContent } from '@/components/activity/activity-feed-content';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useEnvironment } from '@/context/environment/hooks';
import { buildRoute, ROUTES } from '@/utils/routes';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogsTable } from '../components/http-logs/logs-table';
import { PageMeta } from '../components/page-meta';
import { RequestLog } from '../types/logs';

export function ActivityFeed() {
  const isHttpLogsPageEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_HTTP_LOGS_PAGE_ENABLED, false);
  const { currentEnvironment } = useEnvironment();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine current tab based on URL
  const getCurrentTab = () => {
    if (location.pathname.includes('/activity/requests')) {
      return 'requests';
    }

    if (location.pathname.includes('/activity/runs')) {
      return 'workflow-runs';
    }

    // Default fallback for the original activity-feed route
    if (location.pathname.includes('/activity-feed')) {
      return 'workflow-runs';
    }

    return 'workflow-runs';
  };

  const currentTab = getCurrentTab();

  // Handle tab changes by navigating to the appropriate URL
  const handleTabChange = (value: string) => {
    if (!currentEnvironment?.slug) return;

    if (value === 'workflow-runs') {
      navigate(buildRoute(ROUTES.ACTIVITY_RUNS, { environmentSlug: currentEnvironment.slug }));
    } else if (value === 'requests') {
      navigate(buildRoute(ROUTES.ACTIVITY_LOGS, { environmentSlug: currentEnvironment.slug }));
    }
  };

  // Redirect legacy activity-feed URLs to the new runs URL when feature flag is enabled
  useEffect(() => {
    if (isHttpLogsPageEnabled && location.pathname.includes('/activity-feed') && currentEnvironment?.slug) {
      navigate(buildRoute(ROUTES.ACTIVITY_RUNS, { environmentSlug: currentEnvironment.slug }), { replace: true });
    }
  }, [isHttpLogsPageEnabled, location.pathname, currentEnvironment?.slug, navigate]);

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
        <Tabs value={currentTab} onValueChange={handleTabChange}>
          <TabsList variant="regular" className="border-t-0">
            <TabsTrigger value="workflow-runs" variant="regular" size="lg">
              Workflow Runs
            </TabsTrigger>
            {isHttpLogsPageEnabled && (
              <TabsTrigger value="requests" variant="regular" size="lg">
                Requests
              </TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="workflow-runs">
            <ActivityFeedContent contentHeight="h-[calc(100vh-170px)]" />
          </TabsContent>
          <TabsContent value="requests" className="h-[calc(100vh-140px)]">
            <LogsTable />
          </TabsContent>
        </Tabs>
      </DashboardLayout>
    </>
  );
}

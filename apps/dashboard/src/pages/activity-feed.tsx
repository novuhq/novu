import { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';

import { ActivityFilters } from '@/components/activity/activity-filters';
import { ActivityPanel } from '@/components/activity/activity-panel';
import { ActivityTable } from '@/components/activity/activity-table';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/primitives/resizable';
import { useActivityUrlState } from '@/hooks/use-activity-url-state';
import { PageMeta } from '../components/page-meta';
import { defaultActivityFilters } from '@/components/activity/constants';
import { usePullActivity } from '@/hooks/use-pull-activity';
import { ActivityHeader } from '@/components/activity/activity-header';
import { ActivityOverview } from '@/components/activity/components/activity-overview';
import { ActivityLogs } from '@/components/activity/activity-logs';
import { ActivitySkeleton } from '@/components/activity/activity-skeleton';
import { ActivityError } from '@/components/activity/activity-error';

export function ActivityFeed() {
  const { activityItemId, filters, filterValues, handleActivitySelect, handleFiltersChange } = useActivityUrlState();

  const { activity, isPending, error } = usePullActivity(activityItemId);

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    // Ignore dateRange as it's always present
    if (key === 'dateRange') return false;

    // For arrays, check if they have any items
    if (Array.isArray(value)) return value.length > 0;

    // For other values, check if they exist
    return !!value;
  });

  const handleClearFilters = () => {
    handleFiltersChange(defaultActivityFilters);
  };

  const hasChanges = useMemo(() => {
    return (
      filterValues.dateRange !== defaultActivityFilters.dateRange ||
      filterValues.channels.length > 0 ||
      filterValues.workflows.length > 0 ||
      filterValues.transactionId !== defaultActivityFilters.transactionId ||
      filterValues.subscriberId !== defaultActivityFilters.subscriberId
    );
  }, [filterValues]);

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
        <ActivityFilters
          filters={filterValues}
          onFiltersChange={handleFiltersChange}
          onReset={handleClearFilters}
          showReset={hasChanges}
        />
        <div className="relative flex h-[calc(100vh-98px)]">
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={70} minSize={50}>
              <ActivityTable
                selectedActivityId={activityItemId}
                onActivitySelect={handleActivitySelect}
                filters={filters}
                hasActiveFilters={hasActiveFilters}
                onClearFilters={handleClearFilters}
              />
            </ResizablePanel>

            <AnimatePresence mode="wait">
              {activityItemId && (
                <>
                  <ResizableHandle />
                  <ResizablePanel defaultSize={35} minSize={35} maxSize={50}>
                    <motion.div
                      key={activityItemId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{
                        duration: 0.2,
                      }}
                      className="bg-background h-full overflow-auto"
                    >
                      <ActivityPanel>
                        {isPending ? (
                          <ActivitySkeleton />
                        ) : error || !activity ? (
                          <ActivityError />
                        ) : (
                          <>
                            <ActivityHeader title={activity.template?.name} />
                            <ActivityOverview activity={activity} />
                            <ActivityLogs activity={activity} onActivitySelect={handleActivitySelect} />
                          </>
                        )}
                      </ActivityPanel>
                    </motion.div>
                  </ResizablePanel>
                </>
              )}
            </AnimatePresence>
          </ResizablePanelGroup>
        </div>
      </DashboardLayout>
    </>
  );
}

import { ActivityFilters, defaultActivityFilters } from '@/components/activity/activity-filters';
import { ActivityPanel } from '@/components/activity/activity-panel';
import { ActivityTable } from '@/components/activity/activity-table';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/primitives/resizable';
import { useActivityUrlState } from '@/hooks/use-activity-url-state';
import { AnimatePresence, motion } from 'motion/react';
import { PageMeta } from '../components/page-meta';

export function ActivityFeed() {
  const { activityItemId, filters, filterValues, handleActivitySelect, handleFiltersChange } = useActivityUrlState();

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
          onFiltersChange={handleFiltersChange}
          initialValues={filterValues}
          onReset={handleClearFilters}
        />
        <div className="relative flex h-[calc(100vh-88px)]">
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
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{
                        duration: 0.2,
                      }}
                      className="bg-background h-full overflow-auto"
                    >
                      <ActivityPanel activityId={activityItemId} onActivitySelect={handleActivitySelect} />
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

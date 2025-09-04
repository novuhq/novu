import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ActivityError } from '@/components/activity/activity-error';
import { ActivityFilters } from '@/components/activity/activity-filters';
import { ActivityHeader } from '@/components/activity/activity-header';
import { ActivityLogs } from '@/components/activity/activity-logs';
import { ActivityPanel } from '@/components/activity/activity-panel';
import { ActivitySkeleton } from '@/components/activity/activity-skeleton';
import { ActivityTable } from '@/components/activity/activity-table';
import { ActivityOverview } from '@/components/activity/components/activity-overview';
import { defaultActivityFilters } from '@/components/activity/constants';
import { ResizablePanel, ResizablePanelGroup } from '@/components/primitives/resizable';
import { UpdatedAgo } from '@/components/updated-ago';
import { useEnvironment } from '@/context/environment/hooks';
import { useActivityUrlState } from '@/hooks/use-activity-url-state';
import { usePullActivity } from '@/hooks/use-pull-activity';
import { ActivityFiltersData } from '@/types/activity';
import { QueryKeys } from '@/utils/query-keys';
import { cn } from '../../utils/ui';
import { EmptyTopicsIllustration } from '../topics/empty-topics-illustration';

type ActivityFeedContentProps = {
  initialFilters?: Partial<ActivityFiltersData>;
  hideFilters?: Array<'dateRange' | 'workflows' | 'channels' | 'transactionId' | 'subscriberId' | 'topicKey'>;
  className?: string;
  contentHeight?: string;
  onTriggerWorkflow?: () => void;
};

export function ActivityFeedContent({
  initialFilters = {},
  hideFilters = [],
  className,
  contentHeight = 'h-[calc(100vh-140px)]',
  onTriggerWorkflow,
}: ActivityFeedContentProps) {
  const { activityItemId, filters, filterValues, handleActivitySelect, handleFiltersChange } = useActivityUrlState();
  const { activity, isPending, error } = usePullActivity(activityItemId);

  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();

  // Track last updated time for the activities list
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    setLastUpdated(new Date());
  }, [filters]);

  // Merge initial filters with current filters
  const mergedFilterValues = useMemo(
    () => ({
      ...defaultActivityFilters,
      ...initialFilters,
      ...filterValues,
    }),
    [initialFilters, filterValues]
  );

  const mergedFilters = useMemo(
    () => ({
      ...filters,
      // Apply initial filters that should always be present
      ...(initialFilters.workflows?.length && { workflows: initialFilters.workflows }),
      ...(initialFilters.subscriberId && { subscriberId: initialFilters.subscriberId }),
      ...(initialFilters.topicKey && { topicKey: initialFilters.topicKey }),
    }),
    [filters, initialFilters]
  );

  const hasActiveFilters = Object.entries(mergedFilters).some(([key, value]) => {
    // Ignore dateRange as it's always present
    if (key === 'dateRange') return false;

    // Ignore initial filters that are always applied
    if (key === 'workflows' && initialFilters.workflows?.length) {
      return Array.isArray(value) && value.length > (initialFilters.workflows?.length || 0);
    }

    if (key === 'subscriberId' && initialFilters.subscriberId) {
      return value !== initialFilters.subscriberId;
    }

    if (key === 'topicKey' && initialFilters.topicKey) {
      return value !== initialFilters.topicKey;
    }

    // For arrays, check if they have any items
    if (Array.isArray(value)) return value.length > 0;

    // For other values, check if they exist
    return !!value;
  });

  const handleClearFilters = () => {
    handleFiltersChange({
      ...defaultActivityFilters,
      ...initialFilters,
    });
  };

  const hasChanges = useMemo(() => {
    const baseFilters = { ...defaultActivityFilters, ...initialFilters };
    return (
      mergedFilterValues.dateRange !== baseFilters.dateRange ||
      mergedFilterValues.channels.length > 0 ||
      mergedFilterValues.workflows.length > (baseFilters.workflows?.length || 0) ||
      mergedFilterValues.transactionId !== (baseFilters.transactionId || '') ||
      mergedFilterValues.subscriberId !== (baseFilters.subscriberId || '') ||
      mergedFilterValues.severity.length > 0
    );
  }, [mergedFilterValues, initialFilters]);

  const handleTransactionIdChange = useCallback(
    (newTransactionId: string, activityId?: string) => {
      if (activityId) {
        handleActivitySelect(activityId);
      } else {
        handleFiltersChange({
          ...mergedFilterValues,
          ...(newTransactionId && { transactionId: newTransactionId }),
        });
      }
    },
    [mergedFilterValues, handleFiltersChange, handleActivitySelect]
  );

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchActivities, currentEnvironment?._id] });
    setLastUpdated(new Date());
  };

  return (
    <div className={cn('p-2.5', className)}>
      <div className="flex items-center justify-between pb-2.5">
        <ActivityFilters
          filters={mergedFilterValues}
          onFiltersChange={handleFiltersChange}
          onReset={handleClearFilters}
          showReset={hasChanges}
          hide={hideFilters}
          className="pb-0"
        />
        <UpdatedAgo lastUpdated={lastUpdated} onRefresh={handleRefresh} />
      </div>
      <div className={`relative flex ${contentHeight}`}>
        <ResizablePanelGroup direction="horizontal" className="gap-2">
          <ResizablePanel defaultSize={50} minSize={35}>
            <ActivityTable
              selectedActivityId={activityItemId}
              onActivitySelect={handleActivitySelect}
              filters={mergedFilters}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={handleClearFilters}
              onTriggerWorkflow={onTriggerWorkflow}
            />
          </ResizablePanel>

          <ResizablePanel defaultSize={50} minSize={35} maxSize={50}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activityItemId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  duration: 0.2,
                }}
                className="border-stroke-soft h-full overflow-auto rounded-lg border bg-white"
              >
                {activityItemId ? (
                  <ActivityPanel>
                    {isPending ? (
                      <ActivitySkeleton />
                    ) : error || !activity ? (
                      <ActivityError />
                    ) : (
                      <>
                        <ActivityHeader activity={activity} onTransactionIdChange={handleTransactionIdChange} />
                        <ActivityOverview activity={activity} />
                        <ActivityLogs activity={activity} onActivitySelect={handleActivitySelect} />
                      </>
                    )}
                  </ActivityPanel>
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-6 text-center">
                    <EmptyTopicsIllustration />
                    <p className="text-text-soft text-paragraph-sm max-w-[60ch]">
                      Nothing to show,
                      <br />
                      Select an log on the left to view detailed info here
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}

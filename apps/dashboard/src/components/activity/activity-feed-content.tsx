import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useMemo } from 'react';

import { ActivityError } from '@/components/activity/activity-error';
import { ActivityFilters } from '@/components/activity/activity-filters';
import { ActivityHeader } from '@/components/activity/activity-header';
import { ActivityLogs } from '@/components/activity/activity-logs';
import { ActivityPanel } from '@/components/activity/activity-panel';
import { ActivitySkeleton } from '@/components/activity/activity-skeleton';
import { ActivityTable } from '@/components/activity/activity-table';
import { ActivityOverview } from '@/components/activity/components/activity-overview';
import { defaultActivityFilters } from '@/components/activity/constants';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/primitives/resizable';
import { useActivityUrlState } from '@/hooks/use-activity-url-state';
import { usePullActivity } from '@/hooks/use-pull-activity';
import { ActivityFiltersData } from '@/types/activity';

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
      mergedFilterValues.subscriberId !== (baseFilters.subscriberId || '')
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

  return (
    <div className={className}>
      <ActivityFilters
        filters={mergedFilterValues}
        onFiltersChange={handleFiltersChange}
        onReset={handleClearFilters}
        showReset={hasChanges}
        hide={hideFilters}
      />
      <div className={`relative flex ${contentHeight}`}>
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={70} minSize={50}>
            <ActivityTable
              selectedActivityId={activityItemId}
              onActivitySelect={handleActivitySelect}
              filters={mergedFilters}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={handleClearFilters}
              onTriggerWorkflow={onTriggerWorkflow}
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
                          <ActivityLogs
                            activity={activity}
                            onActivitySelect={handleActivitySelect}
                            onTransactionIdChange={handleTransactionIdChange}
                          />
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
    </div>
  );
}

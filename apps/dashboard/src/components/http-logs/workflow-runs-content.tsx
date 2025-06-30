import { useMemo, useState } from 'react';
import { ChannelTypeEnum, JobStatusEnum } from '@novu/shared';
import {
  RiCheckboxCircleFill,
  RiErrorWarningFill,
  RiLoader4Fill,
  RiSmartphoneLine,
  RiMailLine,
  RiCodeBlock,
  RiArrowDownSLine,
} from 'react-icons/ri';
import { Table, TableBody, TableCell, TableRow } from '@/components/primitives/table';
import { Button } from '@/components/primitives/button';
import { useFetchActivities } from '@/hooks/use-fetch-activities';
import { getActivityStatus } from '@/components/activity/helpers';
import { RequestLog } from '../../types/logs';
import { WorkflowRunsFilters } from './workflow-runs-filters';
import { useWorkflowRunsUrlState } from './hooks/use-workflow-runs-url-state';
import { type ActivityFilters } from '@/api/activity';

type WorkflowRunsContentProps = {
  log: RequestLog;
};

type WorkflowRunStatus = 'in-progress' | 'success' | 'error';

const ITEMS_PER_PAGE = 10; // Show 10 items initially, then load more

// Helper function to map activity status to workflow run status
function getWorkflowRunStatus(activity: any): WorkflowRunStatus {
  const activityStatus = getActivityStatus(activity.jobs || []);

  switch (activityStatus) {
    case JobStatusEnum.COMPLETED:
      return 'success';
    case JobStatusEnum.FAILED:
      return 'error';
    case JobStatusEnum.PENDING:
    case JobStatusEnum.QUEUED:
    case JobStatusEnum.RUNNING:
    case JobStatusEnum.DELAYED:
      return 'in-progress';
    default:
      return 'in-progress';
  }
}

// Helper function to get channel icon
function getChannelIcon(channel: ChannelTypeEnum) {
  switch (channel) {
    case ChannelTypeEnum.EMAIL:
      return <RiMailLine className="h-3 w-3 text-[#0e121b]" />;
    case ChannelTypeEnum.SMS:
      return <RiSmartphoneLine className="h-3 w-3 text-[#0e121b]" />;
    case ChannelTypeEnum.PUSH:
      return <RiSmartphoneLine className="h-3 w-3 text-[#0e121b]" />;
    case ChannelTypeEnum.IN_APP:
      return <RiCodeBlock className="h-3 w-3 text-[#0e121b]" />;
    case ChannelTypeEnum.CHAT:
      return <RiCodeBlock className="h-3 w-3 text-[#0e121b]" />;
    default:
      return <RiCodeBlock className="h-3 w-3 text-[#0e121b]" />;
  }
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function StatusIcon({ status }: { status: WorkflowRunStatus }) {
  const iconClass = 'w-4 h-4 rounded-full shadow-[0px_1px_2px_0px_rgba(10,13,20,0.03)]';

  switch (status) {
    case 'success':
      return (
        <div className={`${iconClass} flex items-center justify-center bg-white`}>
          <RiCheckboxCircleFill className="h-4 w-4 text-[#1fc16b]" />
        </div>
      );
    case 'error':
      return (
        <div className={`${iconClass} flex items-center justify-center bg-white`}>
          <RiErrorWarningFill className="h-4 w-4 text-[#fb3748]" />
        </div>
      );
    case 'in-progress':
      return (
        <div className={`${iconClass} flex items-center justify-center bg-white`}>
          <RiLoader4Fill className="h-4 w-4 animate-spin text-[#f6b51e]" />
        </div>
      );
    default:
      return null;
  }
}

export function WorkflowRunsContent({ log }: WorkflowRunsContentProps) {
  // Note: log parameter is currently unused but kept for future functionality
  // where we might want to filter activities related to a specific request log
  const { filterValues, handleFiltersChange, resetFilters } = useWorkflowRunsUrlState();

  // Local state for pagination
  const [displayedItemsCount, setDisplayedItemsCount] = useState(ITEMS_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Build activity filters from workflow runs filters
  const activityFilters = useMemo(() => {
    const filters: ActivityFilters = { transactionId: log.transactionId || '' };

    // Only apply other filters if they are explicitly set by the user
    // Map channels from workflow runs format to activity format
    if (filterValues.channels && filterValues.channels.length > 0) {
      filters.channels = filterValues.channels;
    }

    // Map workflows filter to activity format
    if (filterValues.workflows && filterValues.workflows.length > 0) {
      filters.workflows = filterValues.workflows;
    }

    if (filterValues.subscriberId && filterValues.subscriberId.trim()) {
      filters.subscriberId = filterValues.subscriberId;
    }

    return filters;
  }, [filterValues, log.transactionId]);

  // Fetch activities using the same pattern as ActivityLogs
  const { activities, isLoading, error } = useFetchActivities(
    {
      filters: activityFilters,
      page: 0,
      limit: 50, // Get more items for better filtering
    },
    {
      refetchOnWindowFocus: false,
      staleTime: 30000, // Cache for 30 seconds
    }
  );

  // Filter activities based on workflow runs filters
  const filteredActivities = useMemo(() => {
    if (!activities || activities.length === 0) {
      return [];
    }

    const filtered = [...activities];

    // Apply default sorting by timestamp (newest first)
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA; // Newest first
    });

    return filtered;
  }, [activities]);

  // Reset displayed items when filters change
  useMemo(() => {
    setDisplayedItemsCount(ITEMS_PER_PAGE);
  }, []);

  // Get items to display (paginated)
  const displayedActivities = filteredActivities.slice(0, displayedItemsCount);
  const hasMoreItems = displayedItemsCount < filteredActivities.length;

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    // Simulate loading delay for better UX
    await new Promise((resolve) => setTimeout(resolve, 500));
    setDisplayedItemsCount((prev) => Math.min(prev + ITEMS_PER_PAGE, filteredActivities.length));
    setIsLoadingMore(false);
  };

  if (error) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="text-foreground-600 text-sm">Failed to load workflow runs</p>
      </div>
    );
  }

  return (
    <div className="flex h-0 min-h-0 flex-1 flex-col overflow-hidden">
      {/* Header - Fixed */}
      <div className="flex-none border-b border-[#f2f5f8] bg-white px-3 py-3">
        <div className="flex w-full flex-row items-start justify-between">
          <div className="flex-1">
            <div className="flex w-full flex-col items-start gap-2">
              <div className="w-full">
                <div className="flex w-full flex-col items-start gap-0.5 text-left font-['Inter'] font-medium">
                  <div className="flex flex-col justify-center text-[14px] tracking-[-0.084px] text-[#525866]">
                    <p className="leading-[20px]">
                      <span className="text-[#525866]">{filteredActivities.length}</span>
                      <span className="text-[#99a0ae]"> workflow triggers</span>
                    </p>
                  </div>
                  <div className="flex min-w-full flex-col justify-center text-[12px] text-[#99a0ae]">
                    <p className="leading-[16px]">Trigger received — workflow run queued.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-left font-['Inter'] text-[12px] font-medium leading-[16px] text-[#0e121b]">
            Workflow runs ↗
          </div>
        </div>
      </div>

      {/* Filters - Fixed */}
      <div className="flex-none border-b border-[#f2f5f8] bg-white">
        <WorkflowRunsFilters
          filterValues={filterValues}
          onFiltersChange={handleFiltersChange}
          onReset={resetFilters}
          isFetching={isLoading}
        />
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full">
          {isLoading ? (
            // Loading skeleton
            <div className="p-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="mb-3 flex items-center gap-2 rounded-lg border border-neutral-100 p-3">
                  <div className="h-4 w-4 animate-pulse rounded-full bg-neutral-200" />
                  <div className="flex-1">
                    <div className="mb-1 h-4 w-32 animate-pulse rounded bg-neutral-200" />
                    <div className="h-3 w-24 animate-pulse rounded bg-neutral-200" />
                  </div>
                  <div className="h-3 w-12 animate-pulse rounded bg-neutral-200" />
                </div>
              ))}
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="flex h-48 items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-center">
                <p className="text-foreground-600 text-sm">No workflow runs found</p>
                {activities.length === 0 ? (
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-foreground-500 text-xs">No activities available in this environment</p>
                    <p className="text-foreground-400 text-xs">Try triggering a workflow to see activity data here</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-foreground-500 text-xs">
                      {activities.length} activities available, but none match your filters
                    </p>
                    <p className="text-foreground-400 text-xs">Try adjusting your filters or resetting them</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Activity List */}
              <div className="p-3">
                <Table>
                  <TableBody>
                    {displayedActivities.map((activity) => (
                      <TableRow key={activity._id} className="h-[50px] hover:bg-neutral-50">
                        <TableCell className="px-3 py-1.5">
                          <div className="flex w-full flex-col items-end gap-0.5">
                            {/* Top row: Status icon, workflow name, and date */}
                            <div className="w-full">
                              <div className="flex w-full flex-row items-center gap-1">
                                <StatusIcon status={getWorkflowRunStatus(activity)} />
                                <div className="flex-1">
                                  <div className="text-left font-['Inter'] text-[12px] font-medium leading-[16px] text-[#0e121b]">
                                    {activity.template?.name || 'Unknown Workflow'}
                                  </div>
                                </div>
                                <div className="text-left font-['JetBrains_Mono'] text-[11px] font-normal leading-normal text-[#99a0ae]">
                                  {formatTimestamp(activity.createdAt)}
                                </div>
                              </div>
                            </div>

                            {/* Bottom row: Transaction ID and step indicators */}
                            <div className="w-full">
                              <div className="flex w-full flex-row items-center gap-1">
                                <div className="flex-1">
                                  <div className="text-left font-['JetBrains_Mono'] text-[11px] font-normal leading-normal text-[#99a0ae]">
                                    {activity.transactionId}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  {activity.channels?.slice(0, 3).map((channel, index) => (
                                    <div key={index} className="flex items-center">
                                      {getChannelIcon(channel)}
                                    </div>
                                  ))}
                                  {activity.channels && activity.channels.length > 3 && (
                                    <div className="text-[11px] text-[#99a0ae]">+{activity.channels.length - 3}</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Load More Button */}
              {hasMoreItems && (
                <div className="border-t border-[#f2f5f8] bg-white p-3">
                  <div className="flex w-full justify-center">
                    <Button
                      variant="secondary"
                      mode="ghost"
                      size="sm"
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      className="flex items-center gap-2"
                    >
                      {isLoadingMore ? (
                        <>
                          <RiLoader4Fill className="h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <RiArrowDownSLine className="h-4 w-4" />
                          Load more ({filteredActivities.length - displayedItemsCount} remaining)
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

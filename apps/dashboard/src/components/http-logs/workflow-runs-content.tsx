import { useMemo, useState } from 'react';
import { ChannelTypeEnum, JobStatusEnum } from '@novu/shared';
import { RiLoader4Fill, RiArrowDownSLine, RiArrowRightUpLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableRow } from '@/components/primitives/table';
import { Button } from '@/components/primitives/button';
import { LinkButton } from '@/components/primitives/button-link';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/primitives/tabs';
import { useFetchActivities } from '@/hooks/use-fetch-activities';
import { useEnvironment } from '@/context/environment/hooks';
import { buildRoute, ROUTES } from '@/utils/routes';
import { RequestLog } from '../../types/logs';
import { WorkflowRunsFilters } from './workflow-runs-filters';
import { useWorkflowRunsUrlState } from './hooks/use-workflow-runs-url-state';
import { type ActivityFilters } from '@/api/activity';
import { formatDateSimple } from '../../utils/format-date';
import { ActivityTableRow } from '@/components/activity/components/activity-table-row';
import { WorkflowRunActivityDrawer } from './workflow-run-activity-drawer';

type WorkflowRunsContentProps = {
  log: RequestLog;
};

const ITEMS_PER_PAGE = 10; // Show 10 items initially, then load more

export function WorkflowRunsContent({ log }: WorkflowRunsContentProps) {
  const { filterValues, handleFiltersChange, resetFilters } = useWorkflowRunsUrlState();
  const { currentEnvironment } = useEnvironment();
  const navigate = useNavigate();

  const [displayedItemsCount, setDisplayedItemsCount] = useState(ITEMS_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | undefined>(undefined);
  const [isActivityDrawerOpen, setIsActivityDrawerOpen] = useState(false);

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

  const { activities, isLoading, error } = useFetchActivities(
    {
      filters: activityFilters,
      page: 0,
      limit: 50,
    },
    {
      refetchOnWindowFocus: false,
      staleTime: 30000,
    }
  );

  useMemo(() => {
    setDisplayedItemsCount(ITEMS_PER_PAGE);
  }, []);

  const displayedActivities = activities.slice(0, displayedItemsCount);
  const hasMoreItems = displayedItemsCount < activities.length;

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    // Simulate loading delay for better UX
    await new Promise((resolve) => setTimeout(resolve, 500));
    setDisplayedItemsCount((prev) => Math.min(prev + ITEMS_PER_PAGE, activities.length));
    setIsLoadingMore(false);
  };

  const handleNavigateToRuns = () => {
    if (!currentEnvironment?.slug) return;

    const params = new URLSearchParams();

    if (log.transactionId) {
      params.set('transactionId', log.transactionId);
    }

    const runsUrl = buildRoute(ROUTES.ACTIVITY_RUNS, { environmentSlug: currentEnvironment.slug });
    navigate(`${runsUrl}?${params.toString()}`);
  };

  const handleActivityClick = (activityId: string) => {
    setSelectedActivityId(activityId);
    setIsActivityDrawerOpen(true);
  };

  const handleActivityDrawerClose = () => {
    setIsActivityDrawerOpen(false);
    setSelectedActivityId(undefined);
  };

  if (error) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="text-foreground-600 text-sm">Failed to load workflow runs</p>
      </div>
    );
  }

  return (
    <>
      <Tabs defaultValue="workflow-runs" className="flex h-0 min-h-0 flex-1 flex-col overflow-hidden">
        <TabsList variant="regular" className="bg-bg-weak">
          <TabsTrigger variant="regular" size="md" value="workflow-runs" className="h-[36px]">
            Workflow runs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workflow-runs" className="flex h-0 min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-none bg-white px-3 py-3 pb-2">
            <div className="flex w-full flex-row items-start justify-between">
              <div className="flex w-full flex-col items-start gap-0.5 text-left font-['Inter'] font-medium">
                <div className="flex flex-col justify-center text-[14px] tracking-[-0.084px] text-[#525866]">
                  <p className="leading-[20px]">
                    <span className="text-[#525866]">{activities.length}</span>
                    <span className="text-[#99a0ae]"> workflow runs created</span>
                  </p>
                </div>
              </div>

              <LinkButton
                variant="gray"
                size="sm"
                onClick={handleNavigateToRuns}
                trailingIcon={RiArrowRightUpLine}
                className="text-text-subtext-xs font-medium"
              >
                Workflow runs
              </LinkButton>
            </div>
          </div>

          <div className="flex-none border-b border-[#f2f5f8] bg-white">
            <WorkflowRunsFilters
              filterValues={filterValues}
              onFiltersChange={handleFiltersChange}
              onReset={resetFilters}
              isFetching={isLoading}
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="min-h-full">
              {isLoading ? (
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
              ) : activities.length === 0 ? (
                <div className="flex h-48 items-center justify-center">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <p className="text-foreground-600 text-sm">No workflow runs found</p>
                    {activities.length === 0 ? (
                      <div className="flex flex-col items-center gap-1">
                        <p className="text-foreground-500 text-xs">No activities available in this environment</p>
                        <p className="text-foreground-400 text-xs">
                          Try triggering a workflow to see activity data here
                        </p>
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
                  <div className="p-3">
                    <Table>
                      <TableBody>
                        {displayedActivities.map((activity) => (
                          <ActivityTableRow key={activity._id} activity={activity} onClick={handleActivityClick} />
                        ))}
                      </TableBody>
                    </Table>
                  </div>

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
                              Load more ({activities.length - displayedItemsCount} remaining)
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
        </TabsContent>
      </Tabs>

      <WorkflowRunActivityDrawer
        isOpen={isActivityDrawerOpen}
        onOpenChange={setIsActivityDrawerOpen}
        activityId={selectedActivityId}
      />
    </>
  );
}

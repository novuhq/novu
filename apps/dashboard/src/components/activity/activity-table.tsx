import { ActivityFilters } from '@/api/activity';
import { Skeleton } from '@/components/primitives/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/primitives/table';
import { TimeDisplayHoverCard } from '@/components/time-display-hover-card';
import { formatDate } from '@/utils/format-date';
import { parsePageParam } from '@/utils/parse-page-param';
import { cn } from '@/utils/ui';
import { ISubscriber } from '@novu/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { createSearchParams, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useFetchActivities } from '../../hooks/use-fetch-activities';
import { ActivityEmptyState } from './activity-empty-state';
import { ArrowPagination } from './components/arrow-pagination';
import { ActivityStatusBadge } from './components/status-badge';
import { StepIndicators } from './components/step-indicators';

export interface ActivityTableProps {
  selectedActivityId: string | null;
  onActivitySelect: (activityItemId: string) => void;
  filters?: ActivityFilters;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export function ActivityTable({
  selectedActivityId,
  onActivitySelect,
  filters,
  hasActiveFilters,
  onClearFilters,
}: ActivityTableProps) {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const page = parsePageParam(searchParams.get('page'));
  const { activities, isLoading, hasMore, error } = useFetchActivities(
    {
      filters,
      page,
    },
    {
      refetchOnWindowFocus: true,
    }
  );

  useEffect(() => {
    if (error) {
      toast.error('Failed to fetch activities', {
        description: error instanceof Error ? error.message : 'There was an error loading the activities.',
      });
    }
  }, [error]);

  function handlePageChange(newPage: number) {
    const newParams = createSearchParams({
      ...Object.fromEntries(searchParams),
      page: newPage.toString(),
    });
    navigate(`${location.pathname}?${newParams}`);
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {!isLoading && activities.length === 0 ? (
        <motion.div
          key="empty-state"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex h-full w-full items-center justify-center"
        >
          <ActivityEmptyState emptySearchResults={hasActiveFilters} onClearFilters={onClearFilters} />
        </motion.div>
      ) : (
        <motion.div
          key="table-state"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex min-h-full flex-1 flex-col"
        >
          <Table
            isLoading={isLoading}
            loadingRow={<SkeletonRow />}
            containerClassname="border-x-0 border-b-0 border-t border-t-neutral-200 rounded-none shadow-none"
          >
            <TableHeader className="shadow-none">
              <TableRow className="border-b border-neutral-200 shadow-none [&>th]:border-b [&>th]:border-neutral-200">
                <TableHead className="h-9 px-3 py-0">Event</TableHead>
                <TableHead className="h-9 px-3 py-0">Status</TableHead>
                <TableHead className="h-9 px-3 py-0">Steps</TableHead>
                <TableHead className="h-9 px-3 py-0">Triggered at</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.map((activity) => (
                <TableRow
                  key={activity._id}
                  className={cn(
                    'relative cursor-pointer hover:bg-neutral-50',
                    selectedActivityId === activity._id &&
                      'bg-neutral-50 after:absolute after:right-0 after:top-0 after:h-[calc(100%-1px)] after:w-[5px] after:bg-neutral-200'
                  )}
                  onClick={() => onActivitySelect(activity._id)}
                >
                  <TableCell className="px-3">
                    <div className="flex flex-col">
                      <span className="text-foreground-950 font-medium">
                        {activity.template?.name || 'Deleted workflow'}
                      </span>
                      <span className="text-foreground-400 text-[10px] leading-[14px]">
                        {activity.transactionId}{' '}
                        {getSubscriberDisplay(
                          activity.subscriber as Pick<ISubscriber, '_id' | 'subscriberId' | 'firstName' | 'lastName'>
                        )}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-3">
                    <ActivityStatusBadge jobs={activity.jobs} />
                  </TableCell>
                  <TableCell className="px-3">
                    <StepIndicators jobs={activity.jobs} />
                  </TableCell>
                  <TableCell className="text-foreground-600 px-3">
                    <TimeDisplayHoverCard date={new Date(activity.createdAt)}>
                      <span>{formatDate(activity.createdAt)}</span>
                    </TimeDisplayHoverCard>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <ArrowPagination page={page} hasMore={hasMore} onPageChange={handlePageChange} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SkeletonRow() {
  return (
    <TableRow>
      <TableCell className="px-3">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-2.5 w-20" />
        </div>
      </TableCell>
      <TableCell className="px-3">
        <div className="flex h-7 w-28 items-center justify-center gap-1.5">
          <Skeleton className="h-3.5 w-3.5 rounded-full" />
          <Skeleton className="h-3.5 w-16" />
        </div>
      </TableCell>
      <TableCell className="px-3">
        <div className="flex items-center">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="-ml-2 flex h-7 w-7 items-center justify-center first:ml-0">
              <Skeleton className="h-4 w-4" />
            </div>
          ))}
        </div>
      </TableCell>
      <TableCell className="px-3">
        <Skeleton className="h-4 w-36 font-mono" />
      </TableCell>
    </TableRow>
  );
}

function getSubscriberDisplay(subscriber?: Pick<ISubscriber, '_id' | 'subscriberId' | 'firstName' | 'lastName'>) {
  if (!subscriber) return '';

  if (subscriber.firstName || subscriber.lastName) {
    return `• ${subscriber.firstName || ''} ${subscriber.lastName || ''}`.trim();
  }

  return '';
}

import { ActivityFilters } from '@/api/activity';
import { Skeleton } from '@/components/primitives/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/primitives/table';
import { TimeDisplayHoverCard } from '@/components/time-display-hover-card';
import { formatDate, formatDateSimple } from '@/utils/format-date';
import { parsePageParam } from '@/utils/parse-page-param';
import { cn } from '@/utils/ui';
import { ISubscriber } from '@novu/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { createSearchParams, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { useFetchActivities } from '../../hooks/use-fetch-activities';
import { ActivityEmptyState } from './activity-empty-state';
import { ArrowPagination } from './components/arrow-pagination';
import { ActivityTableRow } from './components/activity-table-row';

export interface ActivityTableProps {
  selectedActivityId: string | null;
  onActivitySelect: (activityItemId: string) => void;
  filters?: ActivityFilters;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  isLoading?: boolean;
  onTriggerWorkflow?: () => void;
}

export function ActivityTable({
  selectedActivityId,
  onActivitySelect,
  filters,
  hasActiveFilters,
  onClearFilters,
  onTriggerWorkflow,
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
      showErrorToast(
        error instanceof Error ? error.message : 'There was an error loading the activities.',
        'Failed to fetch activities'
      );
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
          <ActivityEmptyState
            filters={filters}
            emptySearchResults={hasActiveFilters}
            onClearFilters={onClearFilters}
            onTriggerWorkflow={onTriggerWorkflow}
          />
        </motion.div>
      ) : (
        <motion.div
          key="table-state"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col"
        >
          <Table isLoading={isLoading} loadingRow={<SkeletonRow />}>
            <TableHeader>
              <TableRow>
                <TableHead className="text-text-strong h-8 px-2 py-0">Workflow runs</TableHead>
                <TableHead className="h-8 w-[175px] px-2 py-0"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.map((activity) => (
                <ActivityTableRow
                  key={activity._id}
                  activity={activity}
                  isSelected={selectedActivityId === activity._id}
                  onClick={onActivitySelect}
                />
              ))}
            </TableBody>
          </Table>

          <ArrowPagination
            page={page}
            hasMore={hasMore}
            onPageChange={handlePageChange}
            className="border-t-0 bg-transparent"
          />
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

import { FeatureFlagsKeysEnum } from '@novu/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { createSearchParams, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { ActivityFilters } from '@/api/activity';
import { Skeleton } from '@/components/primitives/skeleton';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/primitives/table';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { parsePageParam } from '@/utils/parse-page-param';
import { useFetchActivities } from '../../hooks/use-fetch-activities';
import { ActivityEmptyState } from './activity-empty-state';
import { ActivityTableRow } from './components/activity-table-row';
import { ArrowPagination } from './components/arrow-pagination';
import { CursorPagination } from './components/cursor-pagination';

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
  const isWorkflowRunMigrationEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_WORKFLOW_RUN_PAGE_MIGRATION_ENABLED);

  // Get pagination parameters from URL
  const page = parsePageParam(searchParams.get('page'));
  const cursor = searchParams.get('cursor');

  const { activities, isLoading, hasMore, next, previous, error } = useFetchActivities(
    {
      filters,
      page: isWorkflowRunMigrationEnabled ? undefined : page,
      cursor: isWorkflowRunMigrationEnabled ? cursor : undefined,
    },
    {
      refetchOnWindowFocus: false,
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
    // Remove cursor when using page-based pagination
    newParams.delete('cursor');
    navigate(`${location.pathname}?${newParams}`);
  }

  function handleCursorNavigation(newCursor: string | null, action: 'next' | 'previous' | 'first') {
    const newParams = createSearchParams({
      ...Object.fromEntries(searchParams),
    });

    // Remove page when using cursor-based pagination
    newParams.delete('page');

    if (action === 'first') {
      // Go to first page by removing cursor
      newParams.delete('cursor');
    } else if (newCursor) {
      newParams.set('cursor', newCursor);
    } else {
      newParams.delete('cursor');
    }

    navigate(`${location.pathname}?${newParams}`);
  }

  function handleNext() {
    if (next) {
      handleCursorNavigation(next, 'next');
    }
  }

  function handlePrevious() {
    if (previous) {
      handleCursorNavigation(previous, 'previous');
    }
  }

  function handleFirst() {
    handleCursorNavigation(null, 'first');
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

          {isWorkflowRunMigrationEnabled ? (
            <CursorPagination
              hasMore={hasMore}
              hasPrevious={!!previous}
              onNext={handleNext}
              onPrevious={handlePrevious}
              onFirst={handleFirst}
              className="border-t-0 bg-transparent"
              isLoading={isLoading}
            />
          ) : (
            <ArrowPagination
              page={page}
              hasMore={hasMore}
              onPageChange={handlePageChange}
              className="border-t-0 bg-transparent"
            />
          )}
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

// Use pagination primitives from the dashboard project

import { DirectionEnum, PermissionsEnum } from '@novu/shared';
import { HTMLAttributes, useCallback } from 'react';
import { RiAddCircleLine } from 'react-icons/ri';
import { useSearchParams } from 'react-router-dom';
import { CursorPagination } from '@/components/cursor-pagination';
import { PermissionButton } from '@/components/primitives/permission-button';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/primitives/table';
import { useFetchTopics } from '@/hooks/use-fetch-topics';
import { cn } from '@/utils/ui';
import { ListNoResults } from '../list-no-results';
import { useTopicsNavigate } from './hooks/use-topics-navigate';
import { TopicsFilter, TopicsSortableColumn, TopicsUrlState, useTopicsUrlState } from './hooks/use-topics-url-state';
import { TopicListBlank } from './topic-list-blank';
import { TopicRow, TopicRowSkeleton } from './topic-row';
import { TopicsFilters } from './topics-filters';

// Use type alias instead of interface for component props
type TopicListProps = HTMLAttributes<HTMLDivElement>;

// Wrapper similar to SubscriberListWrapper
const TopicListWrapper = (
  props: TopicListFiltersProps & { hasData?: boolean; areFiltersApplied?: boolean; showEmptyState?: boolean }
) => {
  const {
    className,
    children,
    filterValues,
    handleFiltersChange,
    resetFilters,
    isLoading,
    isFetching,
    hasData,
    areFiltersApplied,
    showEmptyState,
    ...rest
  } = props;
  return (
    <div className={cn('flex h-full flex-col', showEmptyState && 'h-[calc(100vh-100px)]', className)} {...rest}>
      <div className="flex items-center justify-between">
        {isLoading || hasData || areFiltersApplied ? (
          <TopicsFilters
            onFiltersChange={handleFiltersChange}
            filterValues={filterValues}
            onReset={resetFilters}
            isLoading={isLoading}
            isFetching={isFetching}
            className="py-2.5"
          />
        ) : (
          <div /> // Empty div placeholder to maintain layout
        )}
        {!showEmptyState && <CreateTopicButton />}
      </div>
      {children}
    </div>
  );
};

export const CreateTopicButton = () => {
  const { navigateToCreateTopicPage } = useTopicsNavigate();

  return (
    <PermissionButton
      permission={PermissionsEnum.TOPIC_WRITE}
      variant="primary"
      mode="gradient"
      size="xs"
      leadingIcon={RiAddCircleLine}
      onClick={navigateToCreateTopicPage}
    >
      Create Topic
    </PermissionButton>
  );
};

// Table component similar to SubscriberListTable
const TopicListTable = (props: TopicListTableProps) => {
  const { children, orderBy, orderDirection, toggleSort, ...rest } = props;
  return (
    <Table {...rest}>
      <TableHeader>
        <TableRow>
          <TableHead>Topic</TableHead>
          <TableHead>Key</TableHead>
          <TableHead
            sortable
            sortDirection={orderBy === '_id' ? orderDirection : false}
            onSort={() => toggleSort('_id')}
          >
            Created at
          </TableHead>
          <TableHead
            sortable
            sortDirection={orderBy === 'updatedAt' ? orderDirection : false}
            onSort={() => toggleSort('updatedAt')}
          >
            Updated at
          </TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>{children}</TableBody>
    </Table>
  );
};

type TopicListFiltersProps = HTMLAttributes<HTMLDivElement> &
  Pick<TopicsUrlState, 'filterValues' | 'handleFiltersChange' | 'resetFilters'> & {
    isLoading?: boolean;
    isFetching?: boolean;
  };

type TopicListTableProps = HTMLAttributes<HTMLTableElement> & {
  toggleSort: ReturnType<typeof useTopicsUrlState>['toggleSort'];
  orderBy?: TopicsSortableColumn;
  orderDirection?: DirectionEnum;
};

export const TopicList = (props: TopicListProps) => {
  const { className, ...rest } = props;
  const [searchParams, setSearchParams] = useSearchParams();

  // Use the hook as the primary source for URL state - orderBy/orderDirection are likely within filterValues
  const { filterValues, handleFiltersChange, toggleSort, resetFilters } = useTopicsUrlState({});

  // Pagination state remains derived directly from URL for fetching
  const after = searchParams.get('after') || undefined;
  const before = searchParams.get('before') || undefined;
  const limit = 10; // Keep limit definition

  // Consolidate fetch parameters
  const fetchParams: TopicsFilter = {
    // Use values from the hook
    key: filterValues.key,
    name: filterValues.name,
    orderBy: filterValues.orderBy,
    orderDirection: filterValues.orderDirection,
    // Pagination params from URL
    after: after,
    before: before,
    limit: limit,
  };

  // Determine if filters are active based on hook values
  const areFiltersApplied = !!(filterValues.key || filterValues.name || before || after);

  const { data, isLoading, isFetching } = useFetchTopics(fetchParams, {
    meta: { errorMessage: 'Issue fetching topics' },
  });

  // Simplified Pagination Handlers
  const handleNext = useCallback(() => {
    if (data?.next) {
      setSearchParams((prev) => {
        prev.delete('before');
        prev.set('after', data.next as string);
        return prev;
      });
    }
  }, [data?.next, setSearchParams]);

  const handlePrevious = useCallback(() => {
    if (data?.previous) {
      setSearchParams((prev) => {
        prev.delete('after');
        prev.set('before', data.previous as string);
        return prev;
      });
    }
  }, [data?.previous, setSearchParams]);

  const handleFirst = useCallback(() => {
    setSearchParams((prev) => {
      prev.delete('before');
      prev.delete('after');
      return prev;
    });
  }, [setSearchParams]);

  // Define wrapper props once
  const wrapperProps = {
    filterValues,
    handleFiltersChange,
    resetFilters,
    isLoading: isLoading, // Pass loading state
    isFetching: isFetching, // Pass fetching state for spinner
    hasData: !!data?.data.length,
    areFiltersApplied,
    ...rest,
  };

  // Define table props once
  const tableProps = {
    orderBy: filterValues.orderBy, // Use state from hook via filterValues
    orderDirection: filterValues.orderDirection, // Use state from hook via filterValues
    toggleSort,
  };

  if (isLoading) {
    return (
      <TopicListWrapper {...wrapperProps}>
        <TopicListTable {...tableProps}>
          {Array.from({ length: limit }).map((_, index) => (
            <TopicRowSkeleton key={index} />
          ))}
        </TopicListTable>
      </TopicListWrapper>
    );
  }

  if (!areFiltersApplied && !data?.data.length) {
    return (
      <TopicListWrapper {...wrapperProps} showEmptyState={true}>
        <TopicListBlank />
      </TopicListWrapper>
    );
  }

  if (!data?.data.length) {
    return (
      <TopicListWrapper {...wrapperProps}>
        <ListNoResults
          title="No topics found"
          description="We couldn't find any topics that match your search criteria. Try adjusting your filters or create a new topic."
          onClearFilters={resetFilters}
        />
      </TopicListWrapper>
    );
  }

  return (
    <TopicListWrapper {...wrapperProps}>
      <TopicListTable {...tableProps}>
        {data.data.map((topic) => (
          <TopicRow key={topic._id} topic={topic} />
        ))}
      </TopicListTable>

      {!!(data.next || data.previous) && (
        <CursorPagination
          hasNext={!!data.next}
          hasPrevious={!!data.previous}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onFirst={handleFirst}
        />
      )}
    </TopicListWrapper>
  );
};

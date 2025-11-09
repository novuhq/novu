// Use pagination primitives from the dashboard project

import { DirectionEnum, PermissionsEnum } from '@novu/shared';
import { HTMLAttributes, useEffect } from 'react';
import { RiAddCircleLine } from 'react-icons/ri';
import { PermissionButton } from '@/components/primitives/permission-button';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/primitives/table';
import { TablePaginationFooter } from '@/components/primitives/table-pagination-footer';
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
  const { children, orderBy, orderDirection, toggleSort, paginationProps, ...rest } = props;
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
      {paginationProps && (
        <TableFooter>
          <TableRow>
            <TableCell colSpan={5} className="p-0">
              <TablePaginationFooter
                pageSize={paginationProps.limit}
                currentPageItemsCount={paginationProps.currentItemsCount}
                onPreviousPage={paginationProps.onPrevious}
                onNextPage={paginationProps.onNext}
                onPageSizeChange={paginationProps.onPageSizeChange}
                hasPreviousPage={paginationProps.hasPrevious}
                hasNextPage={paginationProps.hasNext}
                itemName="topics"
                totalCount={paginationProps.totalCount}
                totalCountCapped={paginationProps.totalCountCapped}
              />
            </TableCell>
          </TableRow>
        </TableFooter>
      )}
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
  paginationProps?: {
    hasNext: boolean;
    hasPrevious: boolean;
    onNext: () => void;
    onPrevious: () => void;
    limit: number;
    currentItemsCount: number;
    totalCount?: number;
    totalCountCapped?: boolean;
    onPageSizeChange: (newSize: number) => void;
  };
};

export const TopicList = (props: TopicListProps) => {
  const { ...rest } = props;

  // Use the hook as the primary source for URL state - orderBy/orderDirection are likely within filterValues
  const {
    filterValues,
    handleFiltersChange,
    toggleSort,
    resetFilters,
    handleNext,
    handlePrevious,
    handlePageSizeChange,
  } = useTopicsUrlState();

  // Get limit from filterValues, fallback to 10
  const limit = filterValues.limit || 10;

  // Consolidate fetch parameters
  const fetchParams: TopicsFilter = {
    // Use values from the hook
    key: filterValues.key,
    name: filterValues.name,
    orderBy: filterValues.orderBy,
    orderDirection: filterValues.orderDirection,
    // Pagination params from hook
    after: filterValues.after,
    before: filterValues.before,
    limit: limit,
  };

  // Determine if filters are active based on hook values
  const areFiltersApplied = !!(filterValues.key || filterValues.name || filterValues.before || filterValues.after);

  const { data, isLoading, isFetching } = useFetchTopics(fetchParams, {
    meta: { errorMessage: 'Issue fetching topics' },
  });

  // Update the URL state hook with the latest cursor values from the API response
  useEffect(() => {
    if (data?.next || data?.previous) {
      handleFiltersChange({
        ...(data.next && { nextCursor: data.next }),
        ...(data.previous && { previousCursor: data.previous }),
      });
    }
  }, [data, handleFiltersChange]);

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
    paginationProps: data
      ? {
          hasNext: !!data.next,
          hasPrevious: !!data.previous,
          onNext: handleNext,
          onPrevious: handlePrevious,
          limit,
          currentItemsCount: data.data.length,
          totalCount: data.totalCount,
          totalCountCapped: data.totalCountCapped,
          onPageSizeChange: handlePageSizeChange,
        }
      : undefined,
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
    </TopicListWrapper>
  );
};

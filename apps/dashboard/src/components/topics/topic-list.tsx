// Use pagination primitives from the dashboard project
import { CursorPagination } from '@/components/cursor-pagination';
import { Button } from '@/components/primitives/button';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/primitives/table';
import { useFetchTopics } from '@/hooks/use-fetch-topics';
import { cn } from '@/utils/ui';
import { DirectionEnum } from '@novu/shared';
import { HTMLAttributes, useEffect, useState } from 'react';
import { RiAddCircleLine } from 'react-icons/ri';
import { useTopicsNavigate } from './hooks/use-topics-navigate';
import { TopicsSortableColumn, TopicsUrlState, useTopicsUrlState } from './hooks/use-topics-url-state';
import { TopicListBlank } from './topic-list-blank';
import { TopicListNoResults } from './topic-list-no-results';
import { TopicRow, TopicRowSkeleton } from './topic-row';
import { TopicsFilters } from './topics-filters';

// Use type alias instead of interface for component props
type TopicListProps = HTMLAttributes<HTMLDivElement>;

// Wrapper similar to SubscriberListWrapper
const TopicListWrapper = (props: TopicListFiltersProps) => {
  const { className, children, filterValues, handleFiltersChange, resetFilters, isLoading, onLoadingChange, ...rest } =
    props;
  const { navigateToCreateTopicPage } = useTopicsNavigate();

  return (
    <div className={cn('flex flex-col p-2', className)} {...rest}>
      <div className="flex items-center justify-between">
        <TopicsFilters
          onFiltersChange={handleFiltersChange}
          filterValues={filterValues}
          onReset={resetFilters}
          isLoading={isLoading}
          onLoadingChange={onLoadingChange}
          className="py-2.5"
        />

        <Button
          variant="primary"
          mode="gradient"
          size="xs"
          leadingIcon={RiAddCircleLine}
          onClick={navigateToCreateTopicPage}
        >
          Create Topic
        </Button>
      </div>
      {children}
    </div>
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
    onLoadingChange?: (isLoading: boolean) => void;
  };

type TopicListTableProps = HTMLAttributes<HTMLTableElement> & {
  toggleSort: ReturnType<typeof useTopicsUrlState>['toggleSort'];
  orderBy?: TopicsSortableColumn;
  orderDirection?: DirectionEnum;
};

export const TopicList = (props: TopicListProps) => {
  const { className, ...rest } = props;
  const [nextPageAfter, setNextPageAfter] = useState<string | undefined>(undefined);
  const [previousPageBefore, setPreviousPageBefore] = useState<string | undefined>(undefined);
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const { filterValues, handleFiltersChange, toggleSort, resetFilters, handleNext, handlePrevious, handleFirst } =
    useTopicsUrlState({
      after: nextPageAfter,
      before: previousPageBefore,
    });

  // Check both key and name filters
  const areFiltersApplied = filterValues.key || filterValues.name || filterValues.before || filterValues.after;
  const limit = 10;

  const { data, isPending } = useFetchTopics(filterValues, {
    meta: { errorMessage: 'Issue fetching topics' },
  });

  // When data is loaded, clear the loading state
  useEffect(() => {
    if (!isPending && isFilterLoading) {
      setIsFilterLoading(false);
    }
  }, [isPending, isFilterLoading]);

  useEffect(() => {
    if (data?.next) {
      setNextPageAfter(data.next);
    }

    if (data?.previous) {
      setPreviousPageBefore(data.previous);
    }
  }, [data]);

  // Combine filter loading with API loading
  const isLoading = isPending || isFilterLoading;

  // Common wrapper props
  const wrapperProps = {
    filterValues,
    handleFiltersChange,
    resetFilters,
    isLoading,
    onLoadingChange: setIsFilterLoading,
    ...rest,
  };

  // Always render the same structure to avoid layout shifts
  return (
    <TopicListWrapper {...wrapperProps}>
      {isLoading ? (
        <TopicListTable
          orderBy={filterValues.orderBy}
          orderDirection={filterValues.orderDirection}
          toggleSort={toggleSort}
        >
          {new Array(limit).fill(0).map((_, index) => (
            <TopicRowSkeleton key={index} />
          ))}
        </TopicListTable>
      ) : !data?.data.length ? (
        !areFiltersApplied ? (
          <TopicListBlank />
        ) : (
          <TopicListNoResults />
        )
      ) : (
        <>
          <TopicListTable
            orderBy={filterValues.orderBy}
            orderDirection={filterValues.orderDirection}
            toggleSort={toggleSort}
          >
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
        </>
      )}
    </TopicListWrapper>
  );
};

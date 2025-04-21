// Use pagination primitives from the dashboard project
import { CursorPagination } from '@/components/cursor-pagination';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/primitives/table';
import { useFetchTopics } from '@/hooks/use-fetch-topics';
import { QueryKeys } from '@/utils/query-keys';
import { cn } from '@/utils/ui';
import { DirectionEnum } from '@novu/shared';
import { useQueryClient } from '@tanstack/react-query';
import { HTMLAttributes, useEffect, useState } from 'react';
import { CreateTopicButton } from './create-topic-drawer';
import { TopicsSortableColumn, TopicsUrlState, useTopicsUrlState } from './hooks/use-topics-url-state';
import { TopicListBlank } from './topic-list-blank';
import { TopicListNoResults } from './topic-list-no-results';
import { TopicRow, TopicRowSkeleton } from './topic-row';
import { TopicsFilters } from './topics-filters';

// Use type alias instead of interface for component props
type TopicListProps = HTMLAttributes<HTMLDivElement>;

// Wrapper similar to SubscriberListWrapper
const TopicListWrapper = (props: TopicListFiltersProps) => {
  const { className, children, filterValues, handleFiltersChange, resetFilters, ...rest } = props;
  const queryClient = useQueryClient();

  return (
    <div className={cn('flex flex-col p-2', className)} {...rest}>
      <div className="flex items-center justify-between">
        <TopicsFilters
          onFiltersChange={handleFiltersChange}
          filterValues={filterValues}
          onReset={resetFilters}
          className="py-2"
        />

        <CreateTopicButton
          onSuccess={() => {
            // Explicitly trigger a refetch of the topics list
            queryClient.invalidateQueries({
              queryKey: [QueryKeys.fetchTopics],
            });
          }}
        />
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
  Pick<TopicsUrlState, 'filterValues' | 'handleFiltersChange' | 'resetFilters'>;

type TopicListTableProps = HTMLAttributes<HTMLTableElement> & {
  toggleSort: ReturnType<typeof useTopicsUrlState>['toggleSort'];
  orderBy?: TopicsSortableColumn;
  orderDirection?: DirectionEnum;
};

export const TopicList = (props: TopicListProps) => {
  const { className, ...rest } = props;
  const [nextPageAfter, setNextPageAfter] = useState<string | undefined>(undefined);
  const [previousPageBefore, setPreviousPageBefore] = useState<string | undefined>(undefined);
  const { filterValues, handleFiltersChange, toggleSort, resetFilters, handleNext, handlePrevious, handleFirst } =
    useTopicsUrlState({
      after: nextPageAfter,
      before: previousPageBefore,
    });

  // Only check key filter now as we're focusing on filtering by key only
  const areFiltersApplied = filterValues.key || filterValues.before || filterValues.after;
  const limit = 10;

  const { data, isPending } = useFetchTopics(filterValues, {
    meta: { errorMessage: 'Issue fetching topics' },
  });

  useEffect(() => {
    if (data?.next) {
      setNextPageAfter(data.next);
    }

    if (data?.previous) {
      setPreviousPageBefore(data.previous);
    }
  }, [data]);

  if (isPending) {
    return (
      <TopicListWrapper
        filterValues={filterValues}
        handleFiltersChange={handleFiltersChange}
        resetFilters={resetFilters}
        {...rest}
      >
        <TopicListTable
          orderBy={filterValues.orderBy}
          orderDirection={filterValues.orderDirection}
          toggleSort={toggleSort}
        >
          {new Array(limit).fill(0).map((_, index) => (
            <TopicRowSkeleton key={index} />
          ))}
        </TopicListTable>
      </TopicListWrapper>
    );
  }

  if (!areFiltersApplied && !data?.data.length) {
    return (
      <TopicListWrapper
        filterValues={filterValues}
        handleFiltersChange={handleFiltersChange}
        resetFilters={resetFilters}
        {...rest}
      >
        <TopicListBlank />
      </TopicListWrapper>
    );
  }

  if (!data?.data.length) {
    return (
      <TopicListWrapper
        filterValues={filterValues}
        handleFiltersChange={handleFiltersChange}
        resetFilters={resetFilters}
        {...rest}
      >
        <TopicListNoResults />
      </TopicListWrapper>
    );
  }

  const firstTwoTopicsInternalIds = data.data.reduce<string[]>((acc, t) => {
    if (t._id) acc.push(t._id);
    return acc.length < 2 ? acc : acc.slice(0, 2);
  }, []);

  return (
    <TopicListWrapper
      filterValues={filterValues}
      handleFiltersChange={handleFiltersChange}
      resetFilters={resetFilters}
      {...rest}
    >
      <TopicListTable
        orderBy={filterValues.orderBy}
        orderDirection={filterValues.orderDirection}
        toggleSort={toggleSort}
      >
        {data.data.map((topic) => (
          <TopicRow
            key={topic._id}
            topic={topic}
            topicsCount={data.data.length}
            firstTwoTopicsInternalIds={firstTwoTopicsInternalIds}
          />
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

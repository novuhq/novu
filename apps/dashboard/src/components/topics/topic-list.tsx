// Use pagination primitives from the dashboard project
import { CursorPagination } from '@/components/cursor-pagination';
import { Button } from '@/components/primitives/button'; // For Add Topic button
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/primitives/table';
import { useFetchTopics } from '@/hooks/use-fetch-topics';
import { cn } from '@/utils/ui';
import { DirectionEnum } from '@novu/shared';
import { HTMLAttributes, useEffect, useState } from 'react';
import { RiHashtag } from 'react-icons/ri'; // Icon for Add Topic
import { useTopicsNavigate } from './hooks/use-topics-navigate';
import { TopicsFilter, TopicsSortableColumn, TopicsUrlState, useTopicsUrlState } from './hooks/use-topics-url-state';
import { TopicListBlank } from './topic-list-blank';
import { TopicListNoResults } from './topic-list-no-results';
import { TopicRow, TopicRowSkeleton } from './topic-row';
import { TopicsFilters } from './topics-filters';

// Use type alias instead of interface for component props
type TopicListProps = HTMLAttributes<HTMLDivElement>;

// Wrapper similar to SubscriberListWrapper
const TopicListWrapper = (props: TopicListFiltersProps) => {
  const { className, children, filterValues, handleFiltersChange, resetFilters, ...rest } = props;
  const { navigateToCreateTopicPage } = useTopicsNavigate();

  return (
    <div className={cn('flex flex-col p-2', className)} {...rest}>
      <div className="flex items-center justify-between">
        <TopicsFilters
          onFiltersChange={handleFiltersChange}
          filterValues={filterValues}
          onReset={resetFilters}
          className="py-2"
        />

        <Button
          mode="gradient"
          className="rounded-l-lg border-none px-1.5 py-2 text-white"
          variant="primary"
          size="xs"
          leadingIcon={RiHashtag}
          onClick={navigateToCreateTopicPage}
        >
          Add topic
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

  const filterStrings = ['name', 'key', 'before', 'after'];
  const areFiltersApplied = Object.keys(filterValues)
    .filter((key) => filterStrings.includes(key))
    .some((key) => filterValues[key as keyof TopicsFilter] !== '');

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

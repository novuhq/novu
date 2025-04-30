// Use pagination primitives from the dashboard project
import { CursorPagination } from '@/components/cursor-pagination';
import { Button } from '@/components/primitives/button';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/primitives/table';
import { useFetchTopics } from '@/hooks/use-fetch-topics';
import { cn } from '@/utils/ui';
import { DirectionEnum } from '@novu/shared';
import { HTMLAttributes, useCallback, useEffect, useState } from 'react';
import { RiAddCircleLine } from 'react-icons/ri';
import { useSearchParams } from 'react-router-dom';
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
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Read directly from URL params for data fetching
  const afterParam = searchParams.get('after') || '';
  const beforeParam = searchParams.get('before') || '';
  const keyParam = searchParams.get('key') || '';
  const nameParam = searchParams.get('name') || '';
  const orderByParam = (searchParams.get('orderBy') as TopicsSortableColumn) || '_id';
  const orderDirectionParam = (searchParams.get('orderDirection') as DirectionEnum) || DirectionEnum.DESC;

  // Create filter values from URL params
  const currentFilters: TopicsFilter = {
    after: afterParam || undefined,
    before: beforeParam || undefined,
    key: keyParam || undefined,
    name: nameParam || undefined,
    orderBy: orderByParam,
    orderDirection: orderDirectionParam,
    limit: 10,
  };

  // Get utility functions from the hook but pass empty objects since we're handling URL state directly
  const { filterValues, handleFiltersChange, toggleSort, resetFilters } = useTopicsUrlState({});

  const areFiltersApplied = keyParam || nameParam || beforeParam || afterParam;
  const limit = 10;

  // Use URL params directly for fetching data
  const { data, isPending } = useFetchTopics(currentFilters, {
    meta: { errorMessage: 'Issue fetching topics' },
  });

  useEffect(() => {
    if (!isPending && isFilterLoading) {
      setIsFilterLoading(false);
    }
  }, [isPending, isFilterLoading]);

  const isLoading = isPending || isFilterLoading;

  // Define our own navigation functions using direct URL param manipulation
  const handleNext = useCallback(() => {
    setSearchParams((prev) => {
      prev.delete('before');

      if (data?.next) {
        prev.set('after', data.next);
      }

      return prev;
    });
  }, [data?.next, setSearchParams]);

  const handlePrevious = useCallback(() => {
    setSearchParams((prev) => {
      prev.delete('after');

      if (data?.previous) {
        prev.set('before', data.previous);
      }

      return prev;
    });
  }, [data?.previous, setSearchParams]);

  const handleFirst = useCallback(() => {
    setSearchParams((prev) => {
      prev.delete('before');
      prev.delete('after');
      return prev;
    });
  }, [setSearchParams]);

  const wrapperProps = {
    filterValues,
    handleFiltersChange,
    resetFilters,
    isLoading,
    onLoadingChange: setIsFilterLoading,
    ...rest,
  };

  if (isLoading) {
    return (
      <TopicListWrapper {...wrapperProps}>
        <TopicListTable
          orderBy={currentFilters.orderBy}
          orderDirection={currentFilters.orderDirection}
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
      <TopicListWrapper {...wrapperProps}>
        <TopicListBlank />
      </TopicListWrapper>
    );
  }

  if (!data?.data.length) {
    return (
      <TopicListWrapper {...wrapperProps}>
        <TopicListNoResults />
      </TopicListWrapper>
    );
  }

  return (
    <TopicListWrapper {...wrapperProps}>
      <TopicListTable
        orderBy={currentFilters.orderBy}
        orderDirection={currentFilters.orderDirection}
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
    </TopicListWrapper>
  );
};

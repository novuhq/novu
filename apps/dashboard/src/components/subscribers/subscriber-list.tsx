import { CursorPagination } from '@/components/cursor-pagination';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/primitives/table';
import { SubscriberListBlank } from '@/components/subscribers/subscriber-list-blank';
import { SubscriberListNoResults } from '@/components/subscribers/subscriber-list-no-results';
import { SubscriberRow, SubscriberRowSkeleton } from '@/components/subscribers/subscriber-row';
import { SubscribersFilters } from '@/components/subscribers/subscribers-filters';
import { useFetchSubscribers } from '@/hooks/use-fetch-subscribers';
import {
  SubscribersFilter,
  SubscribersSortableColumn,
  SubscribersUrlState,
  useSubscribersUrlState,
} from '@/hooks/use-subscribers-url-state';
import { cn } from '@/utils/ui';
import { DirectionEnum } from '@novu/shared';
import { HTMLAttributes, useEffect, useState } from 'react';

type SubscriberListFiltersProps = HTMLAttributes<HTMLDivElement> &
  Pick<SubscribersUrlState, 'filterValues' | 'handleFiltersChange' | 'resetFilters'>;

const SubscriberListWrapper = (props: SubscriberListFiltersProps) => {
  const { className, children, filterValues, handleFiltersChange, resetFilters, ...rest } = props;

  return (
    <div className={cn('flex h-full flex-col p-2', className)} {...rest}>
      <SubscribersFilters
        onFiltersChange={handleFiltersChange}
        filterValues={filterValues}
        onReset={resetFilters}
        className="py-2"
      />
      {children}
    </div>
  );
};

type SubscriberListTableProps = HTMLAttributes<HTMLTableElement> & {
  toggleSort: ReturnType<typeof useSubscribersUrlState>['toggleSort'];
  orderBy?: SubscribersSortableColumn;
  orderDirection?: DirectionEnum;
};
const SubscriberListTable = (props: SubscriberListTableProps) => {
  const { children, orderBy, orderDirection, toggleSort, ...rest } = props;
  return (
    <Table {...rest}>
      <TableHeader>
        <TableRow>
          <TableHead>Subscriber</TableHead>
          <TableHead>Email address</TableHead>
          <TableHead>Phone number</TableHead>
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

type SubscriberListProps = HTMLAttributes<HTMLDivElement>;

export const SubscriberList = (props: SubscriberListProps) => {
  const { className, ...rest } = props;
  const [nextPageAfter, setNextPageAfter] = useState<string | undefined>(undefined);
  const [previousPageBefore, setPreviousPageBefore] = useState<string | undefined>(undefined);
  const { filterValues, handleFiltersChange, toggleSort, resetFilters, handleNext, handlePrevious, handleFirst } =
    useSubscribersUrlState({
      debounceMs: 300,
      after: nextPageAfter,
      before: previousPageBefore,
    });
  const areFiltersApplied = (Object.keys(filterValues) as (keyof SubscribersFilter)[]).some(
    (key) => ['email', 'phone', 'name', 'subscriberId', 'before', 'after'].includes(key) && filterValues[key] !== ''
  );
  const limit = 10;

  const { data, isPending } = useFetchSubscribers(filterValues, {
    meta: { errorMessage: 'Issue fetching subscribers' },
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
      <SubscriberListWrapper
        filterValues={filterValues}
        handleFiltersChange={handleFiltersChange}
        resetFilters={resetFilters}
        {...rest}
      >
        <SubscriberListTable
          orderBy={filterValues.orderBy}
          orderDirection={filterValues.orderDirection}
          toggleSort={toggleSort}
        >
          {new Array(limit).fill(0).map((_, index) => (
            <SubscriberRowSkeleton key={index} />
          ))}
        </SubscriberListTable>
      </SubscriberListWrapper>
    );
  }

  if (!areFiltersApplied && !data?.data.length) {
    return (
      <SubscriberListWrapper
        filterValues={filterValues}
        handleFiltersChange={handleFiltersChange}
        resetFilters={resetFilters}
        {...rest}
      >
        <SubscriberListBlank />
      </SubscriberListWrapper>
    );
  }

  if (!data?.data.length) {
    return (
      <SubscriberListWrapper
        filterValues={filterValues}
        handleFiltersChange={handleFiltersChange}
        resetFilters={resetFilters}
        {...rest}
      >
        <SubscriberListNoResults />
      </SubscriberListWrapper>
    );
  }

  return (
    <SubscriberListWrapper
      filterValues={filterValues}
      handleFiltersChange={handleFiltersChange}
      resetFilters={resetFilters}
      {...rest}
    >
      <SubscriberListTable
        orderBy={filterValues.orderBy}
        orderDirection={filterValues.orderDirection}
        toggleSort={toggleSort}
      >
        {data.data.map((subscriber) => (
          <SubscriberRow key={subscriber.subscriberId} subscriber={subscriber} />
        ))}
      </SubscriberListTable>

      {!!(data.next || data.previous) && (
        <CursorPagination
          hasNext={!!data.next}
          hasPrevious={!!data.previous}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onFirst={handleFirst}
        />
      )}
    </SubscriberListWrapper>
  );
};

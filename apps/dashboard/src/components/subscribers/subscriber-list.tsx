import { DirectionEnum, PermissionsEnum } from '@novu/shared';
import { HTMLAttributes, useEffect, useState } from 'react';
import { RiUserSharedLine } from 'react-icons/ri';
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
import { useSubscribersNavigate } from '@/components/subscribers/hooks/use-subscribers-navigate';
import {
  SubscribersFilter,
  SubscribersSortableColumn,
  SubscribersUrlState,
  useSubscribersUrlState,
} from '@/components/subscribers/hooks/use-subscribers-url-state';
import { SubscriberListBlank } from '@/components/subscribers/subscriber-list-blank';
import { SubscriberRow, SubscriberRowSkeleton } from '@/components/subscribers/subscriber-row';
import { SubscribersFilters } from '@/components/subscribers/subscribers-filters';
import { useFetchSubscribers } from '@/hooks/use-fetch-subscribers';
import { cn } from '@/utils/ui';
import { ListNoResults } from '../list-no-results';

type SubscriberListFiltersProps = HTMLAttributes<HTMLDivElement> &
  Pick<SubscribersUrlState, 'filterValues' | 'handleFiltersChange' | 'resetFilters'> & {
    isFetching?: boolean;
  };

const SubscriberListWrapper = (props: SubscriberListFiltersProps) => {
  const { className, children, filterValues, handleFiltersChange, resetFilters, isFetching, ...rest } = props;
  const { navigateToCreateSubscriberPage } = useSubscribersNavigate();

  return (
    <div className={cn('flex h-full flex-col', className)} {...rest}>
      <div className="flex items-center justify-between">
        <SubscribersFilters
          onFiltersChange={handleFiltersChange}
          filterValues={filterValues}
          onReset={resetFilters}
          isFetching={isFetching}
          className="py-2.5"
        />
        <PermissionButton
          permission={PermissionsEnum.SUBSCRIBER_WRITE}
          mode="gradient"
          className="rounded-l-lg border-none text-white"
          variant="primary"
          size="xs"
          leadingIcon={RiUserSharedLine}
          onClick={navigateToCreateSubscriberPage}
        >
          Add subscriber
        </PermissionButton>
      </div>
      {children}
    </div>
  );
};

type SubscriberListTableProps = HTMLAttributes<HTMLTableElement> & {
  toggleSort: ReturnType<typeof useSubscribersUrlState>['toggleSort'];
  orderBy?: SubscribersSortableColumn;
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

const SubscriberListTable = (props: SubscriberListTableProps) => {
  const { children, orderBy, orderDirection, toggleSort, paginationProps, ...rest } = props;
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
      {paginationProps && (
        <TableFooter>
          <TableRow>
            <TableCell colSpan={6} className="p-0">
              <TablePaginationFooter
                pageSize={paginationProps.limit}
                currentPageItemsCount={paginationProps.currentItemsCount}
                onPreviousPage={paginationProps.onPrevious}
                onNextPage={paginationProps.onNext}
                onPageSizeChange={paginationProps.onPageSizeChange}
                hasPreviousPage={paginationProps.hasPrevious}
                hasNextPage={paginationProps.hasNext}
                itemName="subscribers"
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

type SubscriberListProps = HTMLAttributes<HTMLDivElement>;

export const SubscriberList = (props: SubscriberListProps) => {
  const { ...rest } = props;
  const [nextPageAfter, setNextPageAfter] = useState<string | undefined>(undefined);
  const [previousPageBefore, setPreviousPageBefore] = useState<string | undefined>(undefined);
  const {
    filterValues,
    handleFiltersChange,
    toggleSort,
    resetFilters,
    handleNext,
    handlePrevious,
    handlePageSizeChange,
  } = useSubscribersUrlState({
    after: nextPageAfter,
    before: previousPageBefore,
  });
  const areFiltersApplied = (Object.keys(filterValues) as (keyof SubscribersFilter)[]).some(
    (key) => ['email', 'phone', 'name', 'subscriberId', 'before', 'after'].includes(key) && filterValues[key] !== ''
  );
  const limit = filterValues.limit || 10;

  const { data, isPending, isFetching } = useFetchSubscribers(filterValues, {
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
        isFetching={isFetching}
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
        isFetching={isFetching}
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
        isFetching={isFetching}
        {...rest}
      >
        <ListNoResults
          title="No subscribers found"
          description="We couldn't find any subscribers that match your search criteria. Try adjusting your filters or import subscribers via API."
          onClearFilters={resetFilters}
        />
      </SubscriberListWrapper>
    );
  }

  const firstTwoSubscribersInternalIds = data.data.reduce<string[]>((acc, s) => {
    if (s._id) acc.push(s._id);
    return acc.length < 2 ? acc : acc.slice(0, 2);
  }, []);

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
        paginationProps={{
          hasNext: !!data.next,
          hasPrevious: !!data.previous,
          onNext: handleNext,
          onPrevious: handlePrevious,
          limit,
          currentItemsCount: data.data.length,
          totalCount: data.totalCount,
          totalCountCapped: data.totalCountCapped,
          onPageSizeChange: handlePageSizeChange,
        }}
      >
        {data.data.map((subscriber) => (
          <SubscriberRow
            key={subscriber._id}
            subscriber={subscriber}
            subscribersCount={data.data.length}
            firstTwoSubscribersInternalIds={firstTwoSubscribersInternalIds}
          />
        ))}
      </SubscriberListTable>
    </SubscriberListWrapper>
  );
};

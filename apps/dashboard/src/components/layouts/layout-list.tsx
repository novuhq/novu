import { ApiServiceLevelEnum, DirectionEnum } from '@novu/shared';
import { HTMLAttributes } from 'react';
import {
  LayoutsFilter,
  LayoutsSortableColumn,
  LayoutsUrlState,
  useLayoutsUrlState,
} from '@/components/layouts/hooks/use-layouts-url-state';
import { LayoutListBlank } from '@/components/layouts/layout-list-blank';
import { LayoutRow, LayoutRowSkeleton } from '@/components/layouts/layout-row';
import { LayoutsFilters } from '@/components/layouts/layouts-filters';
import { ListNoResults } from '@/components/list-no-results';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/primitives/table';
import { useFetchLayouts } from '@/hooks/use-fetch-layouts';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { cn } from '@/utils/ui';
import { DefaultPagination } from '../default-pagination';
import { Skeleton } from '../primitives/skeleton';
import { CreateLayoutButton } from './create-layout-btn';
import { LayoutsListUpgradeCta } from './layouts-list-upgrade-cta';

type LayoutListFiltersProps = HTMLAttributes<HTMLDivElement> &
  Pick<LayoutsUrlState, 'filterValues' | 'handleFiltersChange' | 'resetFilters'> & {
    isFetching?: boolean;
  };

const LayoutListWrapper = (props: LayoutListFiltersProps) => {
  const { className, children, filterValues, handleFiltersChange, resetFilters, isFetching, ...rest } = props;

  return (
    <div className={cn('flex h-full flex-col', className)} {...rest}>
      <div className="flex items-center justify-between">
        <LayoutsFilters
          onFiltersChange={handleFiltersChange}
          filterValues={filterValues}
          onReset={resetFilters}
          isFetching={isFetching}
          className="py-2.5"
        />
        <CreateLayoutButton disabled={isFetching} />
      </div>
      {children}
    </div>
  );
};

type LayoutListTableProps = HTMLAttributes<HTMLTableElement> & {
  toggleSort: ReturnType<typeof useLayoutsUrlState>['toggleSort'];
  hrefFromOffset: ReturnType<typeof useLayoutsUrlState>['hrefFromOffset'];
  orderBy: LayoutsSortableColumn;
  orderDirection?: DirectionEnum;
  limit: number;
  offset: number;
  hasData: boolean;
  totalCount: number;
  currentPage: number;
  totalPages: number;
};

const LayoutListTable = (props: LayoutListTableProps) => {
  const {
    toggleSort,
    hrefFromOffset,
    children,
    orderBy,
    orderDirection,
    limit,
    offset,
    hasData,
    totalCount,
    currentPage,
    totalPages,
    ...rest
  } = props;

  return (
    <Table {...rest}>
      <TableHeader>
        <TableRow>
          <TableHead
            sortable
            sortDirection={orderBy === 'name' ? orderDirection : false}
            onSort={() => toggleSort('name')}
          >
            Layout
          </TableHead>
          <TableHead
            sortable
            sortDirection={orderBy === 'createdAt' ? orderDirection : false}
            onSort={() => toggleSort('createdAt')}
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
      {hasData && limit < totalCount && (
        <TableFooter>
          <TableRow>
            <TableCell colSpan={5}>
              <div className="flex items-center justify-between">
                {hasData ? (
                  <span className="text-foreground-600 block text-sm font-normal">
                    Page {currentPage} of {totalPages}
                  </span>
                ) : (
                  <Skeleton className="h-5 w-[20ch]" />
                )}
                {hasData ? (
                  <DefaultPagination
                    hrefFromOffset={hrefFromOffset}
                    totalCount={totalCount}
                    limit={limit}
                    offset={offset}
                  />
                ) : (
                  <Skeleton className="h-5 w-32" />
                )}
              </div>
            </TableCell>
          </TableRow>
        </TableFooter>
      )}
    </Table>
  );
};

type LayoutListProps = HTMLAttributes<HTMLDivElement>;

export const LayoutList = (props: LayoutListProps) => {
  const { filterValues, hrefFromOffset, handleFiltersChange, toggleSort, resetFilters } = useLayoutsUrlState();
  const areFiltersApplied = (Object.keys(filterValues) as (keyof LayoutsFilter)[]).some(
    (key) => ['query', 'before', 'after'].includes(key) && filterValues[key] !== ''
  );

  const { data, isPending, isFetching } = useFetchLayouts({
    limit: filterValues.limit,
    offset: filterValues.offset,
    orderBy: filterValues.orderBy,
    orderDirection: filterValues.orderDirection,
    query: filterValues.query,
  });

  const { subscription } = useFetchSubscription();
  const tier = subscription?.apiServiceLevel || ApiServiceLevelEnum.FREE;

  const currentPage = Math.floor(filterValues.offset / filterValues.limit) + 1;
  const totalPages = Math.ceil((data?.totalCount || 0) / filterValues.limit);

  if (isPending) {
    return (
      <LayoutListWrapper
        filterValues={filterValues}
        handleFiltersChange={handleFiltersChange}
        resetFilters={resetFilters}
        isFetching={isFetching}
        {...props}
      >
        <LayoutListTable
          orderBy={filterValues.orderBy}
          orderDirection={filterValues.orderDirection}
          toggleSort={toggleSort}
          hrefFromOffset={hrefFromOffset}
          limit={12}
          totalCount={0}
          currentPage={1}
          totalPages={1}
          hasData={false}
          offset={0}
        >
          {new Array(12).fill(0).map((_, index) => (
            <LayoutRowSkeleton key={index} />
          ))}
        </LayoutListTable>
      </LayoutListWrapper>
    );
  }

  if (tier === ApiServiceLevelEnum.FREE && data?.layouts.length === 1) {
    return <LayoutsListUpgradeCta />;
  }

  if (!areFiltersApplied && !data?.layouts.length) {
    return (
      <LayoutListWrapper
        filterValues={filterValues}
        handleFiltersChange={handleFiltersChange}
        resetFilters={resetFilters}
        isFetching={isFetching}
        {...props}
      >
        <LayoutListBlank />
      </LayoutListWrapper>
    );
  }

  if (!data?.layouts.length) {
    return (
      <LayoutListWrapper
        filterValues={filterValues}
        handleFiltersChange={handleFiltersChange}
        resetFilters={resetFilters}
        isFetching={isFetching}
        {...props}
      >
        <ListNoResults
          title="No layouts found"
          description="We couldn't find any layouts that match your search criteria. Try adjusting your filters or create a new layout."
          onClearFilters={resetFilters}
        />
      </LayoutListWrapper>
    );
  }

  return (
    <LayoutListWrapper
      filterValues={filterValues}
      handleFiltersChange={handleFiltersChange}
      resetFilters={resetFilters}
      {...props}
    >
      <LayoutListTable
        orderBy={filterValues.orderBy}
        orderDirection={filterValues.orderDirection}
        toggleSort={toggleSort}
        hrefFromOffset={hrefFromOffset}
        limit={filterValues.limit}
        totalCount={data.totalCount}
        currentPage={currentPage}
        totalPages={totalPages}
        offset={filterValues.offset}
        hasData={!!data.layouts.length}
      >
        {data.layouts.map((layout) => (
          <LayoutRow key={layout._id} layout={layout} />
        ))}
      </LayoutListTable>
    </LayoutListWrapper>
  );
};

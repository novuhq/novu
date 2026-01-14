import { ApiServiceLevelEnum, DirectionEnum } from '@novu/shared';
import { HTMLAttributes } from 'react';
import {
  LayoutsFilter,
  LayoutsSortableColumn,
  LayoutsUrlState,
  useLayoutsUrlState,
} from '@/components/layouts/hooks/use-layouts-url-state';
import { usePersistedPageSize } from '@/hooks/use-persisted-page-size';

const LAYOUTS_TABLE_ID = 'layouts-list';

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
import { TablePaginationFooter } from '@/components/primitives/table-pagination-footer';
import { useFetchLayouts } from '@/hooks/use-fetch-layouts';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { cn } from '@/utils/ui';
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
  orderBy: LayoutsSortableColumn;
  orderDirection?: DirectionEnum;
  paginationProps?: {
    pageSize: number;
    currentPageItemsCount: number;
    onPreviousPage: () => void;
    onNextPage: () => void;
    onPageSizeChange: (pageSize: number) => void;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
    totalCount?: number;
  };
};

const LayoutListTable = (props: LayoutListTableProps) => {
  const { toggleSort, children, orderBy, orderDirection, paginationProps, ...rest } = props;

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
      {paginationProps && (
        <TableFooter>
          <TableRow>
            <TableCell colSpan={4} className="p-0">
              <TablePaginationFooter
                pageSize={paginationProps.pageSize}
                currentPageItemsCount={paginationProps.currentPageItemsCount}
                onPreviousPage={paginationProps.onPreviousPage}
                onNextPage={paginationProps.onNextPage}
                onPageSizeChange={paginationProps.onPageSizeChange}
                hasPreviousPage={paginationProps.hasPreviousPage}
                hasNextPage={paginationProps.hasNextPage}
                itemName="layouts"
                totalCount={paginationProps.totalCount}
              />
            </TableCell>
          </TableRow>
        </TableFooter>
      )}
    </Table>
  );
};

type LayoutListProps = HTMLAttributes<HTMLDivElement>;

export const LayoutList = (props: LayoutListProps) => {
  const { filterValues, handleFiltersChange, toggleSort, resetFilters } = useLayoutsUrlState();
  const { setPageSize: setPersistedPageSize } = usePersistedPageSize({
    tableId: LAYOUTS_TABLE_ID,
    defaultPageSize: 10,
  });
  const areFiltersApplied = (Object.keys(filterValues) as (keyof LayoutsFilter)[]).some(
    (key) => ['query'].includes(key) && filterValues[key] !== ''
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

  const handlePreviousPage = () => {
    const newOffset = Math.max(0, filterValues.offset - filterValues.limit);
    handleFiltersChange({ offset: newOffset });
  };

  const handleNextPage = () => {
    const newOffset = filterValues.offset + filterValues.limit;
    handleFiltersChange({ offset: newOffset });
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPersistedPageSize(newPageSize);
    handleFiltersChange({
      limit: newPageSize,
      offset: 0,
    });
  };

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
        >
          {new Array(10).fill(0).map((_, index) => (
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
        paginationProps={{
          pageSize: filterValues.limit,
          currentPageItemsCount: data.layouts.length,
          onPreviousPage: handlePreviousPage,
          onNextPage: handleNextPage,
          onPageSizeChange: handlePageSizeChange,
          hasPreviousPage: filterValues.offset > 0,
          hasNextPage: currentPage < totalPages,
          totalCount: data.totalCount,
        }}
      >
        {data.layouts.map((layout) => (
          <LayoutRow key={layout._id} layout={layout} />
        ))}
      </LayoutListTable>
    </LayoutListWrapper>
  );
};

import { HTMLAttributes, useEffect, useState } from 'react';
import { RiAddCircleLine } from 'react-icons/ri';
import { DirectionEnum, PermissionsEnum } from '@novu/shared';

import { cn } from '@/utils/ui';
import { CursorPagination } from '@/components/cursor-pagination';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/primitives/table';
import {
  LayoutsFilter,
  LayoutsSortableColumn,
  LayoutsUrlState,
  useLayoutsUrlState,
} from '@/components/layouts/hooks/use-layouts-url-state';
import { LayoutListBlank } from '@/components/layouts/layout-list-blank';
import { ListNoResults } from '@/components/list-no-results';
import { LayoutRow, LayoutRowSkeleton } from '@/components/layouts/layout-row';
import { LayoutsFilters } from '@/components/layouts/layouts-filters';
import { useFetchLayouts } from '@/hooks/use-fetch-layouts';
import { PermissionButton } from '@/components/primitives/permission-button';

type LayoutListFiltersProps = HTMLAttributes<HTMLDivElement> &
  Pick<LayoutsUrlState, 'filterValues' | 'handleFiltersChange' | 'resetFilters'> & {
    isFetching?: boolean;
  };

const LayoutListWrapper = (props: LayoutListFiltersProps) => {
  const { className, children, filterValues, handleFiltersChange, resetFilters, isFetching, ...rest } = props;

  return (
    <div className={cn('flex h-full flex-col p-2', className)} {...rest}>
      <div className="flex items-center justify-between">
        <LayoutsFilters
          onFiltersChange={handleFiltersChange}
          filterValues={filterValues}
          onReset={resetFilters}
          isFetching={isFetching}
          className="py-2.5"
        />
        <PermissionButton
          permission={PermissionsEnum.WORKFLOW_WRITE}
          mode="gradient"
          className="rounded-l-lg border-none px-1.5 py-2 text-white"
          variant="primary"
          size="xs"
          leadingIcon={RiAddCircleLine}
          onClick={() => {
            // TODO: Implement create layout drawer
          }}
        >
          Create layout
        </PermissionButton>
      </div>
      {children}
    </div>
  );
};

type LayoutListTableProps = HTMLAttributes<HTMLTableElement> & {
  toggleSort: ReturnType<typeof useLayoutsUrlState>['toggleSort'];
  orderBy?: LayoutsSortableColumn;
  orderDirection?: DirectionEnum;
};

const LayoutListTable = (props: LayoutListTableProps) => {
  const { children, orderBy, orderDirection, toggleSort, ...rest } = props;
  return (
    <Table {...rest}>
      <TableHeader>
        <TableRow>
          <TableHead>Layout</TableHead>
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
    </Table>
  );
};

type LayoutListProps = HTMLAttributes<HTMLDivElement>;

export const LayoutList = (props: LayoutListProps) => {
  const [nextPageAfter, setNextPageAfter] = useState<string | undefined>(undefined);
  const [previousPageBefore, setPreviousPageBefore] = useState<string | undefined>(undefined);
  const { filterValues, handleFiltersChange, toggleSort, resetFilters, handleNext, handlePrevious, handleFirst } =
    useLayoutsUrlState({
      after: nextPageAfter,
      before: previousPageBefore,
    });
  const areFiltersApplied = (Object.keys(filterValues) as (keyof LayoutsFilter)[]).some(
    (key) => ['query', 'before', 'after'].includes(key) && filterValues[key] !== ''
  );
  const limit = 10;

  const { data, isPending, isFetching } = useFetchLayouts(filterValues);

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
          {new Array(limit).fill(0).map((_, index) => (
            <LayoutRowSkeleton key={index} />
          ))}
        </LayoutListTable>
      </LayoutListWrapper>
    );
  }

  if (!areFiltersApplied && !data?.data.length) {
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

  if (!data?.data.length) {
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
      >
        {data.data.map((layout) => (
          <LayoutRow key={layout._id} layout={layout} />
        ))}
      </LayoutListTable>

      {!!(data.next || data.previous) && (
        <CursorPagination
          hasNext={!!data.next}
          hasPrevious={!!data.previous}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onFirst={handleFirst}
        />
      )}
    </LayoutListWrapper>
  );
};

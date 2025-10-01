import { DirectionEnum, PermissionsEnum } from '@novu/shared';
import { HTMLAttributes, useEffect } from 'react';
import { RiAddCircleLine } from 'react-icons/ri';
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
import { useFetchContexts } from '@/hooks/use-fetch-contexts';
import { cn } from '@/utils/ui';
import { ListNoResults } from '../list-no-results';
import { PermissionButton } from '../primitives/permission-button';
import { ContextListBlank } from './context-list-blank';
import { ContextRow, ContextRowSkeleton } from './context-row';
import { ContextsFilters } from './contexts-filters';
import { useContextsNavigate } from './hooks/use-contexts-navigate';
import { ContextsSortableColumn, ContextsUrlState, useContextsUrlState } from './hooks/use-contexts-url-state';

type ContextListProps = HTMLAttributes<HTMLDivElement>;

const ContextListWrapper = ({
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
}: ContextListFiltersProps & { hasData?: boolean; areFiltersApplied?: boolean; showEmptyState?: boolean }) => {
  return (
    <div className={cn('flex h-full flex-col', showEmptyState && 'h-[calc(100vh-100px)]', className)} {...rest}>
      <div className="flex items-center justify-between">
        {isLoading || hasData || areFiltersApplied ? (
          <ContextsFilters
            onFiltersChange={handleFiltersChange}
            filterValues={filterValues}
            onReset={resetFilters}
            isLoading={isLoading}
            isFetching={isFetching}
            className="py-2.5"
          />
        ) : (
          <div />
        )}
        {!showEmptyState && <CreateContextButton />}
      </div>
      {children}
    </div>
  );
};

const ContextListTable = ({
  children,
  orderBy,
  orderDirection,
  toggleSort,
  paginationProps,
  ...rest
}: ContextListTableProps) => {
  return (
    <Table {...rest}>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>ID</TableHead>
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
            <TableCell colSpan={5} className="p-0">
              <TablePaginationFooter
                pageSize={paginationProps.limit}
                currentPageItemsCount={paginationProps.currentItemsCount}
                onPreviousPage={paginationProps.onPrevious}
                onNextPage={paginationProps.onNext}
                onPageSizeChange={paginationProps.onPageSizeChange}
                hasPreviousPage={paginationProps.hasPrevious}
                hasNextPage={paginationProps.hasNext}
                itemName="contexts"
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

type ContextListFiltersProps = HTMLAttributes<HTMLDivElement> &
  Pick<ContextsUrlState, 'filterValues' | 'handleFiltersChange' | 'resetFilters'> & {
    isLoading?: boolean;
    isFetching?: boolean;
  };

type ContextListTableProps = HTMLAttributes<HTMLTableElement> & {
  toggleSort: ReturnType<typeof useContextsUrlState>['toggleSort'];
  orderBy?: ContextsSortableColumn;
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

export const ContextList = (props: ContextListProps) => {
  const { ...rest } = props;

  const {
    filterValues,
    handleFiltersChange,
    toggleSort,
    resetFilters,
    handleNext,
    handlePrevious,
    handlePageSizeChange,
  } = useContextsUrlState();

  const limit = filterValues.limit || 10;
  const areFiltersApplied = !!(filterValues.search || filterValues.before || filterValues.after);

  const { data, isLoading, isFetching } = useFetchContexts(
    {
      search: filterValues.search,
      orderBy: filterValues.orderBy,
      orderDirection: filterValues.orderDirection,
      after: filterValues.after,
      before: filterValues.before,
      limit,
    },
    {
      meta: { errorMessage: 'Issue fetching contexts' },
    }
  );

  // Update the URL state hook with the latest cursor values from the API response
  useEffect(() => {
    if (data?.next || data?.previous) {
      handleFiltersChange({
        ...(data.next && { nextCursor: data.next }),
        ...(data.previous && { previousCursor: data.previous }),
      });
    }
  }, [data, handleFiltersChange]);

  const hasData = !!data?.data.length;
  const paginationProps = data
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
    : undefined;

  if (isLoading) {
    return (
      <ContextListWrapper
        filterValues={filterValues}
        handleFiltersChange={handleFiltersChange}
        resetFilters={resetFilters}
        isLoading={isLoading}
        isFetching={isFetching}
        hasData={hasData}
        areFiltersApplied={areFiltersApplied}
        {...rest}
      >
        <ContextListTable
          orderBy={filterValues.orderBy}
          orderDirection={filterValues.orderDirection}
          toggleSort={toggleSort}
          paginationProps={paginationProps}
        >
          {Array.from({ length: limit }).map((_, index) => (
            <ContextRowSkeleton key={index} />
          ))}
        </ContextListTable>
      </ContextListWrapper>
    );
  }

  if (!areFiltersApplied && !hasData) {
    return (
      <ContextListWrapper
        filterValues={filterValues}
        handleFiltersChange={handleFiltersChange}
        resetFilters={resetFilters}
        isLoading={isLoading}
        isFetching={isFetching}
        hasData={hasData}
        areFiltersApplied={areFiltersApplied}
        showEmptyState={true}
        {...rest}
      >
        <ContextListBlank />
      </ContextListWrapper>
    );
  }

  if (!hasData) {
    return (
      <ContextListWrapper
        filterValues={filterValues}
        handleFiltersChange={handleFiltersChange}
        resetFilters={resetFilters}
        isLoading={isLoading}
        isFetching={isFetching}
        hasData={hasData}
        areFiltersApplied={areFiltersApplied}
        {...rest}
      >
        <ListNoResults
          title="No contexts found"
          description="We couldn't find any contexts that match your search criteria. Try adjusting your filters."
          onClearFilters={resetFilters}
        />
      </ContextListWrapper>
    );
  }

  return (
    <ContextListWrapper
      filterValues={filterValues}
      handleFiltersChange={handleFiltersChange}
      resetFilters={resetFilters}
      isLoading={isLoading}
      isFetching={isFetching}
      hasData={hasData}
      areFiltersApplied={areFiltersApplied}
      {...rest}
    >
      <ContextListTable
        orderBy={filterValues.orderBy}
        orderDirection={filterValues.orderDirection}
        toggleSort={toggleSort}
        paginationProps={paginationProps}
      >
        {data.data.map((context) => (
          <ContextRow key={`${context.type}-${context.id}`} context={context} />
        ))}
      </ContextListTable>
    </ContextListWrapper>
  );
};

export const CreateContextButton = () => {
  const { navigateToCreateContextPage } = useContextsNavigate();

  return (
    <PermissionButton
      permission={PermissionsEnum.WORKFLOW_WRITE}
      variant="primary"
      mode="gradient"
      size="xs"
      leadingIcon={RiAddCircleLine}
      onClick={navigateToCreateContextPage}
    >
      Create context
    </PermissionButton>
  );
};

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
import {
  ContextsFilter,
  ContextsSortableColumn,
  ContextsUrlState,
  useContextsUrlState,
} from './hooks/use-contexts-url-state';

// Use type alias instead of interface for component props
type ContextListProps = HTMLAttributes<HTMLDivElement>;

// Wrapper similar to TopicListWrapper
const ContextListWrapper = (
  props: ContextListFiltersProps & { hasData?: boolean; areFiltersApplied?: boolean; showEmptyState?: boolean }
) => {
  const {
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
  } = props;
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
          <div /> // Empty div placeholder to maintain layout
        )}
      </div>
      {children}
    </div>
  );
};

// Table component similar to TopicListTable
const ContextListTable = (props: ContextListTableProps) => {
  const { children, orderBy, orderDirection, toggleSort, paginationProps, ...rest } = props;
  return (
    <Table {...rest}>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Type</TableHead>
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

  // Use the hook as the primary source for URL state
  const {
    filterValues,
    handleFiltersChange,
    toggleSort,
    resetFilters,
    handleNext,
    handlePrevious,
    handlePageSizeChange,
  } = useContextsUrlState();

  // Get limit from filterValues, fallback to 10
  const limit = filterValues.limit || 10;

  // Consolidate fetch parameters
  const fetchParams: ContextsFilter = {
    // Use values from the hook
    search: filterValues.search,
    orderBy: filterValues.orderBy,
    orderDirection: filterValues.orderDirection,
    // Pagination params from hook
    after: filterValues.after,
    before: filterValues.before,
    limit: limit,
  };

  // Determine if filters are active based on hook values
  const areFiltersApplied = !!(filterValues.search || filterValues.before || filterValues.after);

  const { data, isLoading, isFetching } = useFetchContexts(fetchParams, {
    meta: { errorMessage: 'Issue fetching contexts' },
  });

  // Update the URL state hook with the latest cursor values from the API response
  useEffect(() => {
    if (data?.next || data?.previous) {
      handleFiltersChange({
        ...(data.next && { nextCursor: data.next }),
        ...(data.previous && { previousCursor: data.previous }),
      });
    }
  }, [data, handleFiltersChange]);

  // Define wrapper props once
  const wrapperProps = {
    filterValues,
    handleFiltersChange,
    resetFilters,
    isLoading: isLoading, // Pass loading state
    isFetching: isFetching, // Pass fetching state for spinner
    hasData: !!data?.data.length,
    areFiltersApplied,
    ...rest,
  };

  // Define table props once
  const tableProps = {
    orderBy: filterValues.orderBy, // Use state from hook via filterValues
    orderDirection: filterValues.orderDirection, // Use state from hook via filterValues
    toggleSort,
    paginationProps: data
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
      : undefined,
  };

  if (isLoading) {
    return (
      <ContextListWrapper {...wrapperProps}>
        <ContextListTable {...tableProps}>
          {Array.from({ length: limit }).map((_, index) => (
            <ContextRowSkeleton key={index} />
          ))}
        </ContextListTable>
      </ContextListWrapper>
    );
  }

  if (!areFiltersApplied && !data?.data.length) {
    return (
      <ContextListWrapper {...wrapperProps} showEmptyState={true}>
        <ContextListBlank />
      </ContextListWrapper>
    );
  }

  if (!data?.data.length) {
    return (
      <ContextListWrapper {...wrapperProps}>
        <ListNoResults
          title="No contexts found"
          description="We couldn't find any contexts that match your search criteria. Try adjusting your filters."
          onClearFilters={resetFilters}
        />
      </ContextListWrapper>
    );
  }

  return (
    <ContextListWrapper {...wrapperProps}>
      <ContextListTable {...tableProps}>
        {data.data.map((context) => (
          <ContextRow key={`${context.type}-${context.id}`} context={context} />
        ))}
      </ContextListTable>
    </ContextListWrapper>
  );
};

export const CreateContextButton = () => {
  return (
    <PermissionButton
      permission={PermissionsEnum.WORKFLOW_WRITE}
      variant="primary"
      mode="gradient"
      size="xs"
      leadingIcon={RiAddCircleLine}
    >
      Create Topic
    </PermissionButton>
  );
};

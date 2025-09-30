import { DirectionEnum, ListWorkflowResponse } from '@novu/shared';
import { RiMore2Fill } from 'react-icons/ri';
import { useSearchParams } from 'react-router-dom';
import { Skeleton } from '@/components/primitives/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableHeadSortDirection,
  TableRow,
} from '@/components/primitives/table';
import { TablePaginationFooter } from '@/components/primitives/table-pagination-footer';
import { WorkflowListEmpty } from '@/components/workflow-list-empty';
import { WorkflowRow } from '@/components/workflow-row';
import { ServerErrorPage } from '@/pages/server-error-page';

export type SortableColumn = 'name' | 'updatedAt' | 'lastTriggeredAt';

interface WorkflowListProps {
  data?: ListWorkflowResponse;
  isLoading?: boolean;
  isError?: boolean;
  limit?: number;
  orderBy?: SortableColumn;
  orderDirection?: TableHeadSortDirection;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  onPageSizeChange?: (pageSize: number) => void;
}

interface WorkflowListSkeletonProps {
  limit: number;
}

function WorkflowListSkeleton({ limit }: WorkflowListSkeletonProps) {
  return (
    <>
      {new Array(limit).fill(0).map((_, index) => (
        <TableRow key={index}>
          <TableCell className="flex flex-col gap-1 font-medium">
            <Skeleton className="h-5 w-[20ch]" />
            <Skeleton className="h-3 w-[15ch] rounded-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-[6ch] rounded-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-[8ch] rounded-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-[7ch] rounded-full" />
          </TableCell>
          <TableCell className="text-foreground-600 text-sm font-medium">
            <Skeleton className="h-5 w-[14ch] rounded-full" />
          </TableCell>
          <TableCell className="text-foreground-600 text-sm font-medium">
            <Skeleton className="h-5 w-[14ch] rounded-full" />
          </TableCell>
          <TableCell className="text-foreground-600 text-sm font-medium">
            <RiMore2Fill className="size-4 opacity-50" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export function WorkflowList({
  data,
  isLoading,
  isError,
  limit = 10,
  orderBy,
  orderDirection,
  hasActiveFilters,
  onClearFilters,
  onPageSizeChange,
}: WorkflowListProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  const offset = parseInt(searchParams.get('offset') || '0');
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil((data?.totalCount || 0) / limit);

  const navigateToPage = (newPage: number) => {
    const newOffset = (newPage - 1) * limit;
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set('offset', newOffset.toString());
      return newParams;
    });
  };

  const handlePreviousPage = () => navigateToPage(Math.max(1, currentPage - 1));
  const handleNextPage = () => navigateToPage(Math.min(totalPages, currentPage + 1));

  const handlePageSizeChange = (newPageSize: number) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set('limit', newPageSize.toString());
      newParams.set('offset', '0'); // Reset to first page when changing page size
      return newParams;
    });
    onPageSizeChange?.(newPageSize);
  };

  const toggleSort = (column: SortableColumn) => {
    const newDirection =
      column === orderBy
        ? orderDirection === DirectionEnum.DESC
          ? DirectionEnum.ASC
          : DirectionEnum.DESC
        : DirectionEnum.DESC;
    searchParams.set('orderDirection', newDirection);
    searchParams.set('orderBy', column);
    setSearchParams(searchParams);
  };

  if (isError) return <ServerErrorPage />;

  if (!isLoading && data?.totalCount === 0) {
    return <WorkflowListEmpty emptySearchResults={hasActiveFilters} onClearFilters={onClearFilters} />;
  }

  return (
    <div className="flex h-full flex-col">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              sortable
              sortDirection={orderBy === 'name' ? orderDirection : false}
              onSort={() => toggleSort('name')}
            >
              Workflows
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Steps</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead
              sortable
              sortDirection={orderBy === 'lastTriggeredAt' ? orderDirection : false}
              onSort={() => toggleSort('lastTriggeredAt')}
            >
              Last triggered
            </TableHead>
            <TableHead
              sortable
              sortDirection={orderBy === 'updatedAt' ? orderDirection : false}
              onSort={() => toggleSort('updatedAt')}
            >
              Last updated
            </TableHead>

            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <WorkflowListSkeleton limit={limit} />
          ) : (
            <>
              {data?.workflows.map((workflow) => (
                <WorkflowRow key={workflow._id} workflow={workflow} />
              ))}
            </>
          )}
        </TableBody>
        {data && (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={7} className="p-0">
                <TablePaginationFooter
                  pageSize={limit}
                  currentPageItemsCount={data.workflows.length}
                  onPreviousPage={handlePreviousPage}
                  onNextPage={handleNextPage}
                  onPageSizeChange={handlePageSizeChange}
                  hasPreviousPage={currentPage > 1}
                  hasNextPage={currentPage < totalPages}
                  itemName="workflows"
                  totalCount={data.totalCount}
                />
              </TableCell>
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  );
}

/**
 * TablePaginationFooter - A cursor-based pagination footer component for tables
 *
 * @example
 * ```tsx
 * // Regular pagination
 * const [currentPage, setCurrentPage] = useState(1);
 * const [pageSize, setPageSize] = useState(12);
 * const totalItems = 213;
 *
 * <TablePaginationFooter
 *   currentPage={currentPage}
 *   pageSize={pageSize}
 *   totalItems={totalItems}
 *   onFirstPage={() => setCurrentPage(1)}
 *   onPreviousPage={() => setCurrentPage(prev => Math.max(1, prev - 1))}
 *   onNextPage={() => setCurrentPage(prev => prev + 1)}
 *   onLastPage={() => setCurrentPage(Math.ceil(totalItems / pageSize))}
 *   onPageSizeChange={(newSize) => {
 *     setPageSize(newSize);
 *     setCurrentPage(1); // Reset to first page when page size changes
 *   }}
 *   isFirstPage={currentPage === 1}
 *   isLastPage={currentPage >= Math.ceil(totalItems / pageSize)}
 *   itemName="workflows"
 * />
 *
 * // Cursor-based pagination with count
 * <TablePaginationFooter
 *   currentPage={1}
 *   pageSize={10}
 *   totalItems={10} // items on current page
 *   onFirstPage={() => {}}
 *   onPreviousPage={handlePrevious}
 *   onNextPage={handleNext}
 *   onLastPage={() => {}}
 *   onPageSizeChange={handlePageSizeChange}
 *   isFirstPage={!hasPrevious}
 *   isLastPage={!hasNext}
 *   itemName="subscribers"
 *   count={12500} // total count from API
 *   hasMore={false} // or true if over 50,000
 * />
 * ```
 */
import { ChevronDownIcon } from '@radix-ui/react-icons';
import { RiArrowLeftDoubleLine, RiArrowLeftSLine, RiArrowRightDoubleLine, RiArrowRightSLine } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { cn } from '@/utils/ui';

// Pagination group components
type PaginationGroupProps = {
  children: React.ReactNode;
};

function PaginationGroup({ children }: PaginationGroupProps) {
  return (
    <div className="flex items-center rounded-8 border border-stroke-soft bg-bg-white overflow-hidden">{children}</div>
  );
}

type PaginationNavButtonProps = {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  'aria-label'?: string;
};

function PaginationNavButton({ children, disabled, onClick, 'aria-label': ariaLabel }: PaginationNavButtonProps) {
  return (
    <Button
      variant="secondary"
      mode="ghost"
      size="xs"
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      className="rounded-none w-[32px] border-0 border-r border-stroke-soft p-1.5 last:border-r-0 text-icon-sub hover:text-icon-strong disabled:text-icon-disabled"
    >
      {children}
    </Button>
  );
}

type TablePaginationFooterProps = {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onFirstPage: () => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onLastPage: () => void;
  onPageSizeChange: (pageSize: number) => void;
  isFirstPage: boolean;
  isLastPage: boolean;
  className?: string;
  pageSizeOptions?: number[];
  itemName?: string;
  hasMore?: boolean;
  count?: number;
};

export function TablePaginationFooter({
  currentPage,
  pageSize,
  totalItems,
  onFirstPage,
  onPreviousPage,
  onNextPage,
  onLastPage,
  onPageSizeChange,
  isFirstPage,
  isLastPage,
  className,
  pageSizeOptions = [12, 25, 50, 100],
  itemName = 'items',
  hasMore,
  count,
}: TablePaginationFooterProps) {
  // Check if this is cursor-based pagination (no meaningful currentPage or totalItems)
  const isCursorPagination = className?.includes('cursor-pagination') || count !== undefined;

  const startItem = isCursorPagination ? 1 : Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const endItem = isCursorPagination ? totalItems : Math.min(currentPage * pageSize, totalItems);

  return (
    <div className={cn('flex w-full items-center bg-bg-white px-3 py-2', className)}>
      <div className="flex items-center gap-1 px-2 flex-1">
        {isCursorPagination ? (
          <>
            <span className="text-label-xs text-text-soft">Showing</span>
            <span className="text-label-xs text-text-sub">{totalItems}</span>
            <span className="text-label-xs text-text-soft">{itemName} of</span>
            {hasMore ? (
              <span className="text-label-xs text-text-sub">Over 50,000</span>
            ) : (
              <span className="text-label-xs text-text-sub">{count?.toLocaleString()}</span>
            )}
            <span className="text-label-xs text-text-soft">total</span>
          </>
        ) : (
          <>
            <span className="text-label-xs text-text-sub">
              {startItem}-{endItem}
            </span>
            <span className="text-label-xs text-text-soft">of</span>
            <span className="text-label-xs text-text-sub">{totalItems.toLocaleString()}</span>
            <span className="text-label-xs text-text-soft">{itemName}</span>
          </>
        )}
      </div>

      {/* Center: Pagination buttons */}
      <div className="flex items-center justify-center flex-1">
        <PaginationGroup>
          {!isCursorPagination && (
            <PaginationNavButton disabled={isFirstPage} onClick={onFirstPage} aria-label="Go to first page">
              <RiArrowLeftDoubleLine className="size-5" />
            </PaginationNavButton>
          )}
          <PaginationNavButton disabled={isFirstPage} onClick={onPreviousPage} aria-label="Go to previous page">
            <RiArrowLeftSLine className="size-5" />
          </PaginationNavButton>
          <PaginationNavButton disabled={isLastPage} onClick={onNextPage} aria-label="Go to next page">
            <RiArrowRightSLine className="size-5" />
          </PaginationNavButton>
          {!isCursorPagination && (
            <PaginationNavButton disabled={isLastPage} onClick={onLastPage} aria-label="Go to last page">
              <RiArrowRightDoubleLine className="size-5" />
            </PaginationNavButton>
          )}
        </PaginationGroup>
      </div>

      {/* Right: Page size selector */}
      <div className="flex items-center justify-end flex-1">
        <Select value={pageSize.toString()} onValueChange={(value) => onPageSizeChange(Number(value))}>
          <SelectTrigger
            size="2xs"
            rightIcon={<ChevronDownIcon className="size-5 text-icon-sub" />}
            className="w-auto min-w-[80px] rounded-8 border-stroke-soft bg-bg-white px-2.5 py-1.5 shadow-xs"
          >
            <SelectValue>
              <span className="text-label-xs text-text-sub">{pageSize}</span>
              <span className="text-label-xs text-text-soft ml-1">/ page</span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={size.toString()}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

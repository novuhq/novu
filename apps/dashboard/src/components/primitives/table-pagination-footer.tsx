import { ChevronDownIcon } from '@radix-ui/react-icons';
import { RiArrowLeftSLine, RiArrowRightSLine } from 'react-icons/ri';
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
      size="2xs"
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
  pageSize: number;
  currentPageItemsCount: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onPageSizeChange: (pageSize: number) => void;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  className?: string;
  pageSizeOptions?: number[];
  itemName?: string;
  totalCountCapped?: boolean;
  totalCount?: number;
};

export function TablePaginationFooter({
  pageSize,
  onPreviousPage,
  onNextPage,
  onPageSizeChange,
  hasPreviousPage,
  hasNextPage,
  className,
  pageSizeOptions = [10, 20, 50],
  totalCountCapped,
  totalCount,
}: TablePaginationFooterProps) {
  return (
    <div className={cn('flex w-full items-center bg-bg-white px-3 py-2', className)}>
      <div className="flex items-center gap-1 px-2 pl-0 flex-1">
        {totalCount !== undefined && (
          <>
            {totalCountCapped ? (
              <span className="text-label-xs text-text-sub">Over 50,000</span>
            ) : (
              <span className="text-label-xs text-text-sub">{totalCount?.toLocaleString()}</span>
            )}
            <span className="text-label-xs text-text-soft">results</span>
          </>
        )}
      </div>

      {/* Center: Pagination buttons */}
      <div className="flex items-center justify-center flex-1">
        <PaginationGroup>
          <PaginationNavButton disabled={!hasPreviousPage} onClick={onPreviousPage} aria-label="Go to previous page">
            <RiArrowLeftSLine className="size-5" />
          </PaginationNavButton>
          <PaginationNavButton disabled={!hasNextPage} onClick={onNextPage} aria-label="Go to next page">
            <RiArrowRightSLine className="size-5" />
          </PaginationNavButton>
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

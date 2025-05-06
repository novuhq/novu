import { Button } from '@/components/primitives/button';
import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons';
interface ArrowPaginationProps {
  page: number;
  hasMore: boolean;
  onPageChange: (newPage: number) => void;
}

export function ArrowPagination({ page, hasMore, onPageChange }: ArrowPaginationProps) {
  return (
    <div className="bottom-0 mt-auto border-t border-t-neutral-200 bg-white py-3">
      <div className="flex items-center justify-center px-6">
        <div className="border-input inline-flex items-center rounded-lg border bg-transparent">
          <Button
            variant="secondary"
            mode="ghost"
            disabled={page === 0}
            onClick={() => onPageChange(0)}
            className="rounded-r-none border-0"
          >
            <div className="flex items-center">
              <ChevronLeftIcon className="size-3" />
              <ChevronLeftIcon className="-ml-2 size-3" />
            </div>
          </Button>
          <Button
            variant="secondary"
            mode="ghost"
            disabled={page === 0}
            onClick={() => onPageChange(Math.max(0, page - 1))}
            className="border-l-input rounded-none border-0 border-l"
          >
            <ChevronLeftIcon className="size-3" />
          </Button>
          <Button
            variant="secondary"
            mode="ghost"
            disabled={!hasMore}
            onClick={() => onPageChange(page + 1)}
            className="border-l-input rounded-none border-0 border-l"
          >
            <ChevronRightIcon className="size-3" />
          </Button>
          <Button
            variant="secondary"
            mode="ghost"
            disabled={!hasMore}
            onClick={() => onPageChange(page + 5)}
            className="border-l-input rounded-l-none border-0 border-l"
          >
            <div className="flex items-center">
              <ChevronRightIcon className="size-3" />
              <ChevronRightIcon className="-ml-2 size-3" />
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
}

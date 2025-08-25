import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import { Button } from '@/components/primitives/button';
import { cn } from '../../../utils/ui';

interface CursorPaginationProps {
  hasMore: boolean;
  hasPrevious: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onFirst: () => void;
  className?: string;
  isLoading?: boolean;
}

export function CursorPagination({
  hasMore,
  hasPrevious,
  onNext,
  onPrevious,
  onFirst,
  className,
  isLoading = false,
}: CursorPaginationProps) {
  return (
    <div className={cn('bottom-0 mt-auto border-t border-t-neutral-200 bg-white py-3', className)}>
      <div className="flex items-center justify-center px-6">
        <div className="border-input inline-flex items-center rounded-lg border bg-transparent">
          <Button
            variant="secondary"
            mode="ghost"
            disabled={!hasPrevious || isLoading}
            onClick={onFirst}
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
            disabled={!hasPrevious || isLoading}
            onClick={onPrevious}
            className="border-l-input rounded-none border-0 border-l"
          >
            <ChevronLeftIcon className="size-3" />
          </Button>
          <Button
            variant="secondary"
            mode="ghost"
            disabled={!hasMore || isLoading}
            onClick={onNext}
            className="border-l-input rounded-l-none border-0 border-l"
          >
            <ChevronRightIcon className="size-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

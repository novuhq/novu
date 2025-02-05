import { Button } from '@/components/primitives/button';
import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons';

interface CursorPaginationProps {
  hasNext: boolean;
  hasPrevious: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onFirst: () => void;
}

export function CursorPagination({ hasNext, hasPrevious, onNext, onPrevious, onFirst }: CursorPaginationProps) {
  return (
    <div className="border-t-stroke-soft bottom-0 mt-auto border-t bg-white py-3">
      <div className="border-input flex place-self-center rounded-lg border bg-transparent">
        <Button
          variant="secondary"
          mode="ghost"
          disabled={!hasPrevious}
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
          disabled={!hasPrevious}
          onClick={onPrevious}
          className="border-l-input rounded-none border-0 border-l"
        >
          <ChevronLeftIcon className="size-3" />
        </Button>
        <Button
          variant="secondary"
          mode="ghost"
          disabled={!hasNext}
          onClick={onNext}
          className="border-l-input rounded-l-none border-0 border-l"
        >
          <ChevronRightIcon className="size-3" />
        </Button>
      </div>
    </div>
  );
}

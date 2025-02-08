import type { PopoverContentProps } from '@radix-ui/react-popover';
import { KeyboardEventHandler, useMemo, useRef, useState } from 'react';
import { RiCornerDownLeftLine } from 'react-icons/ri';

import { Button } from '@/components/primitives/button';
import { Popover, PopoverContent, PopoverPortal, PopoverTrigger } from '@/components/primitives/popover';
import TruncatedText from '@/components/truncated-text';
import { cn } from '@/utils/ui';

const textClassName = 'text-foreground-600 text-xs font-medium px-2';

export const NumbersPicker = <T extends string | number>({
  numbers,
  label,
  length,
  placeholder = 'every',
  zeroBased = false,
  onNumbersChange,
}: {
  numbers: Array<T>;
  label: string;
  placeholder?: string;
  length: number;
  zeroBased?: boolean;
  onNumbersChange: (numbers: Array<T>) => void;
}) => {
  const inputRef = useRef<HTMLDivElement>(null);
  const [isPopoverOpened, setIsPopoverOpened] = useState(false);
  const [internalSelectedNumbers, setInternalSelectedNumbers] = useState(numbers);

  const onNumberClick = (day: T) => {
    if (internalSelectedNumbers.includes(day)) {
      setInternalSelectedNumbers(internalSelectedNumbers.filter((d) => d !== day));
    } else {
      setInternalSelectedNumbers([...internalSelectedNumbers, day]);
    }
  };

  const onKeyDown: KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      setIsPopoverOpened((old) => !old);
    }
  };

  const value = useMemo(() => numbers.join(','), [numbers]);

  const onClose = () => {
    setIsPopoverOpened(false);
    inputRef.current?.focus();
  };

  const onInteractOutside: PopoverContentProps['onInteractOutside'] = ({ target }) => {
    if (inputRef.current?.contains(target as Node) || !isPopoverOpened) {
      return;
    }

    onClose();
  };

  return (
    <Popover open={isPopoverOpened}>
      <PopoverTrigger asChild>
        <div className="w-full">
          <div
            ref={inputRef}
            className="border-1 focus:ring-ring ring-offset-background flex h-7 w-full items-center gap-0.5 rounded-lg border border-neutral-100 p-0 focus-within:border-transparent focus:outline-none focus:ring-2 focus-visible:border-transparent"
            tabIndex={0}
            role="combobox"
            aria-expanded={isPopoverOpened}
            onKeyDown={onKeyDown}
            onClick={() => {
              setIsPopoverOpened((old) => !old);
            }}
          >
            <TruncatedText className={cn(textClassName, 'w-[8ch] max-w-[8ch]')}>
              {value !== '' ? value : placeholder}
            </TruncatedText>
            <span className="bg-neutral-alpha-50 ml-auto flex h-full items-center border-l border-l-neutral-100">
              <span className={cn(textClassName)}>{label}</span>
            </span>
          </div>
        </div>
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent
          className="max-w-full p-0"
          side="bottom"
          align="end"
          onEscapeKeyDown={onClose}
          onInteractOutside={onInteractOutside}
        >
          <div className="flex flex-col">
            <div className="grid max-w-full grid-cols-7 gap-2 p-3">
              {Array.from({ length }, (_, i) => (zeroBased ? i : i + 1)).map((day) => (
                <Button
                  key={day}
                  size="sm"
                  variant="secondary"
                  mode={internalSelectedNumbers.includes(day as T) ? 'filled' : 'ghost'}
                  className="size-8 [&_span]:transition-none"
                  onClick={() => onNumberClick(day as T)}
                >
                  {day}
                </Button>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-t-neutral-100 p-3">
              <Button
                size="2xs"
                variant="secondary"
                mode="outline"
                onClick={() => {
                  setInternalSelectedNumbers(numbers);
                  onClose();
                }}
              >
                Cancel
              </Button>
              <Button
                size="2xs"
                variant="primary"
                onClick={() => {
                  onNumbersChange(internalSelectedNumbers);
                  onClose();
                }}
              >
                Apply <RiCornerDownLeftLine className="size-4" />
              </Button>
            </div>
          </div>
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
};

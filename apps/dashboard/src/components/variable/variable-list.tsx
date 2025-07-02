import TruncatedText from '@/components/truncated-text';
import { cn } from '@/utils/ui';
import { CheckIcon } from '@radix-ui/react-icons';
import React, { useCallback, useImperativeHandle, useRef, useState } from 'react';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '../primitives/tooltip';
import { VariableIcon } from './components/variable-icon';

const KeyboardItem = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  return (
    <span
      className={cn(
        'text-foreground-400 shadow-xs text-paragraph-2xs flex h-5 w-5 items-center justify-center rounded-[6px] border border-neutral-200 px-2 py-1 font-light',
        className
      )}
    >
      {children}
    </span>
  );
};

export type VariablesListProps = {
  options: Array<{ label: string; value: string; preview?: React.ReactNode }>;
  onSelect: (value: string) => void;
  selectedValue?: string;
  title: string;
  className?: string;
  context?: 'variables' | 'translations';
};

export type VariableListRef = {
  next: () => void;
  prev: () => void;
  select: () => void;
  focusFirst: () => void;
};

export const VariableList = React.forwardRef<VariableListRef, VariablesListProps>(
  ({ options, onSelect, selectedValue, title, className, context = 'variables' }, ref) => {
    const variablesListRef = useRef<HTMLUListElement>(null);
    const [hoveredOptionIndex, setHoveredOptionIndex] = useState(options.length > 0 ? 0 : -1);
    const maxIndex = options.length - 1;

    const scrollToOption = useCallback((index: number) => {
      if (!variablesListRef.current) return;

      const listElement = variablesListRef.current;
      const optionElement = listElement.children[index] as HTMLLIElement;

      if (optionElement) {
        const containerHeight = listElement.clientHeight;
        const optionTop = optionElement.offsetTop;
        const optionHeight = optionElement.clientHeight;

        if (optionTop < listElement.scrollTop) {
          // Scroll up if option is above visible area
          listElement.scrollTop = optionTop;
        } else if (optionTop + optionHeight > listElement.scrollTop + containerHeight) {
          // Scroll down if option is below visible area
          listElement.scrollTop = optionTop + optionHeight - containerHeight;
        }
      }
    }, []);

    const next = useCallback(() => {
      if (hoveredOptionIndex === -1) {
        setHoveredOptionIndex(0);
        scrollToOption(0);
      } else {
        setHoveredOptionIndex((oldIndex) => {
          const newIndex = oldIndex === maxIndex ? 0 : oldIndex + 1;
          scrollToOption(newIndex);
          return newIndex;
        });
      }
    }, [hoveredOptionIndex, maxIndex, scrollToOption]);

    const prev = useCallback(() => {
      if (hoveredOptionIndex === -1) {
        setHoveredOptionIndex(maxIndex);
        scrollToOption(maxIndex);
      } else {
        setHoveredOptionIndex((oldIndex) => {
          const newIndex = oldIndex === 0 ? maxIndex : oldIndex - 1;
          scrollToOption(newIndex);
          return newIndex;
        });
      }
    }, [hoveredOptionIndex, maxIndex, scrollToOption]);

    const select = useCallback(() => {
      if (hoveredOptionIndex !== -1) {
        onSelect(options[hoveredOptionIndex].value ?? '');
        setHoveredOptionIndex(-1);
      }
    }, [hoveredOptionIndex, onSelect, options]);

    const focusFirst = useCallback(() => {
      setHoveredOptionIndex(0);
      scrollToOption(0);
    }, [scrollToOption]);

    useImperativeHandle(ref, () => ({
      next,
      prev,
      select,
      focusFirst,
    }));

    return (
      <div className={cn('bg-background flex flex-col', className)}>
        <header className="flex items-center justify-between gap-1 rounded-t-md border-b border-neutral-100 bg-neutral-50 p-1">
          <span className="text-foreground-400 text-paragraph-2xs uppercase">{title}</span>
          <KeyboardItem>{`{`}</KeyboardItem>
        </header>
        <ul
          ref={variablesListRef}
          // relative is to set offset parent and is important to make the scroll and navigation work
          className="nv-no-scrollbar relative flex max-h-[200px] flex-col gap-0.5 overflow-y-auto overflow-x-hidden p-1"
        >
          {options.map((option, index) => (
            <VariableListItem
              key={option.value}
              option={option}
              index={index}
              selectedValue={selectedValue}
              hoveredOptionIndex={hoveredOptionIndex}
              setHoveredOptionIndex={setHoveredOptionIndex}
              onSelect={onSelect}
              context={context}
            />
          ))}
        </ul>
        <footer className="flex items-center gap-1 border-t border-neutral-100 p-1">
          <div className="flex w-full items-center gap-0.5">
            <KeyboardItem>↑</KeyboardItem>
            <KeyboardItem>↓</KeyboardItem>
            <span className="text-foreground-600 text-paragraph-xs ml-0.5">Navigate</span>
            <KeyboardItem className="ml-auto">↵</KeyboardItem>
          </div>
        </footer>
      </div>
    );
  }
);

const VariableListItem = ({
  option,
  index,
  selectedValue,
  hoveredOptionIndex,
  setHoveredOptionIndex,
  onSelect,
  context = 'variables',
}: {
  option: VariablesListProps['options'][number];
  index: number;
  selectedValue?: string;
  hoveredOptionIndex: number;
  setHoveredOptionIndex: (index: number) => void;
  onSelect: (value: string) => void;
  context?: 'variables' | 'translations';
}) => {
  const hasPreview = !!option.preview;
  const isHovered = hoveredOptionIndex === index;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseLeave = () => {
    // Small delay to allow moving to tooltip
    timeoutRef.current = setTimeout(() => {
      setHoveredOptionIndex(-1);
    }, 150);
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setHoveredOptionIndex(index);
  };

  return (
    <Tooltip open={isHovered && hasPreview} key={option.value}>
      <TooltipTrigger asChild>
        <li
          className={cn(
            'text-paragraph-xs font-code text-foreground-950 flex cursor-pointer items-center gap-1 rounded-sm p-1 hover:bg-neutral-100',
            isHovered ? 'bg-neutral-100' : ''
          )}
          value={option.value}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();

            onSelect(option.value ?? '');
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex size-3 items-center justify-center">
            <VariableIcon variableName={option.value} context={context} />
          </div>
          <TruncatedText>{option.label}</TruncatedText>
          <CheckIcon className={cn('ml-auto size-4', selectedValue === option.value ? 'opacity-50' : 'opacity-0')} />
        </li>
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent
          side="right"
          className="bg-bg-weak border-0 p-0.5"
          sideOffset={5}
          hideWhenDetached
          onMouseEnter={() => {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
          }}
          onMouseLeave={() => setHoveredOptionIndex(-1)}
        >
          {option.preview}
        </TooltipContent>
      </TooltipPortal>
    </Tooltip>
  );
};

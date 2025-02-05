import React, { useCallback, useImperativeHandle, useRef, useState } from 'react';
import { CheckIcon } from '@radix-ui/react-icons';

import { Code2 } from '@/components/icons/code-2';
import { cn } from '@/utils/ui';
import TruncatedText from '@/components/truncated-text';

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
  options: Array<{ label: string; value: string }>;
  onSelect: (value: string) => void;
  selectedValue?: string;
  title: string;
  className?: string;
};

export type VariableListRef = {
  next: () => void;
  prev: () => void;
  select: () => void;
  focusFirst: () => void;
};

export const VariableList = React.forwardRef<VariableListRef, VariablesListProps>(
  ({ options, onSelect, selectedValue, title, className }, ref) => {
    const variablesListRef = useRef<HTMLUListElement>(null);
    const [hoveredOptionIndex, setHoveredOptionIndex] = useState(0);
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
          className="relative flex max-h-[200px] flex-col gap-0.5 overflow-y-auto overflow-x-hidden p-1"
        >
          {options.map((option, index) => (
            <li
              className={cn(
                'text-paragraph-xs font-code text-foreground-950 flex cursor-pointer items-center gap-1 rounded-sm p-1 hover:bg-neutral-100',
                hoveredOptionIndex === index ? 'bg-neutral-100' : ''
              )}
              key={option.value}
              value={option.value}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();

                onSelect(option.value ?? '');
              }}
            >
              <Code2 className="text-feature size-3 min-w-3" />
              <TruncatedText>{option.label}</TruncatedText>
              <CheckIcon
                className={cn('ml-auto size-4', selectedValue === option.value ? 'opacity-50' : 'opacity-0')}
              />
            </li>
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

import React from 'react';
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
  hoveredOptionIndex: number;
  className?: string;
};

export const VariableList = React.forwardRef<HTMLUListElement, VariablesListProps>(
  ({ options, onSelect, selectedValue, title, hoveredOptionIndex, className }, ref) => {
    return (
      <div className={cn('bg-background flex flex-col', className)}>
        <header className="flex items-center justify-between gap-1 rounded-t-md border-b border-neutral-100 bg-neutral-50 p-1">
          <span className="text-foreground-400 text-paragraph-2xs uppercase">{title}</span>
          <KeyboardItem>{`{`}</KeyboardItem>
        </header>
        <ul
          ref={ref}
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

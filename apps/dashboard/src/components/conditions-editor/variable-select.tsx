import React, { useMemo, useState, useRef } from 'react';
import { CheckIcon } from '@radix-ui/react-icons';

import { Code2 } from '@/components/icons/code-2';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/primitives/popover';
import { InputPure, InputRoot, InputWrapper } from '@/components/primitives/input';
import { AUTOCOMPLETE_PASSWORD_MANAGERS_OFF } from '@/utils/constants';
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

type VariablesListProps = {
  options: Array<{ label: string; value: string }>;
  onSelect: (value: string) => void;
  selectedValue?: string;
  title: string;
  hoveredOptionIndex: number;
};

const VariablesList = React.forwardRef<HTMLUListElement, VariablesListProps>(
  ({ options, onSelect, selectedValue, title, hoveredOptionIndex }, ref) => {
    return (
      <div className="flex flex-col">
        <header className="flex items-center justify-between gap-1 border-b border-neutral-100 bg-neutral-50 p-1">
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
              onClick={() => {
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

type VariableSelectProps = {
  disabled?: boolean;
  value?: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
  leftIcon?: React.ReactNode;
  title?: string;
};

/**
 * A searchable dropdown component for selecting variables with keyboard navigation support.
 *
 * Features:
 * - Filterable options list
 * - Keyboard navigation (↑/↓ arrows)
 * - Auto-creation of new options when typing custom values
 * - Visual feedback for selected items
 * - Support for custom left icon
 */
export const VariableSelect = ({
  disabled,
  value,
  options: optionsProp,
  onChange,
  leftIcon,
  title = 'Variables',
}: VariableSelectProps) => {
  const [inputValue, setInputValue] = useState(value ?? '');
  const [filterValue, setFilterValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState(optionsProp);
  const [hoveredOptionIndex, setHoveredOptionIndex] = useState(0);
  const variablesListRef = useRef<HTMLUListElement>(null);

  const hasNoInputOption = useMemo(
    () =>
      inputValue !== '' &&
      !options.find((option) => option.value?.toLocaleLowerCase() === inputValue.toLocaleLowerCase()),
    [inputValue, options]
  );
  const filteredOptions = useMemo(() => {
    if (!filterValue) {
      return options;
    }
    return options.filter((option) => option.value?.toLocaleLowerCase().includes(filterValue.toLocaleLowerCase()));
  }, [options, filterValue]);
  const inputRef = useRef<HTMLInputElement>(null);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.trim();
    if (newValue !== inputValue) {
      setInputValue(newValue);
      setFilterValue(newValue);
    }
  };

  const scrollToOption = (index: number) => {
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
  };

  const next = () => {
    if (hoveredOptionIndex === -1) {
      setHoveredOptionIndex(0);
      scrollToOption(0);
    } else {
      setHoveredOptionIndex((oldIndex) => {
        const newIndex = oldIndex === options.length - 1 ? 0 : oldIndex + 1;
        scrollToOption(newIndex);
        return newIndex;
      });
    }
  };

  const prev = () => {
    if (hoveredOptionIndex === -1) {
      setHoveredOptionIndex(options.length - 1);
      scrollToOption(options.length - 1);
    } else {
      setHoveredOptionIndex((oldIndex) => {
        const newIndex = oldIndex === 0 ? options.length - 1 : oldIndex - 1;
        scrollToOption(newIndex);
        return newIndex;
      });
    }
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setIsOpen(true);
    if (e.key === 'ArrowDown') {
      next();
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      prev();
      e.preventDefault();
    } else if (e.key === 'Enter') {
      if (hoveredOptionIndex !== -1) {
        e.preventDefault();
        onSelect(filteredOptions[hoveredOptionIndex].value ?? '');
        setHoveredOptionIndex(-1);
      }
    }
  };

  const addOption = () => {
    if (hasNoInputOption) {
      setOptions((oldOptions) => [{ label: inputValue, value: inputValue, name: inputValue }, ...oldOptions]);
    }
  };

  const onSelect = (newValue: string) => {
    setIsOpen(false);
    setFilterValue('');
    setInputValue(newValue);
    onChange(newValue);
  };

  const onOpen = () => {
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const onClose = () => {
    addOption();
    setIsOpen(false);
    setFilterValue('');
    const newInputValue = inputValue !== '' ? inputValue : (value ?? '');
    setInputValue(newInputValue);
    onChange(newInputValue);
  };

  return (
    <Popover open={isOpen}>
      <PopoverAnchor asChild>
        <InputRoot size="2xs" className="w-40">
          <InputWrapper>
            {leftIcon}
            <InputPure
              ref={inputRef}
              value={inputValue}
              onClick={onOpen}
              onChange={onInputChange}
              onFocusCapture={() => {
                setHoveredOptionIndex(0);
                scrollToOption(0);
              }}
              // use blur only when there are no filtered options, otherwise it closes the popover on keyboard navigation
              onBlurCapture={filteredOptions.length === 0 ? onClose : undefined}
              placeholder="Field"
              disabled={disabled}
              onKeyDown={onInputKeyDown}
              {...AUTOCOMPLETE_PASSWORD_MANAGERS_OFF}
            />
          </InputWrapper>
        </InputRoot>
      </PopoverAnchor>
      {filteredOptions.length > 0 && (
        <PopoverContent
          className="min-w-[250px] max-w-[250px] p-0"
          side="bottom"
          align="start"
          onOpenAutoFocus={(e) => {
            // prevent the input from being blurred when the popover opens
            e.preventDefault();
          }}
          onFocusOutside={onClose}
        >
          <VariablesList
            ref={variablesListRef}
            hoveredOptionIndex={hoveredOptionIndex}
            options={filteredOptions}
            onSelect={onSelect}
            selectedValue={value}
            title={title}
          />
        </PopoverContent>
      )}
    </Popover>
  );
};

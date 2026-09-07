import { useCallback, useId, useRef, useState } from 'react';
import { IconType } from 'react-icons';
import { RiArrowDownLine, RiArrowUpLine, RiLoader4Line, RiSearchLine } from 'react-icons/ri';
import { cn } from '@/utils/ui';
import { EnterLineIcon } from '../icons/enter-line';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from './command';
import { Input } from './input';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Separator } from './separator';

export interface AutocompleteItem {
  id: string;
  [key: string]: unknown;
}

export interface AutocompleteProps<T extends AutocompleteItem> {
  value: string;
  onChange: (value: string) => void;
  items: T[];
  isLoading?: boolean;
  hasSearched?: boolean;
  onSelectItem?: (item: T) => void;
  size?: 'xs' | 'sm' | 'md';
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  trailingIcon?: IconType;
  leadingNode?: React.ReactNode;
  minSearchLength?: number;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  sectionTitle?: string;
  renderItem: (item: T, index: number, isHighlighted: boolean) => React.ReactNode;
  onSubmit?: () => void;
}

export function Autocomplete<T extends AutocompleteItem>({
  value,
  onChange,
  items,
  isLoading = false,
  hasSearched = false,
  onSelectItem,
  size = 'xs',
  disabled,
  className,
  placeholder = 'Search...',
  trailingIcon = RiSearchLine,
  leadingNode,
  minSearchLength = 2,
  emptyStateTitle = 'No results found',
  emptyStateDescription = 'Try a different search term',
  sectionTitle = 'Results',
  renderItem,
  onSubmit,
}: AutocompleteProps<T>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Generate unique IDs for accessibility
  const id = useId();
  const listboxId = `${id}-listbox`;
  const labelId = `${id}-label`;

  // Check if there are search results
  const hasResults = items.length > 0;
  const showDropdown = open && value.length >= minSearchLength;

  // Form submission handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (open && hasResults && highlightedIndex >= 0) {
      // Select highlighted item
      const selectedItem = items[highlightedIndex];
      onChange(selectedItem.id);

      if (onSelectItem) {
        onSelectItem(selectedItem);
      }

      setOpen(false);

      // Ensure input maintains focus after submission
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    } else if (onSubmit) {
      // Custom submit callback
      onSubmit();
    }
  };

  // Input change handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // If the input has enough characters to trigger the dropdown,
    // and the dropdown is not already set to be open by our internal state, then open it.
    if (newValue.length >= minSearchLength && !open) {
      setOpen(true);
    }
  };

  // Select item from dropdown
  const handleSelectItem = useCallback(
    (item: T) => {
      onChange(item.id);

      if (onSelectItem) {
        onSelectItem(item);
      }

      setOpen(false);

      // Ensure input maintains focus after selection
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    },
    [onChange, onSelectItem]
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || !hasResults) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          handleSelectItem(items[highlightedIndex]);
        } else if (items.length > 0) {
          // If no item is highlighted but there are results, select the first item
          handleSelectItem(items[0]);
        }
        break;
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="relative w-full">
        <Popover modal={true} open={showDropdown} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded={open}
              aria-controls={open ? listboxId : undefined}
              aria-autocomplete="list"
              aria-labelledby={labelId}
              aria-activedescendant={highlightedIndex >= 0 ? `${id}-option-${highlightedIndex}` : undefined}
              value={value}
              placeholder={placeholder}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              size={size}
              leadingNode={leadingNode}
              trailingIcon={trailingIcon}
              className="w-full transition-all duration-200"
              autoComplete="off"
              aria-busy={isLoading}
              tabIndex={0}
            />
          </PopoverTrigger>

          <PopoverContent
            className="w-(--radix-popover-trigger-width) min-w-[240px] overflow-hidden p-0"
            align="start"
            sideOffset={5}
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              // Prevent the popover from stealing focus
            }}
          >
            <Command className="h-full" shouldFilter={false}>
              <CommandList
                id={listboxId}
                role="listbox"
                // Prevent list from stealing focus
                onMouseDown={(e) => {
                  e.preventDefault();
                }}
              >
                <Separator variant="solid-text" className="px-1.5 py-1">
                  <div className="flex w-full justify-between rounded-t-md bg-neutral-50">
                    <div className="text-[11px] text-xs uppercase leading-[16px]">{sectionTitle}</div>
                    {isLoading && <RiLoader4Line className="h-3 w-3 animate-spin text-neutral-400" />}
                  </div>
                </Separator>

                <div className="min-h-[120px]">
                  {/* No results state */}
                  {!isLoading && items.length === 0 && hasSearched && (
                    <CommandEmpty className="mt-4 py-6 text-center">
                      <div className="text-foreground-300 mb-1 text-sm">{emptyStateTitle}</div>
                      {value.length > 0 && <div className="text-foreground-200 text-xs">{emptyStateDescription}</div>}
                    </CommandEmpty>
                  )}

                  {/* Results */}
                  {hasResults && (
                    <CommandGroup>
                      {items.map((item, index) => (
                        <CommandItem
                          key={item.id}
                          id={`${id}-option-${index}`}
                          className={cn('py-2', highlightedIndex === index && 'bg-neutral-100')}
                          onMouseEnter={() => setHighlightedIndex(index)}
                          onMouseDown={(e) => {
                            // Prevent default to avoid focus change
                            e.preventDefault();
                            handleSelectItem(item);
                          }}
                          role="option"
                          aria-selected={highlightedIndex === index}
                        >
                          {renderItem(item, index, highlightedIndex === index)}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </div>

                <div className="flex justify-between rounded-b-md border-t border-neutral-100 bg-white p-1">
                  <div className="flex items-center gap-0.5">
                    <div className="pointer-events-none shrink-0 rounded-[6px] border border-neutral-200 bg-white p-1 shadow-[0px_0px_0px_1px_rgba(14,18,27,0.02)_inset,0px_1px_4px_0px_rgba(14,18,27,0.12)]">
                      <RiArrowUpLine className="h-3 w-3 text-neutral-400" />
                    </div>
                    <div className="pointer-events-none shrink-0 rounded-[6px] border border-neutral-200 bg-white p-1 shadow-[0px_0px_0px_1px_rgba(14,18,27,0.02)_inset,0px_1px_4px_0px_rgba(14,18,27,0.12)]">
                      <RiArrowDownLine className="h-3 w-3 text-neutral-400" />
                    </div>
                    <span className="text-foreground-500 ml-1.5 text-xs font-normal">Navigate</span>
                  </div>
                  <div className="pointer-events-none shrink-0 rounded-[6px] border border-neutral-200 bg-white p-1 shadow-[0px_0px_0px_1px_rgba(14,18,27,0.02)_inset,0px_1px_4px_0px_rgba(14,18,27,0.12)]">
                    <EnterLineIcon className="h-3 w-3 text-neutral-400" />
                  </div>
                </div>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </form>
  );
}

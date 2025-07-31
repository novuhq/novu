import { ISubscriberResponseDto } from '@novu/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { IconType } from 'react-icons';
import { RiAddFill, RiArrowDownLine, RiArrowUpLine, RiLoader4Line, RiSearchLine } from 'react-icons/ri';
import { cn } from '@/utils/ui';
import { EnterLineIcon } from '../icons/enter-line';
import { Avatar, AvatarFallback, AvatarImage } from '../primitives/avatar';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '../primitives/command';
import { Input } from '../primitives/input';
import { Popover, PopoverContent, PopoverTrigger } from '../primitives/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../primitives/select';
import { Separator } from '../primitives/separator';
import { SearchField, useSubscriberSearch } from './hooks/use-subscriber-search';

type SubscriberAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  size?: 'xs' | 'sm' | 'md';
  disabled?: boolean;
  className?: string;
  isLoading?: boolean;
  onSubmit?: () => void;
  onSelectSubscriber?: (subscriber: ISubscriberResponseDto) => void;
  searchField?: SearchField;
  onSearchFieldChange?: (field: SearchField) => void;
  placeholder?: string;
  trailingIcon?: IconType;
};

export function SubscriberAutocomplete({
  value,
  onChange,
  size = 'xs',
  disabled,
  className,
  isLoading: externalLoading,
  onSubmit,
  onSelectSubscriber,
  searchField: externalSearchField,
  onSearchFieldChange,
  placeholder,
  trailingIcon = RiSearchLine,
}: SubscriberAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const selectInteractionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Core state
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [internalSearchField, setInternalSearchField] = useState<SearchField>('subscriberId');
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Generate unique IDs for accessibility
  const id = useId();
  const listboxId = `${id}-listbox`;
  const labelId = `${id}-label`;

  // Use external search field if provided, otherwise use internal state
  const searchField = externalSearchField || internalSearchField;

  // Get search results
  const { subscribers, isLoading, hasSearched } = useSubscriberSearch(value, searchField);
  const combinedLoading = isLoading || externalLoading;

  // Check if there are search results
  const hasResults = subscribers.length > 0;

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (selectInteractionTimeoutRef.current) {
        clearTimeout(selectInteractionTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!value?.length) {
      // Only open the select field on first interaction
      if (open && !hasInteracted) {
        setIsSelectOpen(true);
        setHasInteracted(true);
      }
    }
  }, [open, value, hasInteracted]);

  // Reset highlighted index when results change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [subscribers]);

  // Form submission handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (open && hasResults && highlightedIndex >= 0) {
      // Select highlighted subscriber
      const selectedSubscriber = subscribers[highlightedIndex];
      onChange(selectedSubscriber.subscriberId);

      if (onSelectSubscriber) {
        onSelectSubscriber(selectedSubscriber);
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
    if (newValue.length >= 2 && !open) {
      setOpen(true);
    }
  };

  // Select subscriber from dropdown
  const handleSelectSubscriber = (subscriber: ISubscriberResponseDto) => {
    onChange(subscriber.subscriberId);

    if (onSelectSubscriber) {
      onSelectSubscriber(subscriber);
    }

    setOpen(false);

    // Ensure input maintains focus after selection
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || !hasResults) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < subscribers.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : subscribers.length - 1));
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
      case 'Enter':
        if (highlightedIndex >= 0) {
          e.preventDefault();
          handleSelectSubscriber(subscribers[highlightedIndex]);
        }

        break;
    }
  };

  // Handle search field change
  const handleSearchFieldChange = useCallback(
    (value: string) => {
      // Clear any existing timeout
      if (selectInteractionTimeoutRef.current) {
        clearTimeout(selectInteractionTimeoutRef.current);
      }

      const newSearchField = value as SearchField;

      if (onSearchFieldChange) {
        onSearchFieldChange(newSearchField);
      } else {
        setInternalSearchField(newSearchField);
      }

      // Clear input when changing search field
      onChange('');
    },
    [onChange, onSearchFieldChange]
  );

  // Handle select open/close
  const handleSelectOpenChange = useCallback((open: boolean) => {
    // If select is opening, make sure our popover stays closed
    // This prevents both dropdowns competing for attention
    if (open) {
      setOpen(false);
    }
  }, []);

  // Get placeholder text based on search field
  const getPlaceholder = () => {
    let fieldSuffix;

    switch (searchField) {
      case 'email':
        fieldSuffix = ' by email';
        break;
      case 'phone':
        fieldSuffix = ' by phone';
        break;
      case 'name':
        fieldSuffix = ' by name';
        break;
      default:
        fieldSuffix = ' by subscriberId';
    }

    if (placeholder) {
      return placeholder + fieldSuffix;
    }

    return 'Search for a subscriber' + fieldSuffix;
  };

  const showDropdown = open && value.length >= 2;

  // Field selector component - memoized to prevent re-renders
  const FieldSelector = useMemo(
    () => (
      <AnimatePresence mode="wait">
        {isSelectOpen && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="flex items-stretch overflow-hidden"
          >
            <Select value={searchField} onValueChange={handleSearchFieldChange} onOpenChange={handleSelectOpenChange}>
              <SelectTrigger
                className={cn(
                  'border-stroke-soft bg-bg-weak min-w-[110px] rounded-r-none border-r-0',
                  size === 'xs' && 'h-8 px-2 text-xs',
                  size === 'sm' && 'h-9 px-3 text-sm',
                  size === 'md' && 'h-10 px-3 text-base'
                )}
                onMouseDown={(e) => {
                  // Prevent blur on the input when clicking the trigger
                  e.preventDefault();
                }}
              >
                <SelectValue placeholder="Field" />
              </SelectTrigger>
              <SelectContent
                onCloseAutoFocus={(e) => {
                  e.preventDefault();
                  // Keep input focused when select closes
                  inputRef.current?.focus();
                }}
                onPointerDownOutside={(e) => {
                  // If clicking the input or our select trigger, prevent closing
                  if (
                    e.target === inputRef.current ||
                    (e.target as HTMLElement).closest('[data-radix-select-trigger]')
                  ) {
                    e.preventDefault();
                  }
                }}
                // Prevent events from bubbling up to the Popover
                onClick={(e) => e.stopPropagation()}
              >
                <SelectItem value="subscriberId">Subscriber Id</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>
        )}
      </AnimatePresence>
    ),
    [searchField, value, isSelectOpen, size, handleSearchFieldChange, handleSelectOpenChange]
  );

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
              placeholder={getPlaceholder()}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              size={size}
              leadingNode={FieldSelector}
              trailingIcon={trailingIcon}
              className="w-full transition-all duration-200"
              autoComplete="off"
              aria-busy={combinedLoading}
              tabIndex={0}
            />
          </PopoverTrigger>

          <PopoverContent
            className="w-[var(--radix-popover-trigger-width)] min-w-[240px] overflow-hidden p-0"
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
                    <div className="text-[11px] text-xs uppercase leading-[16px]">Subscribers</div>
                    {isLoading && <RiLoader4Line className="h-3 w-3 animate-spin text-neutral-400" />}
                  </div>
                </Separator>

                <div className="min-h-[120px]">
                  {/* Loading state */}

                  {/* No results state */}
                  {!isLoading && subscribers.length === 0 && hasSearched && (
                    <CommandEmpty className="mt-4 py-6 text-center">
                      <div className="text-foreground-300 mb-1 text-sm">No subscribers found</div>
                      {value.length > 0 && (
                        <div className="text-foreground-200 text-xs">
                          Try a different search term or add a new subscriber
                        </div>
                      )}
                    </CommandEmpty>
                  )}

                  {/* Results */}
                  {hasResults && (
                    <CommandGroup>
                      {subscribers.map((subscriber, index) => (
                        <CommandItem
                          key={subscriber._id}
                          id={`${id}-option-${index}`}
                          className={cn('flex items-center gap-2 py-2', highlightedIndex === index && 'bg-neutral-100')}
                          onMouseEnter={() => setHighlightedIndex(index)}
                          onMouseDown={(e) => {
                            // Prevent default to avoid focus change
                            e.preventDefault();
                            handleSelectSubscriber(subscriber);
                          }}
                          role="option"
                          aria-selected={highlightedIndex === index}
                        >
                          <Avatar className={cn('h-8 w-8', size === 'xs' && 'h-6 w-6')}>
                            {subscriber.avatar && <AvatarImage src={subscriber.avatar} />}
                            <AvatarFallback>
                              {`${subscriber.firstName?.[0] || ''}${subscriber.lastName?.[0] || ''}`}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col items-start">
                            <span className="text-sm font-medium">
                              {subscriber.firstName || ''} {subscriber.lastName || ''}
                            </span>
                            <span className="text-foreground-400 text-xs">
                              {subscriber.email || subscriber.subscriberId}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </div>

                <div className="flex justify-between rounded-b-md border-t border-neutral-100 bg-white p-1">
                  <div className="flex items-center gap-0.5">
                    <div className="pointer-events-none shrink-0 rounded-[6px] border border-neutral-200 bg-white p-1 shadow-[0px_0px_0px_1px_rgba(14,18,27,0.02)_inset,_0px_1px_4px_0px_rgba(14,18,27,0.12)]">
                      <RiArrowUpLine className="h-3 w-3 text-neutral-400" />
                    </div>
                    <div className="pointer-events-none shrink-0 rounded-[6px] border border-neutral-200 bg-white p-1 shadow-[0px_0px_0px_1px_rgba(14,18,27,0.02)_inset,_0px_1px_4px_0px_rgba(14,18,27,0.12)]">
                      <RiArrowDownLine className="h-3 w-3 text-neutral-400" />
                    </div>
                    <span className="text-foreground-500 ml-1.5 text-xs font-normal">Navigate</span>
                  </div>
                  <div className="pointer-events-none shrink-0 rounded-[6px] border border-neutral-200 bg-white p-1 shadow-[0px_0px_0px_1px_rgba(14,18,27,0.02)_inset,_0px_1px_4px_0px_rgba(14,18,27,0.12)]">
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

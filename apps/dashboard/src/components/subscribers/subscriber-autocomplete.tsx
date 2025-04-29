import { cn } from '@/utils/ui';
import { ISubscriberResponseDto } from '@novu/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useRef, useState } from 'react';
import { RiAddFill, RiArrowDownLine, RiArrowUpLine, RiLoader4Line } from 'react-icons/ri';
import { EnterLineIcon } from '../icons/enter-line';
import { Avatar, AvatarFallback, AvatarImage } from '../primitives/avatar';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '../primitives/command';
import { Input } from '../primitives/input';
import { Popover, PopoverContent, PopoverTrigger } from '../primitives/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../primitives/select';
import { Separator } from '../primitives/separator';
import { Skeleton } from '../primitives/skeleton';
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
}: SubscriberAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [internalSearchField, setInternalSearchField] = useState<SearchField>('subscriberId');
  const [isFocused, setIsFocused] = useState(false);

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
  const hasResults = !isLoading && subscribers.length > 0;

  // Show field selector when input has content or is focused
  const showFieldSelector = isFocused || value.length > 0;

  // Maintain focus when dropdown opens
  useEffect(() => {
    // If dropdown is open and input should have focus, refocus it
    if (open && isFocused && document.activeElement !== inputRef.current) {
      inputRef.current?.focus();
    }
  }, [open, isFocused]);

  // Auto-focus after loading completes
  useEffect(() => {
    // When loading stops, ensure input has focus if it was focused before
    if (!isLoading && isFocused && document.activeElement !== inputRef.current) {
      inputRef.current?.focus();
    }
  }, [isLoading, isFocused]);

  // Open/close dropdown based on input value and search results
  useEffect(() => {
    if (value.length >= 2) {
      // Only keep open if loading or has results or has searched
      const shouldBeOpen = isLoading || hasResults || (hasSearched && value.length >= 2);

      // Update open state
      if (shouldBeOpen !== open) {
        setOpen(shouldBeOpen);

        // Ensure focus is maintained when dropdown opens
        if (shouldBeOpen && isFocused) {
          // Use requestAnimationFrame to ensure this happens after render
          requestAnimationFrame(() => {
            inputRef.current?.focus();
          });
        }
      }
    } else {
      setOpen(false);
    }
  }, [value, isLoading, hasResults, hasSearched, open, isFocused]);

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
    onChange(e.target.value);
    // Maintain focus state when typing
    setIsFocused(true);
  };

  // Handle focus state
  const handleFocus = () => {
    setIsFocused(true);

    // Only open dropdown if there's search content
    if (value.length >= 2 && (isLoading || hasResults || hasSearched)) {
      setOpen(true);
    }
  };

  // Handle blur state with native relatedTarget
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Check if focus is moving to a related component
    const relatedTarget = e.relatedTarget as HTMLElement;

    // If related target is null (outside document) or is not a dropdown element
    // Note: we rely on element IDs and known container classes
    const isMovingToPopover =
      relatedTarget &&
      // Moving to our dropdown
      (relatedTarget.closest(`[id="${listboxId}"]`) ||
        // Moving to command items
        relatedTarget.closest('.cmdk-item') ||
        // Moving to select items
        relatedTarget.hasAttribute('data-radix-select-trigger') ||
        relatedTarget.closest('[data-radix-select-content]'));

    if (isMovingToPopover) {
      // Don't change focus state if moving to dropdown elements
      e.preventDefault();
      // Re-focus the input after a slight delay
      setTimeout(() => {
        if (document.activeElement !== inputRef.current) {
          inputRef.current?.focus();
        }
      }, 10);
      return;
    }

    // Otherwise, update focus state
    setIsFocused(false);
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
        // Maintain focus on escape
        requestAnimationFrame(() => {
          inputRef.current?.focus();
        });
        break;
    }
  };

  // Handle search field change
  const handleSearchFieldChange = (value: string) => {
    const newSearchField = value as SearchField;

    if (onSearchFieldChange) {
      onSearchFieldChange(newSearchField);
    } else {
      setInternalSearchField(newSearchField);
    }

    // Clear input when changing search field
    onChange('');
    // Ensure input keeps focus
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  // Get placeholder text based on search field
  const getPlaceholder = () => {
    switch (searchField) {
      case 'email':
        return 'Add subscriber to this topic by email';
      case 'phone':
        return 'Add subscriber to this topic by phone';
      case 'name':
        return 'Add subscriber to this topic by name';
      default:
        return 'Add subscriber to this topic by subscriberId';
    }
  };

  // Field selector component
  const FieldSelector = (
    <AnimatePresence>
      {showFieldSelector && (
        <motion.div
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: 'auto' }}
          exit={{ opacity: 0, width: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <Select value={searchField} onValueChange={handleSearchFieldChange}>
            <SelectTrigger
              className={cn(
                'border-stroke-soft min-w-[110px] rounded-r-none border-r-0',
                size === 'xs' && 'h-8 px-2 text-xs',
                size === 'sm' && 'h-9 px-3 text-sm',
                size === 'md' && 'h-10 px-3 text-base'
              )}
            >
              <SelectValue placeholder="Field" />
            </SelectTrigger>
            <SelectContent
              onCloseAutoFocus={(e) => {
                e.preventDefault();
                inputRef.current?.focus();
              }}
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
  );

  // Loading skeletons
  const LoadingSkeletons = (
    <div className="space-y-2 p-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <Skeleton className={cn('h-8 w-8 rounded-full', size === 'xs' && 'h-6 w-6')} />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  );

  // Determine if popover should be shown
  const shouldShowPopover = value.length >= 2 && (isLoading || hasResults || hasSearched);

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="relative w-full">
        {/* Visually hidden label for screen readers */}
        <label id={labelId} className="sr-only">
          Search for subscribers by {searchField}
        </label>

        <Popover
          open={open && shouldShowPopover}
          onOpenChange={(isOpen) => {
            // Only allow changing open state if there are results or loading
            if (shouldShowPopover) {
              setOpen(isOpen);

              if (!isOpen) {
                // Reset highlighted index when closing
                setHighlightedIndex(-1);
              }

              // Keep input focused when dropdown state changes
              requestAnimationFrame(() => {
                if (isFocused && document.activeElement !== inputRef.current) {
                  inputRef.current?.focus();
                }
              });
            }
          }}
        >
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
              onFocus={handleFocus}
              onBlur={handleBlur}
              onClick={handleFocus}
              disabled={disabled}
              size={size}
              leadingNode={FieldSelector}
              trailingIcon={RiAddFill}
              className="w-full transition-all duration-200"
              autoComplete="off"
              aria-busy={combinedLoading}
              // Add tab index to ensure focusability
              tabIndex={0}
            />
          </PopoverTrigger>

          <PopoverContent
            className="w-[var(--radix-popover-trigger-width)] min-w-[240px] overflow-hidden p-0"
            align="start"
            sideOffset={5}
            onEscapeKeyDown={() => {
              setOpen(false);
              // Ensure input is focused when pressing escape
              requestAnimationFrame(() => {
                inputRef.current?.focus();
              });
            }}
            onInteractOutside={(e) => {
              // Prevent closing when clicking inside our components
              if (e.target === inputRef.current) {
                e.preventDefault();
                return;
              }

              setOpen(false);
              // If we're clicking elsewhere, allow focus to move
              setIsFocused(false);
            }}
            // Prevent PopoverContent from taking focus
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              // Keep input focused
              requestAnimationFrame(() => {
                inputRef.current?.focus();
              });
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
                  {isLoading && LoadingSkeletons}

                  {/* No results state */}
                  {!isLoading && subscribers.length === 0 && hasSearched && (
                    <CommandEmpty className="py-6 text-center">
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
                          onSelect={() => handleSelectSubscriber(subscriber)}
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

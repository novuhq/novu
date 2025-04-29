import { cn } from '@/utils/ui';
import { ISubscriberResponseDto } from '@novu/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RiAddFill, RiArrowDownLine, RiArrowUpLine, RiLoader4Line, RiSearchLine } from 'react-icons/ri';
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
  placeholder?: string;
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
  placeholder = 'Enter subscriberId',
  size = 'xs',
  disabled,
  className,
  isLoading: externalLoading,
  onSubmit,
  onSelectSubscriber,
  searchField: externalSearchField,
  onSearchFieldChange,
}: SubscriberAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverContentRef = useRef<HTMLDivElement>(null);

  // Use internal state if external state management isn't provided
  const [internalSearchField, setInternalSearchField] = useState<SearchField>('subscriberId');

  // Use external search field if provided, otherwise use internal state
  const searchField = externalSearchField || internalSearchField;

  const { subscribers, isLoading, hasSearched } = useSubscriberSearch(value, searchField);
  const prevLoadingRef = useRef(isLoading);
  const prevSubscribersRef = useRef<ISubscriberResponseDto[]>([]);
  const combinedLoading = isLoading || externalLoading;
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Keep track of whether we're rendering in response to a user typing
  const userTypingRef = useRef(false);
  // Track if we're handling search results
  const isHandlingResultsRef = useRef(false);
  // Track if the user is selecting text
  const isSelectingTextRef = useRef(false);
  // Track if mouse is down on the input
  const isMouseDownRef = useRef(false);

  // Track focus state
  const [hasFocus, setHasFocus] = useState(false);

  // Get placeholder based on search field
  const getPlaceholder = () => {
    switch (searchField) {
      case 'email':
        return 'Search subscriber by email';
      case 'phone':
        return 'Search subscriber by phone';
      case 'name':
        return 'Search subscriber by name';
      default:
        return 'Search subscriber by subscriberId';
    }
  };

  // Manage popover open state based on value length
  useEffect(() => {
    if (value.length >= 2) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [value]);

  // Force refocus on loading state changes
  useEffect(() => {
    if (prevLoadingRef.current && !isLoading) {
      // When loading completes, mark that we're handling results
      isHandlingResultsRef.current = true;

      // Keep input focused during result changes
      if (hasFocus && document.activeElement !== inputRef.current) {
        inputRef.current?.focus();
      }

      // Clear the handling flag after a short delay
      const timer = setTimeout(() => {
        isHandlingResultsRef.current = false;
      }, 100);

      return () => clearTimeout(timer);
    }

    prevLoadingRef.current = isLoading;
  }, [isLoading, hasFocus]);

  // Handle subscriber results changes
  useEffect(() => {
    // Skip initial render
    if (prevSubscribersRef.current.length === 0 && subscribers.length === 0) {
      prevSubscribersRef.current = subscribers;
      return;
    }

    // Reset highlighted index when results change
    setHighlightedIndex(-1);

    // When subscribers change, ensure focus is maintained
    if (JSON.stringify(prevSubscribersRef.current) !== JSON.stringify(subscribers)) {
      isHandlingResultsRef.current = true;

      if (hasFocus && document.activeElement !== inputRef.current) {
        const timer = setTimeout(() => {
          inputRef.current?.focus();
        }, 0);

        const cleanupTimer = setTimeout(() => {
          isHandlingResultsRef.current = false;
        }, 100);

        return () => {
          clearTimeout(timer);
          clearTimeout(cleanupTimer);
        };
      } else {
        isHandlingResultsRef.current = false;
      }
    }

    prevSubscribersRef.current = subscribers;
  }, [subscribers, hasFocus]);

  // Handle dropdown visibility based on input value
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      userTypingRef.current = true;
      const newValue = e.target.value;
      onChange(newValue);

      // Focus management handled by the effect
      setTimeout(() => {
        userTypingRef.current = false;
      }, 100);
    },
    [onChange]
  );

  const handleSelectSubscriber = useCallback(
    (subscriber: ISubscriberResponseDto) => {
      onChange(subscriber.subscriberId);
      setOpen(false);

      // Handle direct subscriber selection if callback provided
      if (onSelectSubscriber) {
        onSelectSubscriber(subscriber);
      }

      // Always focus the input with a delay to ensure focus isn't lost
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    },
    [onChange, onSelectSubscriber]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (open && subscribers.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setHighlightedIndex((prev) => (prev < subscribers.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : subscribers.length - 1));
        } else if (e.key === 'Enter') {
          e.preventDefault();

          if (highlightedIndex >= 0 && highlightedIndex < subscribers.length) {
            handleSelectSubscriber(subscribers[highlightedIndex]);
          } else if (onSubmit) {
            onSubmit();
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setOpen(false);
        }
      } else if (e.key === 'Enter' && onSubmit) {
        e.preventDefault();
        onSubmit();
      }
    },
    [onSubmit, open, subscribers, highlightedIndex, handleSelectSubscriber]
  );

  // Handle mouse events for text selection
  const handleMouseDown = useCallback(() => {
    isMouseDownRef.current = true;
    isSelectingTextRef.current = true;
  }, []);

  const handleMouseUp = useCallback(() => {
    isMouseDownRef.current = false;

    // Keep the selecting text flag active for a short time
    // to prevent focus loss during click and selection operations
    setTimeout(() => {
      isSelectingTextRef.current = false;
    }, 150);
  }, []);

  // Handle focus and blur events
  const handleFocus = useCallback(() => {
    setHasFocus(true);

    if (value.length >= 2) {
      setOpen(true);
    }
  }, [value]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    // Don't update focus state if we're in the middle of text selection
    // or if we're handling results or typing
    if (isSelectingTextRef.current || isHandlingResultsRef.current || userTypingRef.current || isMouseDownRef.current) {
      // If we're selecting text, refocus after a small delay
      e.preventDefault();
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
      return;
    }

    // Check if we're focusing inside the popover
    if (popoverContentRef.current?.contains(e.relatedTarget as Node)) {
      // If focusing inside popover, don't lose focus state
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
      return;
    }

    setHasFocus(false);
  }, []);

  // Simple popover open change handler
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      // If handling results, typing, or selecting text, don't allow closing
      if (isHandlingResultsRef.current || userTypingRef.current || isSelectingTextRef.current) {
        if (!newOpen) return;
      }

      // Only allow closing the popover if it wasn't during an interaction that needs focus
      if (!newOpen && !userTypingRef.current && !isHandlingResultsRef.current && !isSelectingTextRef.current) {
        setOpen(newOpen);

        // Focus the input when closing the popover
        if (hasFocus) {
          requestAnimationFrame(() => {
            inputRef.current?.focus();
          });
        }
      } else if (newOpen && value.length >= 2) {
        setOpen(true);
      }
    },
    [value, hasFocus]
  );

  // Generate loading skeletons
  const renderLoadingSkeletons = () => (
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

  // Check if a node is inside the popover content
  const isNodeInPopover = useCallback((node: Node | null): boolean => {
    if (!node || !popoverContentRef.current) return false;

    return popoverContentRef.current.contains(node);
  }, []);

  const handleSearchFieldChange = useCallback(
    (value: string) => {
      // Update internal state if no external handler provided
      if (!onSearchFieldChange) {
        setInternalSearchField(value as SearchField);
      } else {
        onSearchFieldChange(value as SearchField);
      }

      // Clear input when changing search field
      onChange('');
    },
    [onSearchFieldChange, onChange]
  );

  // Field selector component to be used as leadingNode
  const FieldSelector = (
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
      <SelectContent>
        <SelectItem value="subscriberId">Subscriber Id</SelectItem>
        <SelectItem value="email">Email</SelectItem>
        <SelectItem value="phone">Phone</SelectItem>
        <SelectItem value="name">Name</SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <Popover open={open && value.length >= 2} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <div className={cn('relative w-full', className)}>
          <Input
            ref={inputRef}
            value={value}
            placeholder={getPlaceholder()}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            disabled={disabled}
            size={size}
            leadingNode={FieldSelector}
            leadingIcon={RiAddFill}
            trailingIcon={RiSearchLine}
            className="w-full"
            autoComplete="off"
            aria-busy={combinedLoading}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent
        ref={popoverContentRef}
        className="w-[var(--radix-popover-trigger-width)] min-w-[240px] overflow-hidden p-0"
        align="start"
        sideOffset={5}
        onEscapeKeyDown={() => {
          setOpen(false);
          inputRef.current?.focus();
        }}
        onPointerDownOutside={(e) => {
          // Prevent focus loss when interacting with the popover content
          if (isNodeInPopover(e.target as Node) || isSelectingTextRef.current) {
            e.preventDefault();
            return;
          }

          // Don't focus if we're currently handling results or selecting text
          if (!isHandlingResultsRef.current && !isSelectingTextRef.current && !isMouseDownRef.current) {
            inputRef.current?.focus();
          }
        }}
        onInteractOutside={(e) => {
          // Only prevent default for interactions within the popover or during text selection
          if (isNodeInPopover(e.target as Node) || isHandlingResultsRef.current || isSelectingTextRef.current) {
            e.preventDefault();
          }
        }}
      >
        <div className="flex h-full flex-col" onMouseDown={(e) => e.stopPropagation()}>
          <Command>
            <CommandList className="overflow-y-auto">
              <Separator variant="solid-text" className="px-1.5 py-1">
                <div className="flex w-full justify-between rounded-t-md bg-neutral-50">
                  <div className="text-[11px] text-xs uppercase leading-[16px]">Subscribers</div>
                  {isLoading && <RiLoader4Line className="h-3 w-3 animate-spin text-neutral-400" />}
                </div>
              </Separator>

              {/* Loading state */}
              {isLoading && renderLoadingSkeletons()}

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
              {!isLoading && subscribers.length > 0 && (
                <CommandGroup>
                  {subscribers.map((subscriber, index) => (
                    <CommandItem
                      key={subscriber._id}
                      onSelect={() => handleSelectSubscriber(subscriber)}
                      className={cn('flex items-center gap-2 py-2', highlightedIndex === index && 'bg-neutral-100')}
                      onMouseEnter={() => setHighlightedIndex(index)}
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
        </div>
      </PopoverContent>
    </Popover>
  );
}

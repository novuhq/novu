import { ISubscriberResponseDto } from '@novu/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconType } from 'react-icons';
import { RiSearchLine } from 'react-icons/ri';
import { cn } from '@/utils/ui';
import { Autocomplete, AutocompleteItem } from '../primitives/autocomplete';
import { Avatar, AvatarFallback, AvatarImage } from '../primitives/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../primitives/select';
import { SearchField, useSubscriberSearch } from './hooks/use-subscriber-search';

interface SubscriberAutocompleteItem extends AutocompleteItem, ISubscriberResponseDto {
  id: string;
}

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
  const selectInteractionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Core state
  const [internalSearchField, setInternalSearchField] = useState<SearchField>('subscriberId');
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Use external search field if provided, otherwise use internal state
  const searchField = externalSearchField || internalSearchField;

  // Get search results
  const { subscribers, isLoading, hasSearched } = useSubscriberSearch(value, searchField);
  const combinedLoading = isLoading || externalLoading;

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
      if (!hasInteracted) {
        setIsSelectOpen(true);
        setHasInteracted(true);
      }
    }
  }, [value, hasInteracted]);

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
      // setOpen(false); // This will be handled by the Autocomplete component
    }
  }, []);

  // Get placeholder text based on search field
  const getPlaceholder = () => {
    let fieldSuffix: string;

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
                  // Keep input focused when select closes - handled by Autocomplete
                }}
                onPointerDownOutside={(e) => {
                  // If clicking the input or our select trigger, prevent closing
                  if ((e.target as HTMLElement).closest('[data-radix-select-trigger]')) {
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
    [searchField, isSelectOpen, size, handleSearchFieldChange, handleSelectOpenChange]
  );

  // Convert subscribers to autocomplete items
  const subscriberItems: SubscriberAutocompleteItem[] = subscribers.map((subscriber) => ({
    ...subscriber,
    id: subscriber.subscriberId,
  }));

  return (
    <Autocomplete
      value={value}
      onChange={onChange}
      items={subscriberItems}
      isLoading={combinedLoading}
      hasSearched={hasSearched}
      onSelectItem={(item) => {
        const originalSubscriber = subscribers.find((s) => s.subscriberId === item.id);
        if (originalSubscriber && onSelectSubscriber) {
          onSelectSubscriber(originalSubscriber);
        }
      }}
      size={size}
      disabled={disabled}
      className={className}
      placeholder={getPlaceholder()}
      trailingIcon={trailingIcon}
      leadingNode={FieldSelector}
      sectionTitle="Subscribers"
      emptyStateTitle="No subscribers found"
      emptyStateDescription="Try a different search term or add a new subscriber"
      onSubmit={onSubmit}
      renderItem={(item) => {
        const subscriber = item as SubscriberAutocompleteItem;
        return (
          <div className="flex items-center gap-2">
            <Avatar className={cn('h-8 w-8', size === 'xs' && 'h-6 w-6')}>
              {subscriber.avatar && <AvatarImage src={subscriber.avatar} />}
              <AvatarFallback>{`${subscriber.firstName?.[0] || ''}${subscriber.lastName?.[0] || ''}`}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">
                {subscriber.firstName || ''} {subscriber.lastName || ''}
              </span>
              <span className="text-foreground-400 text-xs">{subscriber.email || subscriber.subscriberId}</span>
            </div>
          </div>
        );
      }}
    />
  );
}

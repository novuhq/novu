import { Command } from 'cmdk';
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/primitives/command';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/primitives/popover';
import { cn } from '@/utils/ui';
import { Tag } from './tag';

type TagInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size'> & {
  value: string[];
  suggestions: string[];
  onChange: (tags: string[]) => void;
  size?: 'sm' | 'md' | 'xs';
  hideTags?: boolean;
  onAddTag?: (tag: string) => void;
  hasError?: boolean;
  popoverClassName?: string;
  popoverSideOffset?: number;
};

const normalizeTag = (tag: string) => tag.trim().toLowerCase();

const TagInput = forwardRef<HTMLInputElement, TagInputProps>((props, ref) => {
  const {
    className,
    suggestions = [],
    value = [],
    onChange,
    onBlur,
    hideTags = false,
    onAddTag,
    size = 'xs',
    hasError,
    popoverClassName,
    popoverSideOffset = 8,
    ...rest
  } = props;
  const [tags, setTags] = useState<string[]>(Array.isArray(value) ? value : []);
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isClickingInputRef = useRef(false);

  useEffect(() => {
    if (Array.isArray(value)) {
      setTags(value);
    }
  }, [value]);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  const normalizedValueTagSet = useMemo(() => {
    const set = new Set<string>();
    for (const t of value || []) {
      const n = normalizeTag(t ?? '');
      if (n) {
        set.add(n);
      }
    }

    return set;
  }, [value]);

  const normalizedSuggestionSet = useMemo(() => {
    const set = new Set<string>();
    for (const s of suggestions || []) {
      const n = normalizeTag(s ?? '');
      if (n) {
        set.add(n);
      }
    }

    return set;
  }, [suggestions]);

  const validSuggestions = useMemo(
    () =>
      (suggestions || []).filter((suggestion) => {
        const n = normalizeTag(suggestion ?? '');

        return n.length > 0 && !normalizedValueTagSet.has(n);
      }),
    [normalizedValueTagSet, suggestions]
  );

  const filteredSuggestions = useMemo(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) return validSuggestions;
    const searchLower = trimmed.toLowerCase();
    return validSuggestions.filter((s) => s?.toLowerCase().includes(searchLower));
  }, [inputValue, validSuggestions]);

  const isNewTag = useMemo(() => {
    const key = normalizeTag(inputValue);
    if (!key) {
      return false;
    }

    return !normalizedSuggestionSet.has(key) && !normalizedValueTagSet.has(key);
  }, [inputValue, normalizedSuggestionSet, normalizedValueTagSet]);

  const shouldShowPopover = useMemo(() => {
    if (!isOpen) return false;
    const trimmed = inputValue.trim();
    if (!trimmed) return validSuggestions.length > 0;
    return filteredSuggestions.length > 0 || isNewTag;
  }, [isOpen, inputValue, validSuggestions.length, filteredSuggestions.length, isNewTag]);

  const addTag = useCallback(
    (tag: string) => {
      if (!tag) return;

      const newTag = tag.trim();
      const key = normalizeTag(newTag);
      if (!newTag || !key) return;

      const existingNormalized = new Set(tags.map((t) => normalizeTag(t ?? '')).filter((n) => n.length > 0));
      if (existingNormalized.has(key)) return;

      const newTags = [...tags, newTag];
      if (onAddTag) {
        onAddTag(newTag);
      } else {
        onChange(newTags);
      }

      setInputValue('');
      setIsOpen(false);
    },
    [tags, onChange, onAddTag]
  );

  const removeTag = useCallback(
    (tag: string) => {
      if (!tag) return;
      const newTags = tags.filter((t) => t !== tag);
      onChange(newTags);
      setInputValue('');
    },
    [tags, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      } else if (e.key === 'Enter' && inputValue.trim()) {
        e.preventDefault();
        addTag(inputValue);
      }
    },
    [inputValue, addTag]
  );

  const handleClick = useCallback(() => {
    isClickingInputRef.current = true;
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    if (validSuggestions.length > 0 || inputValue.trim()) {
      setIsOpen(true);
    }
    setTimeout(() => {
      isClickingInputRef.current = false;
    }, 100);
  }, [inputValue, validSuggestions.length]);

  const handleFocus = useCallback(() => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    if (validSuggestions.length > 0 || inputValue.trim()) {
      setIsOpen(true);
    }
  }, [inputValue, validSuggestions.length]);

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
      blurTimeoutRef.current = setTimeout(() => {
        setIsOpen(false);
        onBlur?.(e);
      }, 150);
    },
    [onBlur]
  );

  const handlePointerDownOutside = useCallback((e: Event) => {
    const target = e.target as HTMLElement;
    if (target?.closest && !target.closest('[cmdk-input-wrapper]')) {
      setIsOpen(false);
    }
  }, []);

  return (
    <div className="w-full overflow-visible">
      <Popover open={shouldShowPopover}>
        <Command loop shouldFilter={false} className="overflow-visible">
          <PopoverAnchor asChild>
            <div className={cn('flex flex-col gap-2 overflow-visible', !hideTags && 'pb-0.5')}>
              <div className="px-0.5">
                <CommandInput
                  ref={ref}
                  autoComplete="off"
                  value={inputValue}
                  className={cn('grow', className)}
                  size={size}
                  hasError={hasError}
                  onValueChange={(value) => {
                    setInputValue(value);
                    setIsOpen(Boolean(value.trim()) || validSuggestions.length > 0);
                  }}
                  onClick={handleClick}
                  onFocus={handleFocus}
                  onKeyDown={handleKeyDown}
                  onBlur={handleBlur}
                  {...rest}
                />
              </div>
              {!hideTags && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <Tag
                      key={`${tag}-${index}`}
                      variant="stroke"
                      className="max-w-48 shrink-0"
                      onDismiss={(e) => {
                        e?.preventDefault();
                        e?.stopPropagation();
                        removeTag(tag);
                      }}
                      dismissTestId={`tags-badge-remove-${tag}`}
                    >
                      <span
                        className="block max-w-full truncate"
                        style={{ wordBreak: 'break-all' }}
                        data-testid="tags-badge-value"
                        title={tag}
                      >
                        {tag}
                      </span>
                    </Tag>
                  ))}
                </div>
              )}
            </div>
          </PopoverAnchor>
          <CommandList>
            {(filteredSuggestions.length > 0 || isNewTag) && (
              <PopoverContent
                className={cn(
                  'bg-bg-white text-foreground-600 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 relative z-50 max-h-96 w-(--radix-popover-trigger-width) overflow-hidden rounded-[8px] border border-stroke-soft p-1.5 shadow-lg',
                  popoverClassName
                )}
                portal={false}
                onOpenAutoFocus={(e) => e.preventDefault()}
                align="start"
                sideOffset={popoverSideOffset}
                onPointerDownOutside={handlePointerDownOutside}
              >
                <CommandGroup className="p-0!">
                  {isNewTag && inputValue.trim() && (
                    <CommandItem
                      className="rounded-md px-2.5 py-2"
                      value={inputValue.trim()}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onSelect={() => addTag(inputValue)}
                    >
                      <span className="text-foreground-400 text-xs font-medium">Create:</span>
                      <span className="ml-1 truncate text-xs text-text-strong">{inputValue.trim()}</span>
                    </CommandItem>
                  )}

                  {isNewTag && filteredSuggestions.length > 0 && <div className="bg-stroke-soft my-1 h-px" />}

                  {filteredSuggestions.map((tag) => (
                    <CommandItem
                      className="rounded-md px-2.5 py-2"
                      key={tag}
                      value={`${tag}-suggestion`}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onSelect={() => addTag(tag)}
                    >
                      <span className="truncate">{tag}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </PopoverContent>
            )}
          </CommandList>
        </Command>
      </Popover>
    </div>
  );
});

TagInput.displayName = 'TagInput';

export { TagInput };

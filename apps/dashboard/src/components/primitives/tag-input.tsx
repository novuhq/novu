'use client';

import { CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/primitives/command';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/primitives/popover';
import { cn } from '@/utils/ui';
import { Command } from 'cmdk';
import { forwardRef, useEffect, useMemo, useState } from 'react';
import { Tag } from './tag';

type TagInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
  value: string[];
  suggestions: string[];
  onChange: (tags: string[]) => void;
  size?: 'sm' | 'md' | 'xs';
};

const TagInput = forwardRef<HTMLInputElement, TagInputProps>((props, ref) => {
  const { className, suggestions, value, onChange, ...rest } = props;
  const [tags, setTags] = useState<string[]>(value);
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const validSuggestions = useMemo(
    () => suggestions.filter((suggestion) => !tags.includes(suggestion)),
    [tags, suggestions]
  );

  useEffect(() => {
    setTags(value);
  }, [value]);

  const addTag = (tag: string) => {
    const newTag = tag.trim();
    if (newTag === '') {
      return;
    }

    const newTags = [...tags, tag];
    if (new Set(newTags).size !== newTags.length) {
      return;
    }

    onChange(newTags);
    setInputValue('');
    setIsOpen(false);
  };

  const removeTag = (tag: string) => {
    const newTags = [...tags];
    const index = newTags.indexOf(tag);
    if (index !== -1) {
      newTags.splice(index, 1);
    }
    onChange(newTags);
    setInputValue('');
  };

  return (
    <Popover open={isOpen}>
      <Command loop>
        <div className="flex flex-col gap-2 pb-0.5">
          <PopoverAnchor asChild>
            <CommandInput
              ref={ref}
              autoComplete="off"
              value={inputValue}
              className={cn('flex-grow', className)}
              placeholder="Type a tag and press Enter"
              onValueChange={(value) => {
                setInputValue(value);
                if (value) {
                  setIsOpen(true);
                }
              }}
              onClick={() => setIsOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsOpen(false);
                }
              }}
              {...rest}
            />
          </PopoverAnchor>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <Tag key={index} variant="stroke" onDismiss={() => removeTag(tag)}>
                <span style={{ wordBreak: 'break-all' }}>{tag}</span>
              </Tag>
            ))}
          </div>
        </div>
        <CommandList>
          {(validSuggestions.length > 0 || inputValue !== '') && (
            <PopoverContent
              className="max-h-64 w-32 p-1"
              portal={false}
              onOpenAutoFocus={(e) => {
                e.preventDefault();
              }}
              align="start"
              sideOffset={4}
              onPointerDownOutside={(e) => {
                const target = e.target as HTMLElement;

                if (!target.closest('[cmdk-input-wrapper]')) {
                  setIsOpen(false);
                }
              }}
            >
              <CommandGroup>
                {inputValue !== '' && !validSuggestions.includes(inputValue) && (
                  <CommandItem
                    value={inputValue}
                    onSelect={() => {
                      addTag(inputValue);
                    }}
                    className="gap-1"
                    disabled={inputValue === '' || tags.includes(inputValue)}
                  >
                    {inputValue}
                  </CommandItem>
                )}

                {validSuggestions.map((tag) => (
                  <CommandItem
                    key={tag}
                    // We can't have duplicate keys in our list so adding a suffix
                    // here to differentiate this from the value typed
                    value={`${tag}-suggestion`}
                    onSelect={() => {
                      addTag(tag);
                    }}
                  >
                    {tag}
                  </CommandItem>
                ))}
              </CommandGroup>
            </PopoverContent>
          )}
        </CommandList>
      </Command>
    </Popover>
  );
});

export { TagInput };

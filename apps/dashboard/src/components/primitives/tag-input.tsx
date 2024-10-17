'use client';

import { Badge } from '@/components/primitives/badge';
import { Input, InputField } from '@/components/primitives/input';
import { cn } from '@/utils/ui';
import { forwardRef, useEffect, useState } from 'react';
import { RiCloseFill } from 'react-icons/ri';

type TagInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  value: string[];
  onChange: (tags: string[]) => void;
};

const TagInput = forwardRef<HTMLInputElement, TagInputProps>((props, ref) => {
  const { className, value, onChange, ...rest } = props;
  const [tags, setTags] = useState<string[]>(value);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    setTags(value);
  }, [value]);

  const addTag = (tag: string) => {
    const newTags = [...tags, tag];
    if (new Set(newTags).size !== newTags.length) {
      return;
    }
    onChange(newTags);
    setInputValue('');
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      if (inputValue === '') {
        return;
      }

      addTag(inputValue);
    }
  };

  return (
    <div className="flex flex-col space-y-2">
      <InputField>
        <Input
          ref={ref}
          type="text"
          value={inputValue}
          onKeyDown={handleKeyDown}
          className={cn('flex-grow', className)}
          placeholder="Type a tag and press Enter"
          onChange={(e) => setInputValue(e.target.value)}
          {...rest}
        />
      </InputField>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, index) => (
          <Badge key={index} variant="outline" kind="tag">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-1 rounded-full outline-none focus:outline-none"
            >
              <RiCloseFill className="size-3" />
              <span className="sr-only">Remove tag</span>
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
});
TagInput.displayName = 'TagInput';

export { TagInput };

import { Editor } from '@tiptap/core';
import { CornerDownLeft } from 'lucide-react';
import { forwardRef, HTMLAttributes, useCallback, useRef } from 'react';
import { VariableSuggestionsPopoverRef } from '@/editor/nodes/variable/variable-suggestions-popover';
import { cn } from '@/editor/utils/classname';
import { AUTOCOMPLETE_PASSWORD_MANAGERS_OFF } from '@/editor/utils/constants';
import { useVariableOptions } from '@/editor/utils/node-options';
import { useOutsideClick } from '@/editor/utils/use-outside-click';

type InputAutocompleteProps = HTMLAttributes<HTMLInputElement> & {
  value: string;
  onValueChange: (value: string) => void;

  autoCompleteOptions?: string[];
  onSelectOption?: (option: string) => void;

  onOutsideClick?: () => void;
  triggerChar?: string;
  placeholder?: string;

  editor: Editor;
};

export const InputAutocomplete = forwardRef<HTMLInputElement, InputAutocompleteProps>((props, ref) => {
  const {
    value = '',
    onValueChange,
    className,
    onOutsideClick,
    onSelectOption,
    autoCompleteOptions = [],
    triggerChar = '',
    editor,
    ...inputProps
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<VariableSuggestionsPopoverRef>(null);
  const VariableSuggestionPopoverComponent = useVariableOptions(editor)?.variableSuggestionsPopover;

  // Memoize the outside click callback to prevent dependency array changes
  const handleOutsideClick = useCallback(() => {
    onOutsideClick?.();
  }, [onOutsideClick]);

  useOutsideClick(containerRef, handleOutsideClick);

  const isTriggeringVariable = value.startsWith(triggerChar);

  return (
    <div className={cn('mly-relative')} ref={containerRef}>
      <label className="mly-relative">
        <input
          {...AUTOCOMPLETE_PASSWORD_MANAGERS_OFF}
          placeholder="e.g. items"
          type="text"
          {...inputProps}
          ref={ref}
          value={value}
          onChange={(e) => {
            onValueChange(e.target.value);
          }}
          className={cn(
            'mly-h-7 mly-w-40 mly-rounded-md mly-bg-white mly-px-2 mly-pr-6 mly-text-sm mly-text-midnight-gray hover:mly-bg-soft-gray focus:mly-bg-soft-gray focus:mly-outline-none',
            className
          )}
          onKeyDown={(e) => {
            if (!popoverRef.current || !isTriggeringVariable) {
              return;
            }
            const { moveUp, moveDown, select } = popoverRef.current;

            if (e.key === 'ArrowDown') {
              e.preventDefault();
              moveDown();
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              moveUp();
            } else if (e.key === 'Enter') {
              e.preventDefault();
              select();
            }
          }}
          spellCheck={false}
        />
        <div className="mly-absolute mly-inset-y-0 mly-right-1 mly-flex mly-items-center">
          <CornerDownLeft className="mly-h-3 mly-w-3 mly-stroke-[2.5] mly-text-midnight-gray" />
        </div>
      </label>

      {isTriggeringVariable && VariableSuggestionPopoverComponent && (
        <div className="mly-absolute mly-left-0 mly-top-8">
          <VariableSuggestionPopoverComponent
            items={autoCompleteOptions.map((option) => {
              return {
                name: option,
              };
            })}
            onSelectItem={(item) => {
              onSelectOption?.(item.name);
            }}
            ref={popoverRef}
          />
        </div>
      )}
    </div>
  );
});

InputAutocomplete.displayName = 'InputAutocomplete';

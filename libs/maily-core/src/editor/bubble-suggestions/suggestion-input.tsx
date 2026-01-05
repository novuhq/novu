import { Editor } from '@tiptap/core';
import { CornerDownLeft } from 'lucide-react';
import { forwardRef, HTMLAttributes, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VariableSuggestionsPopoverRef } from '@/editor/nodes/variable/variable-suggestions-popover';
import { cn } from '@/editor/utils/classname';
import { AUTOCOMPLETE_PASSWORD_MANAGERS_OFF } from '@/editor/utils/constants';
import { useInlineDecoratorOptions, useVariableOptions } from '@/editor/utils/node-options';
import { useOutsideClick } from '@/editor/utils/use-outside-click';
import { SuggestionItem, SuggestionProvider } from './suggestion-provider';
import { useActiveSuggestion, useSuggestionProviders } from './use-suggestion-providers';

type SuggestionInputProps = HTMLAttributes<HTMLInputElement> & {
  value: string;
  onValueChange: (value: string) => void;
  onSelectSuggestion?: (provider: SuggestionProvider, item: SuggestionItem, formattedValue: string) => void;
  enabledProviders?: string[];
  onOutsideClick?: () => void;
  placeholder?: string;
  editor: Editor;
};

export const SuggestionInput = forwardRef<HTMLInputElement, SuggestionInputProps>((props, ref) => {
  const {
    value = '',
    onValueChange,
    onSelectSuggestion,
    enabledProviders,
    onOutsideClick,
    className,
    editor,
    ...inputProps
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<VariableSuggestionsPopoverRef>(null);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Get available providers and detect active suggestion
  const providers = useSuggestionProviders(editor, enabledProviders);
  const activeSuggestion = useActiveSuggestion(value, providers);

  // Always call hooks at the top level - never conditionally
  const variableOptions = useVariableOptions(editor);
  const inlineDecoratorOptions = useInlineDecoratorOptions(editor);

  // Get the appropriate popover component based on the active provider
  const VariableSuggestionPopoverComponent = useMemo(() => {
    if (!activeSuggestion) {
      return variableOptions?.variableSuggestionsPopover;
    }

    // Use inline decorator popover for inline decorator suggestions
    if (activeSuggestion.provider.name === 'inlineDecorator') {
      return inlineDecoratorOptions?.variableSuggestionsPopover;
    }

    // Default to variable popover for other providers
    return variableOptions?.variableSuggestionsPopover;
  }, [activeSuggestion, variableOptions, inlineDecoratorOptions]);

  // Memoize the outside click callback to prevent dependency array changes
  const handleOutsideClick = useCallback(() => {
    onOutsideClick?.();
  }, [onOutsideClick]);

  useOutsideClick(containerRef, handleOutsideClick);

  // Load suggestions when active suggestion changes
  useEffect(() => {
    if (!activeSuggestion) {
      setSuggestions([]);
      return;
    }

    const loadSuggestions = async () => {
      setIsLoading(true);
      try {
        const result = await activeSuggestion.provider.getSuggestions(activeSuggestion.query, editor);
        setSuggestions(Array.isArray(result) ? result : []);
      } catch (error) {
        console.error('Failed to load suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadSuggestions();
  }, [activeSuggestion, editor]);

  const handleSelectItem = (item: SuggestionItem) => {
    if (!activeSuggestion) return;

    const formattedValue = activeSuggestion.provider.formatValue(item);

    // Replace the trigger + query with the formatted value
    const beforeTrigger = value.slice(0, activeSuggestion.triggerIndex);
    const newValue = beforeTrigger + formattedValue;

    onValueChange(newValue);
    onSelectSuggestion?.(activeSuggestion.provider, item, newValue);
  };

  const isTriggering = !!activeSuggestion && suggestions.length > 0;

  return (
    <div className={cn('mly-relative')} ref={containerRef}>
      <label className="mly-relative">
        <input
          {...AUTOCOMPLETE_PASSWORD_MANAGERS_OFF}
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
            if (!popoverRef.current || !isTriggering) {
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

      {isTriggering && VariableSuggestionPopoverComponent && (
        <div className="mly-absolute mly-left-0 mly-top-8">
          <VariableSuggestionPopoverComponent
            items={suggestions.map((suggestion) => ({
              name: suggestion.id,
              label: suggestion.label,
            }))}
            onSelectItem={(item) => {
              const suggestion = suggestions.find((s) => s.id === item.name);
              if (suggestion) {
                handleSelectItem(suggestion);
              }
            }}
            ref={popoverRef}
          />
        </div>
      )}

      {isLoading && (
        <div className="mly-absolute mly-left-0 mly-top-8 mly-rounded-md mly-bg-white mly-p-2 mly-shadow-md">
          Loading suggestions...
        </div>
      )}
    </div>
  );
});

SuggestionInput.displayName = 'SuggestionInput';

import { Editor } from '@tiptap/core';
import { useEffect, useRef, useState } from 'react';
import { SuggestionInput, useMatchingProvider, useSuggestionProviders } from '@/editor/bubble-suggestions';
import { DEFAULT_PLACEHOLDER_URL, useMailyContext } from '@/editor/provider';
import { cn } from '@/editor/utils/classname';

type ButtonLabelInputProps = {
  value: string;
  onValueChange?: (value: string, isFromSuggestion?: boolean) => void;
  isVariable?: boolean;
  enabledProviders?: string[];
  editor: Editor;
  className?: string;
};

export function ButtonLabelInput(props: ButtonLabelInputProps) {
  const {
    value,
    onValueChange,
    isVariable,
    enabledProviders = ['variable', 'inlineDecorator'],
    editor,
    className,
  } = props;

  const linkInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(!isVariable);
  const isFullWidth = Boolean(className && /\bmly-w-full\b/.test(className));

  const { placeholderUrl = DEFAULT_PLACEHOLDER_URL } = useMailyContext();

  const providers = useSuggestionProviders(editor, enabledProviders);
  const matchingProvider = useMatchingProvider(value, providers);

  // Reset collapsed/expanded state when the bound value changes (e.g. button tab switch).
  useEffect(() => {
    setIsEditing(!isVariable);
  }, [isVariable, value]);

  // Same as URL / LinkInputPopover: collapsed pill is click-to-edit so the variable
  // can be released or replaced. Use `bubble-variable` so the pill does not open
  // Configure Variable (that flow stays on the face button).
  const showPill = !isEditing && !!isVariable && !!matchingProvider;

  if (showPill) {
    return (
      <button
        type="button"
        className={cn(
          'mly-box-border mly-flex mly-h-6 mly-max-h-6 mly-min-h-6 mly-min-w-0 mly-items-center mly-overflow-hidden mly-rounded mly-px-1.5',
          isFullWidth && 'mly-w-full',
          className
        )}
        onClick={() => {
          setIsEditing(true);
          setTimeout(() => {
            linkInputRef.current?.focus();
          }, 0);
        }}
      >
        <span className="mly-flex mly-h-full mly-max-h-full mly-min-h-0 mly-min-w-0 mly-items-center mly-overflow-hidden">
          {matchingProvider.renderValue(value, editor, 'bubble-variable')}
        </span>
      </button>
    );
  }

  return (
    // Keep the field shell at h-6 so pill ↔ input swaps don't shift the form.
    // Autocomplete is portaled/absolute below the input — only the input is clipped.
    <div className={cn('mly-relative mly-h-6 mly-max-h-6 mly-min-h-6 mly-min-w-0', isFullWidth && 'mly-w-full')}>
      <SuggestionInput
        editor={editor}
        value={value}
        onValueChange={(next) => {
          onValueChange?.(next);
        }}
        enabledProviders={enabledProviders}
        ref={linkInputRef}
        placeholder={placeholderUrl}
        containerClassName={cn('mly-h-full', isFullWidth && 'mly-w-full')}
        className={cn(
          'mly-box-border mly-h-6 mly-max-h-6 mly-w-40 mly-rounded-md mly-px-2 mly-pr-6 mly-text-sm mly-text-midnight-gray hover:mly-bg-soft-gray focus:mly-bg-soft-gray focus:mly-outline-none',
          className
        )}
        onSelectSuggestion={(_provider, _item, formattedValue, isWholeFieldSuggestion) => {
          // Whole-field variable → pill + is*Variable. Mixed text + `{{var}}` stays free text
          // (same model as the in-app subject field / NV-8543).
          if (isWholeFieldSuggestion) {
            setIsEditing(false);
          }

          onValueChange?.(formattedValue, isWholeFieldSuggestion);
        }}
        onOutsideClick={() => {
          if (matchingProvider && isVariable) {
            setIsEditing(false);
          }
        }}
      />
    </div>
  );
}

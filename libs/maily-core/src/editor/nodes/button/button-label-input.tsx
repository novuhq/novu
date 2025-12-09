import { Editor } from '@tiptap/core';
import { useRef, useState } from 'react';
import { SuggestionInput, useMatchingProvider, useSuggestionProviders } from '@/editor/bubble-suggestions';
import { DEFAULT_PLACEHOLDER_URL, useMailyContext } from '@/editor/provider';

type ButtonLabelInputProps = {
  value: string;
  onValueChange?: (value: string, isFromSuggestion?: boolean) => void;
  isVariable?: boolean;
  enabledProviders?: string[];
  editor: Editor;
};

export function ButtonLabelInput(props: ButtonLabelInputProps) {
  const { value, onValueChange, isVariable, enabledProviders = ['variable', 'inlineDecorator'], editor } = props;

  const linkInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(!isVariable);

  const { placeholderUrl = DEFAULT_PLACEHOLDER_URL } = useMailyContext();

  // Get available providers and find matching provider for current value
  const providers = useSuggestionProviders(editor, enabledProviders);
  const matchingProvider = useMatchingProvider(value, providers);

  return (
    <div className="mly-isolate mly-flex mly-rounded-lg">
      {!isEditing && matchingProvider && (
        <button
          onClick={() => {
            setIsEditing(true);
            setTimeout(() => {
              linkInputRef.current?.focus();
            }, 0);
          }}
        >
          {matchingProvider.renderValue(value, editor, 'bubble-variable')}
        </button>
      )}

      {(isEditing || !matchingProvider) && (
        <SuggestionInput
          editor={editor}
          value={value}
          onValueChange={(value) => {
            onValueChange?.(value);
          }}
          enabledProviders={enabledProviders}
          ref={linkInputRef}
          placeholder={placeholderUrl}
          className="mly-h-7 mly-w-40 mly-rounded-md mly-px-2 mly-pr-6 mly-text-sm mly-text-midnight-gray hover:mly-bg-soft-gray focus:mly-bg-soft-gray focus:mly-outline-none"
          onSelectSuggestion={(provider, item, formattedValue) => {
            setIsEditing(false);
            onValueChange?.(formattedValue, true);
          }}
          onOutsideClick={() => {
            if (!matchingProvider) {
              setIsEditing(false);
            }
          }}
        />
      )}
    </div>
  );
}

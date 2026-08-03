import { Editor } from '@tiptap/core';
import { Link2 } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { DEFAULT_VARIABLE_TRIGGER_CHAR } from '@/editor/nodes/variable/variable';
import { DEFAULT_PLACEHOLDER_URL, useMailyContext } from '@/editor/provider';
import { useVariableOptions } from '@/editor/utils/node-options';
import { processVariables } from '@/editor/utils/variable';
import { InputAutocomplete } from '../ui/input-autocomplete';

type CardActionsUrlInputProps = {
  value: string;
  isVariable?: boolean;
  onValueChange: (value: string, isVariable?: boolean) => void;
  editor: Editor;
};

/**
 * Inline, full-width, variable-aware URL field for the actions menu. Mirrors the
 * editing branch of `LinkInputPopover` but renders inline (no popover) to match
 * the actions row form layout.
 */
export function CardActionsUrlInput(props: CardActionsUrlInputProps) {
  const { value, isVariable, onValueChange, editor } = props;

  const inputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(!isVariable);

  const { placeholderUrl = DEFAULT_PLACEHOLDER_URL } = useMailyContext();
  const options = useVariableOptions(editor);

  const renderVariable = options?.renderVariable;
  const variables = options?.variables;
  const variableTriggerCharacter = options?.suggestion?.char ?? DEFAULT_VARIABLE_TRIGGER_CHAR;

  const autoCompleteOptions = useMemo(() => {
    const withoutTrigger = String(value || '').replace(new RegExp(variableTriggerCharacter, 'g'), '');

    return processVariables(variables || [], {
      query: withoutTrigger || '',
      from: 'bubble-variable',
      editor,
    }).map((variable) => variable.name);
  }, [variables, variableTriggerCharacter, value, editor]);

  if (!isEditing && isVariable && renderVariable) {
    return (
      <button
        type="button"
        className="mly-flex mly-h-7 mly-w-full mly-items-center mly-rounded-md mly-px-2 hover:mly-bg-soft-gray"
        onClick={() => {
          setIsEditing(true);
          setTimeout(() => {
            inputRef.current?.focus();
          }, 0);
        }}
      >
        {renderVariable({
          variable: { name: String(value || ''), valid: true },
          fallback: '',
          from: 'bubble-variable',
          editor,
        })}
      </button>
    );
  }

  return (
    <div className="mly-relative mly-w-full">
      <div className="mly-pointer-events-none mly-absolute mly-inset-y-0 mly-left-2 mly-z-10 mly-flex mly-items-center">
        <Link2 className="mly-h-3 mly-w-3 mly-stroke-[2.5] mly-text-midnight-gray" />
      </div>

      <InputAutocomplete
        editor={editor}
        value={String(value || '')}
        onValueChange={(next) => {
          onValueChange(next);
        }}
        autoCompleteOptions={autoCompleteOptions}
        ref={inputRef}
        placeholder={placeholderUrl}
        className="mly-h-7 mly-w-full mly-rounded-md mly-border mly-border-gray-200 mly-pl-7 mly-pr-6"
        triggerChar={variableTriggerCharacter}
        onSelectOption={(next) => {
          const nextIsVariable = autoCompleteOptions.includes(next);

          if (nextIsVariable) {
            setIsEditing(false);
          }

          onValueChange(next, nextIsVariable);
        }}
      />
    </div>
  );
}

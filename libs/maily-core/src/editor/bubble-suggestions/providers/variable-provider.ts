import { Editor } from '@tiptap/core';
import { DEFAULT_VARIABLE_TRIGGER_CHAR, Variable } from '../../nodes/variable/variable';
import { getVariableOptions } from '../../utils/node-options';
import { processVariables } from '../../utils/variable';
import { SuggestionItem, SuggestionProvider } from '../suggestion-provider';

function isNewVariableSuggestion(variable: Variable): boolean {
  return variable.type === 'new-variable';
}

export function createVariableProvider(editor: Editor): SuggestionProvider | null {
  try {
    const options = getVariableOptions(editor);

    if (!options?.variables) {
      return null;
    }

    const triggerChar = options.suggestion?.char ?? DEFAULT_VARIABLE_TRIGGER_CHAR;

    return {
      name: 'variable',
      triggerPattern: triggerChar,

      getSuggestions: (query: string) => {
        return processVariables(options.variables, {
          query,
          from: 'bubble-variable',
          editor,
        }).map(
          (variable): SuggestionItem => ({
            id: variable.name,
            label: variable.displayLabel ?? variable.name,
            data: variable,
          })
        );
      },

      formatValue: (item) => item.id,

      onSelect: (item) => {
        const variable = item.data as Variable | undefined;

        if (variable && isNewVariableSuggestion(variable)) {
          void options.onCreateNewVariable?.(item.id);
        }
      },

      renderValue: (value, editorInstance, from) => {
        return (
          options.renderVariable?.({
            variable: { name: value, valid: true },
            fallback: '',
            from,
            editor: editorInstance,
          }) || value
        );
      },

      isMatch: (value) => {
        // Don't match values that contain the trigger character
        if (value.includes(triggerChar)) return false;

        const variables = processVariables(options.variables, {
          query: '',
          from: 'bubble-variable',
          editor,
        });

        if (variables.some((v) => v.name === value)) {
          return true;
        }

        // Newly created payload paths can be selected before the schema refreshes.
        return value.startsWith('payload.') && value !== 'payload';
      },
    };
  } catch (error) {
    console.warn('Failed to create variable provider:', error);
    return null;
  }
}

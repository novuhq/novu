import { Editor } from '@tiptap/core';
import { DEFAULT_VARIABLE_TRIGGER_CHAR } from '../../nodes/variable/variable';
import { getVariableOptions } from '../../utils/node-options';
import { processVariables } from '../../utils/variable';
import { SuggestionItem, SuggestionProvider } from '../suggestion-provider';

// Helper function to get variables
function getVariables(variablesOption: any, query: string, editor: Editor): any[] {
  return Array.isArray(variablesOption) ? variablesOption : variablesOption({ query, from: 'bubble-variable', editor });
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
        const variables = getVariables(options.variables, query, editor);

        return processVariables(variables, {
          query,
          from: 'bubble-variable',
          editor,
        }).map(
          (variable): SuggestionItem => ({
            id: variable.name,
            label: variable.name,
            data: variable,
          })
        );
      },

      formatValue: (item) => item.id,

      renderValue: (value, editor, from) => {
        return (
          options.renderVariable?.({
            variable: { name: value, valid: true },
            fallback: '',
            from,
            editor,
          }) || value
        );
      },

      isMatch: (value) => {
        // Don't match values that contain the trigger character
        if (value.includes(triggerChar)) return false;

        const variables = getVariables(options.variables, '', editor);
        return variables.some((v) => v.name === value);
      },
    };
  } catch (error) {
    console.warn('Failed to create variable provider:', error);
    return null;
  }
}

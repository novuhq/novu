import { Extension } from '@tiptap/react';

import { VariableItem } from './VariableSuggestionList';

export type SuggestionListStorage = {
  suggestions: VariableItem[];
};
export const SuggestionListExtension = Extension.create<{}, SuggestionListStorage>({
  name: 'SuggestionListStorage',
  addStorage() {
    return {
      suggestions: [],
    };
  },
});

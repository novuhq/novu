import { Completion, CompletionContext, CompletionSource } from '@codemirror/autocomplete';
import { TRANSLATION_DELIMITER_CLOSE, TRANSLATION_TRIGGER_CHARACTER } from '@novu/shared';
import { EditorView } from '@uiw/react-codemirror';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { NewTranslationKeyPreview } from '@/components/workflow-editor/steps/email/translations/new-translation-key-preview';
import { TranslationAutocompleteConfig, TranslationCompletionOption, TranslationKey } from '@/types/translations';
import { isInsideVariableContext } from './utils';

/**
 * Create a DOM element to render the info panel in Codemirror.
 */
const createInfoPanel = ({ component }: { component: React.ReactNode }) => {
  const dom = document.createElement('div');
  createRoot(dom).render(component);
  return dom;
};

function createCompletionOption(
  name: string,
  type: 'translation' | 'new-translation-key',
  searchText: string,
  displayLabel?: string
): TranslationCompletionOption {
  const boost = type === 'translation' && name.toLowerCase().startsWith(searchText.toLowerCase()) ? 2 : 1;
  return { label: name, type, boost, displayLabel: displayLabel || name };
}

function findMatchingKeys(searchText: string, translationKeys: TranslationKey[]): TranslationCompletionOption[] {
  if (!searchText) {
    return translationKeys.map((key) => createCompletionOption(key.name, 'translation', ''));
  }

  return translationKeys
    .filter((key) => key.name.toLowerCase().includes(searchText.toLowerCase()))
    .map((key) => createCompletionOption(key.name, 'translation', searchText));
}

function createNewKeySuggestion(
  searchText: string,
  existingKeys: string[],
  hasCreateHandler: boolean,
  onCreateNewTranslationKey?: (translationKey: string) => Promise<void>
): TranslationCompletionOption | null {
  const trimmedSearch = searchText.trim();
  if (!trimmedSearch || !hasCreateHandler) return null;

  const keyExists = existingKeys.some((key) => key.toLowerCase() === trimmedSearch.toLowerCase());
  if (keyExists) return null;

  const option = createCompletionOption(
    trimmedSearch,
    'new-translation-key',
    trimmedSearch,
    `Create "${trimmedSearch}"`
  );

  // Add info panel with preview
  return {
    ...option,
    info: () => {
      const dom = createInfoPanel({
        component: React.createElement(NewTranslationKeyPreview, {
          onCreateClick: () => {
            onCreateNewTranslationKey?.(trimmedSearch);
          },
        }),
      });
      return {
        dom,
        destroy: () => {
          dom.remove();
        },
      };
    },
  };
}

function createApplyFunction(translationOption: TranslationCompletionOption, config: TranslationAutocompleteConfig) {
  return (view: EditorView, completion: Completion, from: number, to: number): boolean => {
    const { onTranslationSelect, onCreateNewTranslationKey } = config;
    const selectedValue = translationOption.label;
    const isNewKey = translationOption.type === 'new-translation-key';

    if (isNewKey && onCreateNewTranslationKey) {
      onCreateNewTranslationKey(selectedValue).catch((error) => {
        console.error('Failed to create translation key:', error);
      });
    }

    const content = view.state.doc.toString();
    const beforeCursor = content.slice(0, from);
    const afterCursor = content.slice(to);

    const needsOpening = !beforeCursor.endsWith(TRANSLATION_TRIGGER_CHARACTER);
    const needsClosing = !afterCursor.startsWith(TRANSLATION_DELIMITER_CLOSE);

    const wrappedValue = `${needsOpening ? TRANSLATION_TRIGGER_CHARACTER : ''}${selectedValue}${needsClosing ? TRANSLATION_DELIMITER_CLOSE : ''}`;
    const finalCursorPos = from + wrappedValue.length + (needsClosing ? 0 : 2);

    view.dispatch({
      changes: { from, to, insert: wrappedValue },
      selection: { anchor: finalCursorPos },
    });

    onTranslationSelect?.(translationOption);
    return true;
  };
}

export function createTranslationAutocompleteSource(config: TranslationAutocompleteConfig): CompletionSource {
  const { translationKeys, onCreateNewTranslationKey } = config;

  return (context: CompletionContext) => {
    const { state, pos } = context;
    const beforeCursor = state.sliceDoc(0, pos);

    if (isInsideVariableContext(context)) return null;

    const lastTranslationStart = beforeCursor.lastIndexOf(TRANSLATION_TRIGGER_CHARACTER);
    if (lastTranslationStart === -1) return null;

    const insideTranslation = state.sliceDoc(lastTranslationStart + TRANSLATION_TRIGGER_CHARACTER.length, pos);
    if (insideTranslation.includes(TRANSLATION_DELIMITER_CLOSE)) return null;

    const searchText = insideTranslation.trim();
    const matchingKeys = findMatchingKeys(searchText, translationKeys);
    const existingKeyNames = translationKeys.map((key) => key.name);
    const newKeySuggestion = createNewKeySuggestion(
      searchText,
      existingKeyNames,
      !!onCreateNewTranslationKey,
      onCreateNewTranslationKey
    );

    const allSuggestions = [...matchingKeys];
    if (newKeySuggestion) allSuggestions.push(newKeySuggestion);

    if (allSuggestions.length > 0 || lastTranslationStart !== -1) {
      return {
        from: lastTranslationStart + TRANSLATION_TRIGGER_CHARACTER.length,
        to: pos,
        options: allSuggestions.map(
          (suggestion): Completion => ({
            label: suggestion.label,
            type: suggestion.type,
            boost: suggestion.boost,
            displayLabel: suggestion.displayLabel,
            apply: createApplyFunction(suggestion, config),
            ...(suggestion.info && { info: suggestion.info }),
          })
        ),
      };
    }

    return null;
  };
}

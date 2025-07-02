import { InlineDecoratorExtension, getInlineDecoratorSuggestionsReact } from '@maily-to/core/extensions';
import { TranslationPill } from './translation-pill';
import { AnyExtension } from '@tiptap/core';
import { TRANSLATION_KEY_SINGLE_REGEX, TRANSLATION_TRIGGER_CHARACTER } from '@novu/shared';
import { TranslationSuggestionsListView, TranslationKeyItem } from './translation-suggestions-list-view';
import { TranslationKey } from '@/types/translations';
import { forwardRef } from 'react';

export const createTranslationExtension = (
  isTranslationEnabled: boolean,
  translationKeys: TranslationKey[] = [],
  onCreateNewTranslationKey?: (translationKey: string) => Promise<void>
) => {
  if (!isTranslationEnabled) {
    return {} as AnyExtension;
  }

  return InlineDecoratorExtension.configure({
    triggerPattern: TRANSLATION_TRIGGER_CHARACTER,
    closingPattern: '}',
    openingPattern: '{',
    extractKey: (text: string) => {
      const match = text.match(TRANSLATION_KEY_SINGLE_REGEX);
      return match ? match[1] : null;
    },
    formatPattern: (key: string) => `{t.${key}}`,
    isPatternMatch: (value: string) => {
      return value.startsWith('{') && value.endsWith('}');
    },
    decoratorComponent: TranslationPill,
    suggestion: {
      ...getInlineDecoratorSuggestionsReact(TRANSLATION_TRIGGER_CHARACTER, translationKeys),
      allowToIncludeChar: true,
      decorationTag: 'span',
      allowedPrefixes: null,
      items: ({ query }) => {
        const existingKeys = translationKeys.map((key) => key.name);
        const filteredKeys = translationKeys.filter((key) => key.name.toLowerCase().includes(query.toLowerCase()));

        // If query doesn't match any existing keys and is not empty, offer to create new key
        const shouldOfferNewKey =
          query.trim() && !existingKeys.some((key) => key.toLowerCase() === query.toLowerCase());

        const items: TranslationKeyItem[] = filteredKeys.map((key) => ({
          name: key.name,
          id: key.name,
        }));

        if (shouldOfferNewKey) {
          items.push({
            name: query.trim(),
            id: query.trim(),
            type: 'new-translation-key',
            displayLabel: `Create "${query.trim()}"`,
          });
        }

        return items;
      },
      command: ({ editor, range, props }) => {
        const query = `{t.${props.id}} `; // Added space after the closing brace

        // Check if this is a new translation key that doesn't exist
        const existingKeys = translationKeys.map((key) => key.name);
        const isNewTranslationKey = !existingKeys.includes(props.id);

        if (isNewTranslationKey && onCreateNewTranslationKey) {
          // For new translation keys, we still insert them but also trigger creation
          onCreateNewTranslationKey(props.id);
        }

        // Insert the translation key
        editor.chain().focus().insertContentAt(range, query).run();
      },
    },
    variableSuggestionsPopover: forwardRef((props: any, ref: any) => (
      <TranslationSuggestionsListView {...props} ref={ref} translationKeys={translationKeys} />
    )),
  });
};

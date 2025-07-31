import { getInlineDecoratorSuggestionsReact, InlineDecoratorExtension } from '@maily-to/core/extensions';
import {
  TRANSLATION_DEFAULT_TEMPLATE,
  TRANSLATION_DELIMITER_CLOSE,
  TRANSLATION_DELIMITER_OPEN,
  TRANSLATION_KEY_SINGLE_REGEX,
  TRANSLATION_TRIGGER_CHARACTER,
} from '@novu/shared';
import { AnyExtension } from '@tiptap/core';
import { forwardRef } from 'react';
import { TranslationKey } from '@/types/translations';
import { TranslationPill } from './translation-pill';
import { TranslationKeyItem, TranslationSuggestionsListView } from './translation-suggestions-list-view';

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
    closingPattern: TRANSLATION_DELIMITER_CLOSE,
    openingPattern: TRANSLATION_DELIMITER_OPEN,
    extractKey: (text: string) => {
      const match = text.match(TRANSLATION_KEY_SINGLE_REGEX);
      return match ? match[1] : null;
    },
    formatPattern: (key: string) => TRANSLATION_DEFAULT_TEMPLATE(key),
    isPatternMatch: (value: string) => {
      return value.startsWith(TRANSLATION_DELIMITER_OPEN) && value.endsWith(TRANSLATION_DELIMITER_CLOSE);
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
          });
        }

        return items;
      },
      command: ({ editor, range, props }) => {
        /**
         * This is called when you select/create a translation key from the suggestion
         * list in the editor (not in the bubble menu). It calls the onSelectItem
         * callback with the selected item.
         */
        const query = `${TRANSLATION_DEFAULT_TEMPLATE(props.id)} `; // Added space after the closing brace

        // Insert the translation key
        editor.chain().focus().insertContentAt(range, query).run();
      },
    },
    variableSuggestionsPopover: forwardRef((props: any, ref: any) => (
      <TranslationSuggestionsListView
        {...props}
        ref={ref}
        translationKeys={translationKeys}
        onSelectItem={(item) => {
          /*
           * This is called when you select/create a translation key from the suggestion
           * list. It's called in both editor and bubble menu contexts.
           */

          // Check if this is a new translation key that doesn't exist
          const existingKeys = translationKeys.map((key) => key.name);
          const isNewTranslationKey = !existingKeys.includes(item.name);

          if (isNewTranslationKey && onCreateNewTranslationKey) {
            onCreateNewTranslationKey(item.name);
          }

          props.onSelectItem(item);
        }}
      />
    )),
  });
};

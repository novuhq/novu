import { InlineDecoratorExtension, getInlineDecoratorSuggestionsReact } from '@maily-to/core/extensions';
import { TRANSLATION_KEYS } from './translation-keys';
import { TranslationPill } from './translation-pill';
import { AnyExtension } from '@tiptap/core';
import { TRANSLATION_KEY_SINGLE_REGEX } from '@novu/shared';

const TRANSLATION_TRIGGER = '{t.';

/**
 * Creates the translation decorator extension configured for translation keys
 */
export const createTranslationExtension = (isTranslationEnabled: boolean) => {
  if (!isTranslationEnabled) {
    return {} as AnyExtension;
  }

  return InlineDecoratorExtension.configure({
    triggerPattern: TRANSLATION_TRIGGER,
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
    suggestion: getInlineDecoratorSuggestionsReact(TRANSLATION_TRIGGER, TRANSLATION_KEYS),
  });
};

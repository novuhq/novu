import { InlineDecoratorExtension, getInlineDecoratorSuggestionsReact } from '@maily-to/core/extensions';
import { TRANSLATION_KEYS, TRANSLATION_TRIGGER } from './translation-keys';
import { TranslationPill } from './translation-pill';
import { AnyExtension } from '@tiptap/core';

/**
 * Creates the translation decorator extension configured for translation keys
 */
export const createTranslationExtension = (isTranslationEnabled: boolean) => {
  if (!isTranslationEnabled) {
    return {} as AnyExtension;
  }

  return InlineDecoratorExtension.configure({
    triggerPattern: TRANSLATION_TRIGGER,
    closingPattern: '}}',
    openingPattern: '{{',
    extractKey: (text: string) => {
      const match = text.match(/\{\{(t\.[^}]+)\}\}/);
      return match ? match[1] : null;
    },
    formatPattern: (key: string) => `{{${key}}}`,
    isPatternMatch: (value: string) => {
      return value.startsWith('{{') && value.endsWith('}}');
    },
    decoratorComponent: TranslationPill,
    suggestion: getInlineDecoratorSuggestionsReact(TRANSLATION_TRIGGER, TRANSLATION_KEYS),
  });
};

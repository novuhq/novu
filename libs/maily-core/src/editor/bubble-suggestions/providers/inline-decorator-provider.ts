import { Editor } from '@tiptap/core';
import React from 'react';
import { InlineDecoratorOptions } from '../../extensions/inline-decorator/inline-decorator';
import { getNodeOptions } from '../../utils/node-options';
import { SuggestionItem, SuggestionProvider } from '../suggestion-provider';

// Helper function to get suggestion items
function getSuggestionItems(suggestionItems: any, query = ''): any[] {
  if (typeof suggestionItems === 'function') {
    return suggestionItems({ query });
  }
  if (Array.isArray(suggestionItems)) {
    return query
      ? suggestionItems.filter(
          (item) =>
            item.name.toLowerCase().includes(query.toLowerCase()) ||
            (item.label && item.label.toLowerCase().includes(query.toLowerCase()))
        )
      : suggestionItems;
  }
  return [];
}

// Helper function to create button update callbacks
function createButtonCallbacks(editor: Editor, options: InlineDecoratorOptions, from?: string) {
  if (from !== 'button-variable') return {};

  return {
    onUpdate: (key: string) => {
      editor.commands.updateButtonAttributes({
        text: options.formatPattern(key),
        isTextVariable: true,
      });
    },
    onDelete: () => {
      editor.commands.updateButtonAttributes({
        text: 'Button Text',
        isTextVariable: false,
      });
    },
  };
}

export function createInlineDecoratorProvider(editor: Editor): SuggestionProvider | null {
  try {
    const options = getNodeOptions<InlineDecoratorOptions>(editor, 'inlineDecorator');

    if (!options?.suggestion?.char) {
      return null;
    }

    const { suggestion } = options;

    return {
      name: 'inlineDecorator',
      triggerPattern: suggestion.char!,

      getSuggestions: (query: string) => {
        const items = getSuggestionItems(suggestion.items, query);
        return items.map(
          (item): SuggestionItem => ({
            id: item.name,
            data: item,
          })
        );
      },

      formatValue: (item) => options.formatPattern(item.id),

      renderValue: (value, editor, from) => {
        const { decoratorComponent: DecoratorComponent } = options;

        if (!DecoratorComponent) {
          return value;
        }

        const callbacks = createButtonCallbacks(editor, options, from);

        return React.createElement(DecoratorComponent, {
          decoratorKey: options.extractKey(value) || value,
          ...callbacks,
        });
      },

      isMatch: (value) => {
        const items = getSuggestionItems(suggestion.items);

        // Check pattern match first
        if (options.isPatternMatch(value)) {
          const key = options.extractKey(value);
          return key ? items.some((item) => item.name === key) : false;
        }

        // Check direct key match
        return items.some((item) => item.name === value);
      },
    };
  } catch (error) {
    console.warn('Failed to create inline decorator provider:', error);
    return null;
  }
}

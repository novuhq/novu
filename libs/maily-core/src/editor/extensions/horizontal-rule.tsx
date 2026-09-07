import { InputRule } from '@tiptap/core';
import { HorizontalRule as TipTapHorizontalRule } from '@tiptap/extension-horizontal-rule';

const DEFAULT_MARGIN = 10;
export const DEFAULT_HORIZONTAL_RULE_MARGIN_TOP = DEFAULT_MARGIN;
export const DEFAULT_HORIZONTAL_RULE_MARGIN_BOTTOM = DEFAULT_MARGIN;

export const HorizontalRule = TipTapHorizontalRule.extend({
  addAttributes() {
    return {
      marginTop: {
        default: DEFAULT_HORIZONTAL_RULE_MARGIN_TOP,
        parseHTML: (element) =>
          parseInt(element.getAttribute('data-margin-top') || `${DEFAULT_HORIZONTAL_RULE_MARGIN_TOP}`, 10),
        renderHTML: (attributes) => ({
          'data-margin-top': attributes.marginTop,
          style: `margin-top: ${attributes.marginTop}px`,
        }),
      },
      marginBottom: {
        default: DEFAULT_HORIZONTAL_RULE_MARGIN_BOTTOM,
        parseHTML: (element) =>
          parseInt(element.getAttribute('data-margin-bottom') || `${DEFAULT_HORIZONTAL_RULE_MARGIN_BOTTOM}`, 10),
        renderHTML: (attributes) => ({
          'data-margin-bottom': attributes.marginBottom,
          style: `margin-bottom: ${attributes.marginBottom}px`,
        }),
      },
    };
  },

  addInputRules() {
    return [
      new InputRule({
        find: /^(?:---|—-|___\s|\*\*\*\s)$/,
        handler: ({ state, range }) => {
          const attributes = {};

          const { tr } = state;
          const start = range.from;
          const end = range.to;

          tr.insert(start - 1, this.type.create(attributes)).delete(tr.mapping.map(start), tr.mapping.map(end));
        },
      }),
    ];
  },

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'mly-relative',
      },
    };
  },
});

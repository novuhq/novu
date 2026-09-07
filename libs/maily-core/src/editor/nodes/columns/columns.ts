import { mergeAttributes, Node } from '@tiptap/core';
import { v4 as uuid } from 'uuid';
import { goToColumn } from '@/editor/utils/columns';
import { updateAttributes } from '@/editor/utils/update-attribute';
import { DEFAULT_SECTION_MARGIN_BOTTOM, DEFAULT_SECTION_SHOW_IF_KEY } from '../section/section';

export const DEFAULT_COLUMNS_GAP = 8;

interface ColumnsAttributes {
  showIfKey: string;
  gap: number;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    columns: {
      setColumns: () => ReturnType;
      updateColumns: (attrs: Partial<ColumnsAttributes>) => ReturnType;
    };
  }
}

export const ColumnsExtension = Node.create({
  name: 'columns',
  group: 'columns',
  content: 'column+',
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      showIfKey: {
        default: DEFAULT_SECTION_SHOW_IF_KEY,
        parseHTML: (element) => {
          return element.getAttribute('data-show-if-key') || DEFAULT_SECTION_SHOW_IF_KEY;
        },
        renderHTML(attributes) {
          if (!attributes.showIfKey) {
            return {};
          }

          return {
            'data-show-if-key': attributes.showIfKey,
          };
        },
      },
      gap: {
        default: DEFAULT_COLUMNS_GAP,
        parseHTML: (element) => {
          return Number(element.style.gap) || DEFAULT_COLUMNS_GAP;
        },
        renderHTML(attributes) {
          if (!attributes.gap) {
            return {};
          }

          return {
            style: `gap: ${attributes.gap}px`,
          };
        },
      },
      marginBottom: {
        default: DEFAULT_SECTION_MARGIN_BOTTOM,
        parseHTML: (element) => {
          return Number(element?.style?.marginBottom?.replace(/['"]+/g, '')) || 0;
        },
        renderHTML: (attributes) => {
          if (!attributes.marginBottom) {
            return {};
          }

          return {
            style: `margin-bottom: ${attributes.marginBottom}px`,
          };
        },
      },
    };
  },

  addCommands() {
    return {
      setColumns:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {},
            content: [
              {
                type: 'column',
                attrs: {
                  columnId: uuid(),
                },
                content: [
                  {
                    type: 'paragraph',
                  },
                ],
              },
              {
                type: 'column',
                attrs: {
                  columnId: uuid(),
                },
                content: [
                  {
                    type: 'paragraph',
                  },
                ],
              },
            ],
          });
        },
      updateColumns: (attrs) => updateAttributes(this.name, attrs),
    };
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'columns',
        class: 'mly-relative',
      }),
      0,
    ];
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="columns"]',
      },
    ];
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        return goToColumn(this.editor, 'next');
      },
      'Shift-Tab': () => {
        return goToColumn(this.editor, 'previous');
      },
    };
  },
});

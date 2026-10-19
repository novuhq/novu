import { mergeAttributes, Node } from '@tiptap/core';
import { v4 as uuid } from 'uuid';
import { updateAttributes } from '@/editor/utils/update-attribute';

export const DEFAULT_COLUMN_WIDTH = 'auto';

export type AllowedColumnVerticalAlign = 'top' | 'middle' | 'bottom';
export const DEFAULT_COLUMN_VERTICAL_ALIGN: AllowedColumnVerticalAlign = 'top';

interface ColumnAttributes {
  verticalAlign: AllowedColumnVerticalAlign;
  backgroundColor: string;
  borderRadius: number;
  align: string;
  borderWidth: number;
  borderColor: string;

  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;

  showIfKey: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    column: {
      updateColumn: (attrs: Partial<ColumnAttributes>) => ReturnType;
    };
  }
}

export const ColumnExtension = Node.create({
  name: 'column',
  content: 'block+',
  isolating: true,

  addAttributes() {
    return {
      columnId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-column-id') || uuid(),
        renderHTML: (attributes) => {
          if (!attributes.columnId) {
            return {
              'data-column-id': uuid(),
            };
          }

          return {
            'data-column-id': attributes.columnId,
          };
        },
      },
      width: {
        default: DEFAULT_COLUMN_WIDTH,
        parseHTML: (element) => element.style.width.replace(/['"]+/g, '') || DEFAULT_COLUMN_WIDTH,
        renderHTML: (attributes) => {
          if (!attributes.width || attributes.width === DEFAULT_COLUMN_WIDTH) {
            return {};
          }

          return {
            style: `width: ${attributes.width}%;max-width:${attributes.width}%`,
          };
        },
      },
      verticalAlign: {
        default: DEFAULT_COLUMN_VERTICAL_ALIGN,
        parseHTML: (element) => element?.style?.verticalAlign || 'top',
        renderHTML: (attributes) => {
          const { verticalAlign } = attributes;
          if (!verticalAlign || verticalAlign === DEFAULT_COLUMN_VERTICAL_ALIGN) {
            return {};
          }

          if (verticalAlign === 'middle') {
            return {
              style: `display: flex;flex-direction: column;justify-content: center;`,
            };
          } else if (verticalAlign === 'bottom') {
            return {
              style: `display: flex;flex-direction: column;justify-content: flex-end;`,
            };
          }
        },
      },
    };
  },

  addCommands() {
    return {
      updateColumn: (attrs) => updateAttributes(this.name, attrs),
    };
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'column',
        class: 'hide-scrollbars',
      }),
      0,
    ];
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="column"]',
      },
    ];
  },
});

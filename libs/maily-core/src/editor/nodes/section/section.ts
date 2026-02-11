/* cspell:ignore cellspacing */
import { mergeAttributes, Node } from '@tiptap/core';
import { updateAttributes } from '@/editor/utils/update-attribute';

export const DEFAULT_SECTION_BACKGROUND_COLOR = '#f7f7f7';
export const DEFAULT_SECTION_ALIGN = 'left';
export const DEFAULT_SECTION_BORDER_WIDTH = 0;
export const DEFAULT_SECTION_BORDER_COLOR = '#e2e2e2';
export const DEFAULT_SECTION_BORDER_RADIUS = 6;

export const DEFAULT_SECTION_MARGIN_TOP = 0;
export const DEFAULT_SECTION_MARGIN_RIGHT = 0;
export const DEFAULT_SECTION_MARGIN_BOTTOM = 10;
export const DEFAULT_SECTION_MARGIN_LEFT = 0;

export const DEFAULT_SECTION_PADDING_TOP = 8;
export const DEFAULT_SECTION_PADDING_RIGHT = 8;
export const DEFAULT_SECTION_PADDING_BOTTOM = 8;
export const DEFAULT_SECTION_PADDING_LEFT = 8;

export const DEFAULT_SECTION_SHOW_IF_KEY = null;

type SectionAttributes = {
  borderRadius: number;
  backgroundColor: string;
  align: string;
  borderWidth: number;
  borderColor: string;

  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;

  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;

  showIfKey: string | null;
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    section: {
      setSection: () => ReturnType;
      updateSection: (attrs: Partial<SectionAttributes>) => ReturnType;
    };
  }
}

export const SectionExtension = Node.create({
  name: 'section',
  group: 'block',
  content: '(block|columns)+',
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      borderRadius: {
        default: DEFAULT_SECTION_BORDER_RADIUS,
        parseHTML: (element) => {
          return Number(element?.style?.borderRadius?.replace(/['"]+/g, ''));
        },
        renderHTML: (attributes) => {
          if (!attributes.borderRadius) {
            return {};
          }

          return {
            style: `border-radius: ${attributes.borderRadius}px`,
          };
        },
      },
      backgroundColor: {
        default: DEFAULT_SECTION_BACKGROUND_COLOR,
        parseHTML: (element) => {
          return element.style.backgroundColor;
        },
        renderHTML: (attributes) => {
          if (!attributes.backgroundColor) {
            return {};
          }

          return {
            style: `background-color: ${attributes.backgroundColor};--bg-color: ${attributes.backgroundColor}`,
          };
        },
      },
      align: {
        default: DEFAULT_SECTION_ALIGN,
        parseHTML: (element) => {
          return element.getAttribute('align') || DEFAULT_SECTION_ALIGN;
        },
        renderHTML(attributes) {
          if (!attributes.align) {
            return {};
          }

          return {
            align: attributes.align,
          };
        },
      },
      borderWidth: {
        default: DEFAULT_SECTION_BORDER_WIDTH,
        parseHTML: (element) => {
          return Number(element?.style?.borderWidth?.replace(/['"]+/g, '')) || 0;
        },
        renderHTML: (attributes) => {
          if (!attributes.borderWidth) {
            return {};
          }

          return {
            style: `border-width: ${attributes.borderWidth}px`,
          };
        },
      },
      borderColor: {
        default: DEFAULT_SECTION_BORDER_COLOR,
        parseHTML: (element) => {
          return element.style.borderColor;
        },
        renderHTML: (attributes) => {
          if (!attributes.borderColor) {
            return {};
          }

          return {
            style: `border-color: ${attributes.borderColor}`,
          };
        },
      },
      paddingTop: {
        default: DEFAULT_SECTION_PADDING_TOP,
        parseHTML: (element) => {
          return Number(element?.style?.paddingTop?.replace(/['"]+/g, '')) || 0;
        },
        renderHTML: (attributes) => {
          if (!attributes.paddingTop) {
            return {};
          }

          return {
            style: `padding-top: ${attributes.paddingTop}px`,
          };
        },
      },
      paddingRight: {
        default: DEFAULT_SECTION_PADDING_RIGHT,
        parseHTML: (element) => Number(element?.style?.paddingRight?.replace(/['"]+/g, '')) || 0,
        renderHTML: (attributes) => {
          if (!attributes.paddingRight) {
            return {};
          }

          return {
            style: `padding-right: ${attributes.paddingRight}px`,
          };
        },
      },
      paddingBottom: {
        default: DEFAULT_SECTION_PADDING_BOTTOM,
        parseHTML: (element) => Number(element?.style?.paddingBottom?.replace(/['"]+/g, '')) || 0,
        renderHTML: (attributes) => {
          if (!attributes.paddingBottom) {
            return {};
          }

          return {
            style: `padding-bottom: ${attributes.paddingBottom}px`,
          };
        },
      },
      paddingLeft: {
        default: DEFAULT_SECTION_PADDING_LEFT,
        parseHTML: (element) => Number(element?.style?.paddingLeft?.replace(/['"]+/g, '')) || 0,
        renderHTML: (attributes) => {
          if (!attributes.paddingLeft) {
            return {};
          }

          return {
            style: `padding-left: ${attributes.paddingLeft}px`,
          };
        },
      },
      marginTop: {
        default: DEFAULT_SECTION_MARGIN_TOP,
        parseHTML: (element) => {
          return Number(element?.style?.marginTop?.replace(/['"]+/g, '')) || 0;
        },
        renderHTML: (attributes) => {
          if (!attributes.marginTop) {
            return {};
          }

          return {
            marginTop: attributes.marginTop,
          };
        },
      },
      marginRight: {
        default: DEFAULT_SECTION_MARGIN_RIGHT,
        parseHTML: (element) => Number(element?.style?.marginRight?.replace(/['"]+/g, '')) || 0,
        renderHTML: (attributes) => {
          if (!attributes.marginRight) {
            return {};
          }

          return {
            marginRight: attributes.marginRight,
          };
        },
      },
      marginBottom: {
        default: DEFAULT_SECTION_MARGIN_BOTTOM,
        parseHTML: (element) => Number(element?.style?.marginBottom?.replace(/['"]+/g, '')) || 0,
        renderHTML: (attributes) => {
          if (!attributes.marginBottom) {
            return {};
          }

          return {
            marginBottom: attributes.marginBottom,
          };
        },
      },
      marginLeft: {
        default: DEFAULT_SECTION_MARGIN_LEFT,
        parseHTML: (element) => Number(element?.style?.marginLeft?.replace(/['"]+/g, '')) || 0,
        renderHTML: (attributes) => {
          if (!attributes.marginLeft) {
            return {};
          }

          return {
            marginLeft: attributes.marginLeft,
          };
        },
      },

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
    };
  },

  addCommands() {
    return {
      setSection:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              type: this.name,
            },
            content: [
              {
                type: 'paragraph',
              },
            ],
          });
        },
      updateSection: (attrs) => updateAttributes(this.name, attrs),
    };
  },

  renderHTML({ HTMLAttributes }) {
    const { marginTop = 0, marginRight = 0, marginBottom = 0, marginLeft = 0 } = HTMLAttributes;

    return [
      'table',
      {
        'data-type': this.name,
        border: 0,
        cellpadding: 0,
        cellspacing: 0,
        class: 'mly-w-full mly-border-separate mly-relative mly-table-fixed',
        style: `margin-top: ${marginTop}px; margin-right: ${marginRight}px; margin-bottom: ${marginBottom}px; margin-left: ${marginLeft}px;`,
      },
      [
        'tbody',
        {
          class: 'mly-w-full',
        },
        [
          'tr',
          {
            class: 'mly-w-full',
          },
          [
            'td',
            mergeAttributes(HTMLAttributes, {
              'data-type': 'section-cell',
              style: 'border-style: solid',
              class: 'mly-w-full [text-align:revert-layer]',
            }),
            0,
          ],
        ],
      ],
    ];
  },

  parseHTML() {
    return [
      {
        tag: 'table[data-type="section"]',
      },
    ];
  },
});

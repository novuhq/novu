import { mergeAttributes, Node } from '@tiptap/core';
import { DEFAULT_SECTION_SHOW_IF_KEY } from './section/section';

export interface SpacerOptions {
  height: number;
  showIfKey: string;
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    spacer: {
      setSpacer: (options: { height: number }) => ReturnType;
      setSpacerSize: (height: number) => ReturnType;
      setSpacerShowIfKey: (showIfKey: string) => ReturnType;
      unsetSpacer: () => ReturnType;
    };
  }
}

export const DEFAULT_SPACER_HEIGHT = 8;

export const Spacer = Node.create<SpacerOptions>({
  name: 'spacer',
  priority: 1000,

  group: 'block',
  draggable: true,
  addAttributes() {
    return {
      height: {
        default: DEFAULT_SPACER_HEIGHT,
        parseHTML: (element) => Number(element.getAttribute('data-height')),
        renderHTML: (attributes) => {
          return {
            'data-height': attributes.height,
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
      setSpacer:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              height: options.height,
            },
          });
        },

      setSpacerSize:
        (height) =>
        ({ commands }) => {
          return commands.updateAttributes('spacer', { height });
        },

      setSpacerShowIfKey:
        (showIfKey) =>
        ({ commands }) => {
          return commands.updateAttributes('spacer', { showIfKey });
        },

      unsetSpacer:
        () =>
        ({ commands }) => {
          return commands.deleteNode('spacer');
        },
    };
  },
  renderHTML({ HTMLAttributes, node }) {
    const { height } = node.attrs as SpacerOptions;

    return [
      'div',
      mergeAttributes(
        {
          'data-maily-component': this.name,
        },
        this.options.HTMLAttributes,
        HTMLAttributes,
        {
          class: 'spacer mly-relative mly-full mly-z-50',
          contenteditable: false,
          style: `height: ${height}px;--spacer-height: ${height}px;`,
        }
      ),
    ];
  },
  parseHTML() {
    return [{ tag: `div[data-maily-component="${this.name}"]` }];
  },
});

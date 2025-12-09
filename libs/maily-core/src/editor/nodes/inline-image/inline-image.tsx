import { mergeAttributes, Node } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export interface InlineImageOptions {
  /**
   * HTML attributes to add to the image element.
   * @default {}
   * @example { class: 'foo' }
   */
  HTMLAttributes: Record<string, any>;
}

export interface InlineImageAttributes {
  src: string;
  isSrcVariable?: boolean;
  alt?: string;
  title?: string;
  externalLink?: string;
  isExternalLinkVariable?: boolean;
  height?: string | number;
  width?: string | number;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    inlineImage: {
      setInlineImage: (options: InlineImageAttributes) => ReturnType;
      updateInlineImageAttributes: (attrs: Partial<InlineImageAttributes>) => ReturnType;
    };
  }
}

export const DEFAULT_INLINE_IMAGE_HEIGHT = 20;
export const DEFAULT_INLINE_IMAGE_WIDTH = 20;

export const InlineImageExtension = Node.create<InlineImageOptions>({
  name: 'inlineImage',
  inline: true,
  group: 'inline',
  selectable: false,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      height: {
        default: DEFAULT_INLINE_IMAGE_HEIGHT,
      },
      width: {
        default: DEFAULT_INLINE_IMAGE_WIDTH,
      },

      src: {
        default: null,
      },
      isSrcVariable: {
        default: false,
        renderHTML(attributes) {
          if (!attributes.isSrcVariable) {
            return {};
          }

          return {
            'data-is-src-variable': 'true',
          };
        },
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },

      externalLink: {
        default: null,
        renderHTML(attributes) {
          if (!attributes.externalLink) {
            return {};
          }

          return {
            'data-external-link': attributes.externalLink,
          };
        },
      },
      isExternalLinkVariable: {
        default: false,
        renderHTML(attributes) {
          if (!attributes.isExternalLinkVariable) {
            return {};
          }

          return {
            'data-is-external-link-variable': 'true',
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: `img[data-type="${this.name}"]`,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      'data-type': this.name,
      class: 'mly-inline mly-relative',
      style: `--mly-inline-image-height: ${HTMLAttributes.height}px; --mly-inline-image-width: ${HTMLAttributes.width}px; margin:0; vertical-align: middle;`,
      draggable: 'false',
      loading: 'lazy',
    });

    return ['img', attrs];
  },

  addCommands() {
    return {
      setInlineImage:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
      updateInlineImageAttributes:
        (attributes) =>
        ({ chain }) => {
          return chain().updateAttributes(this.name, attributes).run();
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('inlineImage'),
        props: {
          handleClickOn: (_, pos, node) => {
            if (node.type !== this.type) {
              return false;
            }

            const from = pos;
            const to = pos + node.nodeSize;

            this.editor.commands.setTextSelection({ from, to });
            return true;
          },
        },
      }),
    ];
  },
});

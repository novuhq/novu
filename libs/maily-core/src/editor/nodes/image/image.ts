import TiptapImage from '@tiptap/extension-image';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { updateAttributes } from '@/editor/utils/update-attribute';
import { DEFAULT_SECTION_SHOW_IF_KEY } from '../section/section';
import { ImageView } from './image-view';

const DEFAULT_IMAGE_BORDER_RADIUS = 0;

export type ImageAttributes = {
  src: string;
  isSrcVariable?: boolean;
  alt?: string;
  title?: string;
  externalLink?: string;
  isExternalLinkVariable?: boolean;
  alignment?: 'left' | 'center' | 'right';
  borderRadius?: number;
  width?: string | number;
  height?: string | number;
  aspectRatio?: number;
  lockAspectRatio?: boolean;
  showIfKey?: string;
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    imageOverride: {
      updateImageAttributes: (attrs: Partial<ImageAttributes>) => ReturnType;
    };
  }
}

export const ImageExtension = TiptapImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: 'auto',
        parseHTML: (element) => {
          return (
            element.getAttribute('width') ||
            (element.style?.width || element.style?.inlineSize)?.replace('px', '') ||
            null
          );
        },
        renderHTML: ({ width }) => ({ width }),
      },
      height: {
        default: 'auto',
        parseHTML: (element) => {
          return (
            element.getAttribute('height') ||
            (element.style?.height || element.style?.blockSize)?.replace('px', '') ||
            null
          );
        },
        renderHTML: ({ height }) => ({ height }),
      },
      alignment: {
        default: 'center',
        renderHTML: ({ alignment }) => ({ 'data-alignment': alignment }),
        parseHTML: (element) => element.getAttribute('data-alignment') || 'center',
      },

      externalLink: {
        default: null,
        renderHTML: ({ externalLink }) => {
          if (!externalLink) {
            return {};
          }
          return {
            'data-external-link': externalLink,
          };
        },
        parseHTML: (element) => {
          return element.getAttribute('data-external-link');
        },
      },

      // Later we will remove this attribute
      // and use the `externalLink` attribute instead
      // when implement the URL variable feature
      isExternalLinkVariable: {
        default: false,
        parseHTML: (element) => {
          return element.getAttribute('data-is-external-link-variable') === 'true';
        },
        renderHTML: (attributes) => {
          if (!attributes.isExternalLinkVariable) {
            return {};
          }

          return {
            'data-is-external-link-variable': 'true',
          };
        },
      },

      borderRadius: {
        default: DEFAULT_IMAGE_BORDER_RADIUS,
        parseHTML: (element) => {
          return Number(element.getAttribute('data-border-radius'));
        },
        renderHTML: (attributes) => {
          return {
            'data-border-radius': attributes.borderRadius,
          };
        },
      },

      // Later we will remove this attribute
      // and use the `src` attribute instead when implement
      // the URL variable feature
      isSrcVariable: {
        default: false,
        parseHTML: (element) => {
          return element.getAttribute('data-is-src-variable') === 'true';
        },
        renderHTML: (attributes) => {
          if (!attributes.isSrcVariable) {
            return {};
          }

          return {
            'data-is-src-variable': 'true',
          };
        },
      },

      aspectRatio: {
        default: null,
        parseHTML: (element) => {
          return element.getAttribute('data-aspect-ratio') || null;
        },
        renderHTML: (attributes) => {
          if (!attributes?.aspectRatio) {
            return {};
          }

          return {
            'data-aspect-ratio': attributes?.aspectRatio,
          };
        },
      },

      lockAspectRatio: {
        default: true,
        parseHTML: (element) => {
          return element.getAttribute('data-lock-aspect-ratio') === 'true';
        },
        renderHTML: (attributes) => {
          if (!attributes.lockAspectRatio) {
            return {};
          }

          return {
            'data-lock-aspect-ratio': 'true',
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
      ...this.parent?.(),
      updateImageAttributes:
        (attributes) =>
        ({ chain }) => {
          return chain().updateAttributes(this.name, attributes).run();
        },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageView, {
      className: 'mly-relative',
    });
  },
});

import TiptapImage from '@tiptap/extension-image';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { DEFAULT_SECTION_SHOW_IF_KEY } from '../section/section';
import { LogoView } from './logo-view';

export const allowedLogoSize = ['sm', 'md', 'lg'] as const;
export type AllowedLogoSize = (typeof allowedLogoSize)[number];

export const allowedLogoAlignment = ['left', 'center', 'right'] as const;
export type AllowedLogoAlignment = (typeof allowedLogoAlignment)[number];

interface LogoOptions {
  src: string;
  alt?: string;
  title?: string;
  size?: AllowedLogoSize;
  alignment?: AllowedLogoAlignment;
}

export interface LogoAttributes {
  src?: string;
  size?: AllowedLogoSize;
  alignment?: AllowedLogoAlignment;

  showIfKey: string;
  isSrcVariable?: boolean;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    logo: {
      setLogoImage: (options: LogoOptions) => ReturnType;
      updateLogoAttributes: (attributes: Partial<LogoAttributes>) => ReturnType;
    };
  }
}

const DEFAULT_ALIGNMENT: AllowedLogoAlignment = 'left';
export const DEFAULT_LOGO_SIZE: AllowedLogoSize = 'sm';

export const logoSizes: Record<AllowedLogoSize, string> = {
  sm: '40px',
  md: '48px',
  lg: '64px',
};

export const LogoExtension = TiptapImage.extend({
  name: 'logo',
  priority: 1000,

  addAttributes() {
    return {
      ...this.parent?.(),
      'maily-component': {
        default: 'logo',
        renderHTML: (attributes) => {
          return {
            'data-maily-component': attributes['maily-component'],
          };
        },
        parseHTML: (element: Element) => element.getAttribute('data-maily-component'),
      },
      size: {
        default: DEFAULT_LOGO_SIZE,
        parseHTML: (element) => element.getAttribute('data-size') as AllowedLogoSize,
        renderHTML: (attributes) => {
          return {
            'data-size': attributes.size,
          };
        },
      },
      alignment: {
        default: DEFAULT_ALIGNMENT,
        parseHTML: (element) => element.getAttribute('data-alignment') as AllowedLogoAlignment,
        renderHTML: (attributes) => {
          return {
            'data-alignment': attributes.alignment,
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
    };
  },
  addCommands() {
    return {
      setLogoImage:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
      updateLogoAttributes:
        (attributes) =>
        ({ chain }) => {
          return chain().updateAttributes(this.name, attributes).run();
        },
    };
  },
  parseHTML() {
    return [
      {
        tag: `img[data-maily-component="${this.name}"]`,
      },
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(LogoView, {
      className: 'mly-relative',
    });
  },
});

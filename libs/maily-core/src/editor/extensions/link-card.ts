import { mergeAttributes, Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { LinkCardComponent } from '../nodes/link-card';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    linkCard: {
      setLinkCard: () => ReturnType;
    };
  }
}

export type LinkCardOptions = {};

export const LinkCardExtension = Node.create({
  name: 'linkCard',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      mailyComponent: {
        default: 'linkCard',
      },
      title: {
        default: '',
      },
      description: {
        default: '',
      },
      link: {
        default: '',
      },
      linkTitle: {
        default: '',
      },
      image: {
        default: '',
      },
      subTitle: {
        default: '',
      },
      badgeText: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: `a[data-maily-component="${this.name}"]`,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(
        {
          'data-maily-component': this.name,
        },
        HTMLAttributes
      ),
    ];
  },

  addCommands() {
    return {
      setLinkCard:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              mailyComponent: this.name,
            },
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(LinkCardComponent, {
      className: 'mly-relative',
    });
  },
});

import { Mention as ExternalMention } from '@tiptap/extension-mention';
import { mergeAttributes, ReactNodeViewRenderer } from '@tiptap/react';
import { Variable } from './Variable';
import { AUTOCOMPLETE_CLOSE_TAG, AUTOCOMPLETE_OPEN_TAG } from '../constants';

export const CustomMention = ExternalMention.extend({
  name: ExternalMention.name,
  content: 'text*',
  atom: false,
  inline: true,
  addAttributes() {
    return {
      ...this.parent?.(),
      error: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-error'),
        renderHTML: (attributes) => {
          if (!attributes.error) {
            return {};
          }

          return {
            'data-error': attributes.error,
          };
        },
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(Variable, {
      attrs: { contentEditable: 'false' },
      update: () => {
        return true;
      },
    });
  },
  parseHTML() {
    return [
      {
        tag: 'mention-component',
      },
    ];
  },
  renderText({ node }) {
    return node.attrs.error === 'true'
      ? node.attrs.label
      : `${AUTOCOMPLETE_OPEN_TAG}${node.attrs.label ?? node.attrs.id}${AUTOCOMPLETE_CLOSE_TAG}`;
  },
  renderHTML({ HTMLAttributes, node }) {
    const htmlOutput =
      node.attrs.error === 'true'
        ? node.attrs.label
        : `${AUTOCOMPLETE_OPEN_TAG}${node.attrs.label ?? node.attrs.id}${AUTOCOMPLETE_CLOSE_TAG}`;

    return ['mention-component', mergeAttributes(HTMLAttributes), htmlOutput];
  },
});

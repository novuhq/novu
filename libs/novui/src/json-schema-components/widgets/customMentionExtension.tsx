import { Mention as ExternalMention } from '@tiptap/extension-mention';
import { mergeAttributes, NodeViewProps, ReactNodeViewRenderer } from '@tiptap/react';
import { AUTOCOMPLETE_CLOSE_TAG, AUTOCOMPLETE_OPEN_TAG, VARIABLE_HTML_TAG_NAME } from '../constants';
import { checkIsValidVariableErrorCode } from '../utils';
import { Variable } from './Variable';

export const CustomMention = () => {
  return ExternalMention.extend({
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
    // called on attempting to add a mention
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
          tag: VARIABLE_HTML_TAG_NAME,
        },
      ];
    },
    renderText({ node }) {
      return checkIfNodeHasError(node)
        ? node.attrs.label
        : `${AUTOCOMPLETE_OPEN_TAG}${node.attrs.label ?? node.attrs.id}${AUTOCOMPLETE_CLOSE_TAG}`;
    },
    renderHTML({ HTMLAttributes, node }) {
      const htmlOutput = checkIfNodeHasError(node)
        ? node.attrs.label
        : `${AUTOCOMPLETE_OPEN_TAG}${node.attrs.label ?? node.attrs.id}${AUTOCOMPLETE_CLOSE_TAG}`;

      return [VARIABLE_HTML_TAG_NAME, mergeAttributes(HTMLAttributes), htmlOutput];
    },
  });
};

function checkIfNodeHasError(node: NodeViewProps['node']): boolean {
  return node.attrs.error && checkIsValidVariableErrorCode(node.attrs.error);
}

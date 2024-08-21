import { Mention as ExternalMention } from '@tiptap/extension-mention';
import { mergeAttributes, Node, NodeViewProps, ReactNodeViewRenderer } from '@tiptap/react';
import { Variable } from './Variable';
import { AUTOCOMPLETE_CLOSE_TAG, AUTOCOMPLETE_OPEN_TAG, VariableErrorCode } from '../constants';
import { memo } from 'react';
import { checkIsValidVariableErrorCode } from '../utils';

export const CustomMention = (variables: string[]) => {
  const variableSet = new Set(variables);

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
      return ReactNodeViewRenderer(
        memo<NodeViewProps>((props) => {
          const isValidVariable = variableSet.has(props.node.attrs.label);

          const updatedProps: NodeViewProps = {
            ...props,
            node: {
              ...props.node,
              attrs: {
                ...props.node.attrs,
                error: isValidVariable ? undefined : VariableErrorCode.INVALID_NAME,
              },
            },
          } as unknown as NodeViewProps;

          return <Variable {...updatedProps} />;
        }),
        {
          attrs: { contentEditable: 'false' },
          update: () => {
            return true;
          },
        }
      );
    },
    parseHTML() {
      return [
        {
          tag: 'mention-component',
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

      return ['mention-component', mergeAttributes(HTMLAttributes), htmlOutput];
    },
  });
};

function checkIfNodeHasError(node: NodeViewProps['node']): boolean {
  return node.attrs.error && checkIsValidVariableErrorCode(node.attrs.error);
}

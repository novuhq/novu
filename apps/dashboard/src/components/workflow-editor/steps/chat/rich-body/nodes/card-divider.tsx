import { mergeAttributes, Node } from '@tiptap/core';
import { NodeViewProps, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';

export const CARD_DIVIDER_NODE_NAME = 'cardDivider';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    cardDivider: {
      setCardDivider: () => ReturnType;
    };
  }
}

export const CardDividerExtension = Node.create({
  name: CARD_DIVIDER_NODE_NAME,
  group: 'block',
  atom: true,
  selectable: true,

  parseHTML() {
    return [{ tag: `div[data-type="${this.name}"]` }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-type': this.name }, HTMLAttributes)];
  },

  addCommands() {
    return {
      setCardDivider:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(CardDividerView);
  },
});

function CardDividerView({ selected }: NodeViewProps) {
  return (
    <NodeViewWrapper as="div" className="py-0.5" data-selected={selected || undefined}>
      <hr
        className={
          selected
            ? 'border-0 border-t-2 border-primary-base transition-colors'
            : 'border-0 border-t border-neutral-100 transition-colors'
        }
      />
    </NodeViewWrapper>
  );
}

import { mergeAttributes, Node } from '@tiptap/core';
import { NodeViewContent, NodeViewProps, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { cn } from '@/utils/ui';

export type CardTextStyle = 'plain' | 'bold' | 'muted';

const TEXT_STYLES: { id: CardTextStyle; label: string; preview: string; className: string }[] = [
  { id: 'plain', label: 'Plain text', preview: 'Aa', className: '' },
  { id: 'bold', label: 'Bold heading', preview: 'B', className: 'font-semibold' },
  { id: 'muted', label: 'Muted caption', preview: 'Aa', className: 'text-text-soft' },
];

export const CARD_TEXT_NODE_NAME = 'cardText';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    cardText: {
      setCardText: (options?: { style?: CardTextStyle }) => ReturnType;
      setCardTextStyle: (style: CardTextStyle) => ReturnType;
    };
  }
}

export const CardTextExtension = Node.create({
  name: CARD_TEXT_NODE_NAME,
  group: 'block',
  content: 'inline*',
  defining: true,

  addAttributes() {
    return {
      style: {
        default: 'plain' as CardTextStyle,
        parseHTML: (element) => (element.getAttribute('data-style') as CardTextStyle) ?? 'plain',
        renderHTML: (attributes) => ({ 'data-style': attributes.style ?? 'plain' }),
      },
    };
  },

  parseHTML() {
    return [{ tag: `div[data-type="${this.name}"]` }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-type': this.name }, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setCardText:
        (options) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { style: options?.style ?? 'plain' } }),
      setCardTextStyle:
        (style) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, { style }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(CardTextView);
  },
});

function CardTextView({ node, updateAttributes }: NodeViewProps) {
  const style = (node.attrs.style as CardTextStyle) ?? 'plain';

  return (
    <NodeViewWrapper as="div" className="group/card-text relative">
      <div
        className={cn(
          'pointer-events-auto absolute -right-1 -top-1 z-10 flex items-center gap-px rounded-md border border-neutral-100 bg-white p-0.5 shadow-sm',
          'opacity-0 transition-opacity duration-150',
          'group-focus-within/card-text:opacity-100 group-hover/card-text:opacity-100'
        )}
        contentEditable={false}
      >
        {TEXT_STYLES.map((option) => (
          <button
            key={option.id}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              updateAttributes({ style: option.id });
            }}
            className={cn(
              'flex size-5 items-center justify-center rounded text-2xs transition-colors',
              option.className,
              style === option.id
                ? 'bg-bg-weak text-text-strong'
                : 'text-text-soft hover:bg-bg-weak hover:text-text-sub'
            )}
            aria-label={option.label}
            aria-pressed={style === option.id}
            title={option.label}
          >
            {option.preview}
          </button>
        ))}
      </div>

      <NodeViewContent
        className={cn(
          'min-h-5 py-0.5 leading-relaxed outline-none',
          style === 'plain' && 'text-sm text-foreground-800',
          style === 'bold' && 'text-base font-semibold text-foreground-950',
          style === 'muted' && 'text-xs text-foreground-600'
        )}
      />
    </NodeViewWrapper>
  );
}

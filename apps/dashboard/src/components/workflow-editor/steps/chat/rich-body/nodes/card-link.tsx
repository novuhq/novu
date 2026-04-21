import { mergeAttributes, Node } from '@tiptap/core';
import { NodeViewProps, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { useState } from 'react';
import { RiExternalLinkLine, RiLink } from 'react-icons/ri';
import { ControlInput } from '@/components/workflow-editor/control-input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { cn } from '@/utils/ui';
import { useChatEditorContext } from '../chat-editor-context';
import { POPOVER_CONTROL_INPUT_CLASS, PopoverField } from './popover-field';

export const CARD_LINK_NODE_NAME = 'cardLink';

type CardLinkAttrs = {
  label: string;
  url: string;
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    cardLink: {
      setCardLink: (attrs?: Partial<CardLinkAttrs>) => ReturnType;
    };
  }
}

export const CardLinkExtension = Node.create({
  name: CARD_LINK_NODE_NAME,
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      label: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-label') ?? '',
        renderHTML: (attributes) => ({ 'data-label': attributes.label ?? '' }),
      },
      url: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-url') ?? '',
        renderHTML: (attributes) => ({ 'data-url': attributes.url ?? '' }),
      },
    };
  },

  parseHTML() {
    return [{ tag: `div[data-type="${this.name}"]` }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-type': this.name }, HTMLAttributes)];
  },

  addCommands() {
    return {
      setCardLink:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { label: attrs?.label ?? '', url: attrs?.url ?? '' },
          }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(CardLinkView);
  },
});

function CardLinkView({ node, updateAttributes, editor }: NodeViewProps) {
  const [open, setOpen] = useState(false);
  const attrs = node.attrs as CardLinkAttrs;
  const hasLabel = attrs.label.length > 0;
  const { variables, isAllowedVariable } = useChatEditorContext();

  return (
    <NodeViewWrapper as="div" contentEditable={false}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex max-w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium transition-colors hover:bg-bg-weak/60"
            onMouseDown={(e) => e.preventDefault()}
          >
            <RiLink className="size-3.5 shrink-0 text-primary-base" />
            <span
              className={cn(
                'truncate underline decoration-primary-base/40 underline-offset-2',
                hasLabel ? 'text-primary-base' : 'text-text-soft italic'
              )}
            >
              {hasLabel ? attrs.label : 'Link label'}
            </span>
            {attrs.url && <RiExternalLinkLine className="size-3 shrink-0 text-text-soft" />}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="flex w-80 flex-col gap-3 p-3"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            editor.commands.blur();
          }}
        >
          <div className="text-2xs font-medium uppercase tracking-wide text-text-soft">Link</div>
          <PopoverField label="Label">
            <ControlInput
              className={POPOVER_CONTROL_INPUT_CLASS}
              variables={variables}
              isAllowedVariable={isAllowedVariable}
              value={attrs.label}
              onChange={(label) => updateAttributes({ label })}
              placeholder="Shown to recipients"
              autoFocus
              enableTranslations
            />
          </PopoverField>
          <PopoverField label="URL">
            <ControlInput
              className={POPOVER_CONTROL_INPUT_CLASS}
              variables={variables}
              isAllowedVariable={isAllowedVariable}
              value={attrs.url}
              onChange={(url) => updateAttributes({ url })}
              placeholder="https://…"
              enableTranslations
            />
          </PopoverField>
        </PopoverContent>
      </Popover>
    </NodeViewWrapper>
  );
}

import { mergeAttributes, Node } from '@tiptap/core';
import { NodeViewProps, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { useState } from 'react';
import { RiImageLine, RiPencilLine } from 'react-icons/ri';
import { ControlInput } from '@/components/workflow-editor/control-input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { cn } from '@/utils/ui';
import { useChatEditorContext } from '../chat-editor-context';
import { POPOVER_CONTROL_INPUT_CLASS, PopoverField } from './popover-field';

export const CARD_IMAGE_NODE_NAME = 'cardImage';

type CardImageAttrs = {
  url: string;
  alt: string;
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    cardImage: {
      setCardImage: (attrs?: Partial<CardImageAttrs>) => ReturnType;
    };
  }
}

export const CardImageExtension = Node.create({
  name: CARD_IMAGE_NODE_NAME,
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      url: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-url') ?? '',
        renderHTML: (attributes) => ({ 'data-url': attributes.url ?? '' }),
      },
      alt: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-alt') ?? '',
        renderHTML: (attributes) => ({ 'data-alt': attributes.alt ?? '' }),
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
      setCardImage:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { url: attrs?.url ?? '', alt: attrs?.alt ?? '' },
          }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(CardImageView);
  },
});

function CardImageView({ node, updateAttributes, editor }: NodeViewProps) {
  const [open, setOpen] = useState(false);
  const attrs = node.attrs as CardImageAttrs;
  const hasUrl = attrs.url.length > 0;
  const isStaticUrl = hasUrl && !attrs.url.includes('{{');
  const { variables, isAllowedVariable } = useChatEditorContext();

  return (
    <NodeViewWrapper as="div" className="flex flex-col gap-1.5" contentEditable={false}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            className={cn(
              'group/image relative w-full overflow-hidden rounded-md border border-dashed border-neutral-200 bg-bg-weak/30 transition-colors hover:border-primary-base hover:bg-bg-weak/50',
              hasUrl && 'border-solid border-neutral-100 bg-transparent hover:border-primary-base'
            )}
          >
            {isStaticUrl ? (
              <img
                src={attrs.url}
                alt={attrs.alt}
                className="block max-h-48 w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="flex aspect-16/6 w-full items-center justify-center gap-2 text-xs text-text-soft">
                <RiImageLine className="size-5" />
                <span>{hasUrl ? 'Dynamic image URL' : 'Add image URL'}</span>
              </div>
            )}
            <span className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-2xs font-medium text-white opacity-0 transition-opacity group-hover/image:opacity-100">
              <RiPencilLine className="size-3" />
              Edit
            </span>
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
          <div className="text-2xs font-medium uppercase tracking-wide text-text-soft">Image</div>
          <PopoverField label="URL">
            <ControlInput
              className={POPOVER_CONTROL_INPUT_CLASS}
              variables={variables}
              isAllowedVariable={isAllowedVariable}
              value={attrs.url}
              onChange={(url) => updateAttributes({ url })}
              placeholder="https://…"
              autoFocus
              enableTranslations
            />
          </PopoverField>
          <PopoverField label="Alt text">
            <ControlInput
              className={POPOVER_CONTROL_INPUT_CLASS}
              variables={variables}
              isAllowedVariable={isAllowedVariable}
              value={attrs.alt}
              onChange={(alt) => updateAttributes({ alt })}
              placeholder="Optional"
              enableTranslations
            />
          </PopoverField>
        </PopoverContent>
      </Popover>
      {attrs.alt && <div className="text-2xs text-foreground-600">{attrs.alt}</div>}
    </NodeViewWrapper>
  );
}

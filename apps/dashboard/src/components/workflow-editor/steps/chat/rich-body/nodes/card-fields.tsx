import { mergeAttributes, Node } from '@tiptap/core';
import { NodeViewContent, NodeViewProps, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { useState } from 'react';
import { RiAddLine, RiCloseLine } from 'react-icons/ri';
import { ControlInput } from '@/components/workflow-editor/control-input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { cn } from '@/utils/ui';
import { useChatEditorContext } from '../chat-editor-context';
import { POPOVER_CONTROL_INPUT_CLASS, PopoverField } from './popover-field';

export const CARD_FIELDS_NODE_NAME = 'cardFields';
export const CARD_FIELD_NODE_NAME = 'cardField';

type CardFieldAttrs = {
  label: string;
  value: string;
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    cardFields: {
      setCardFields: (fields?: CardFieldAttrs[]) => ReturnType;
    };
  }
}

export const CardFieldExtension = Node.create({
  name: CARD_FIELD_NODE_NAME,
  group: 'cardField',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      label: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-label') ?? '',
        renderHTML: (attributes) => ({ 'data-label': attributes.label ?? '' }),
      },
      value: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-value') ?? '',
        renderHTML: (attributes) => ({ 'data-value': attributes.value ?? '' }),
      },
    };
  },

  parseHTML() {
    return [{ tag: `div[data-type="${this.name}"]` }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-type': this.name }, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CardFieldView);
  },
});

export const CardFieldsExtension = Node.create({
  name: CARD_FIELDS_NODE_NAME,
  group: 'block',
  content: 'cardField+',
  selectable: true,

  parseHTML() {
    return [{ tag: `div[data-type="${this.name}"]` }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-type': this.name }, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setCardFields:
        (fields) =>
        ({ commands }) => {
          const list = fields && fields.length > 0 ? fields : [{ label: '', value: '' }];

          return commands.insertContent({
            type: this.name,
            content: list.map((f) => ({ type: CARD_FIELD_NODE_NAME, attrs: { label: f.label, value: f.value } })),
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(CardFieldsView);
  },
});

function CardFieldsView({ node, editor, getPos }: NodeViewProps) {
  const addField = () => {
    if (typeof getPos !== 'function') return;
    const pos = getPos();
    if (pos === undefined) return;
    const insertAt = pos + node.nodeSize - 1;
    editor
      .chain()
      .focus()
      .insertContentAt(insertAt, { type: CARD_FIELD_NODE_NAME, attrs: { label: '', value: '' } })
      .run();
  };

  return (
    <NodeViewWrapper as="div" contentEditable={false}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <NodeViewContent className="contents" contentEditable={false} />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={addField}
          className="flex items-center justify-center gap-1 rounded-md border border-dashed border-neutral-200 px-2 py-1.5 text-xs font-medium text-text-soft transition-all hover:border-primary-base hover:bg-primary-alpha-10 hover:text-primary-base"
        >
          <RiAddLine className="size-3.5" />
          Add field
        </button>
      </div>
    </NodeViewWrapper>
  );
}

function CardFieldView({ node, updateAttributes, editor, deleteNode }: NodeViewProps) {
  const [open, setOpen] = useState(false);
  const attrs = node.attrs as CardFieldAttrs;
  const { variables, isAllowedVariable } = useChatEditorContext();
  const hasLabel = attrs.label.length > 0;

  return (
    <NodeViewWrapper as="div" className="group/field relative pr-6" contentEditable={false}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            className="flex w-full flex-col items-start gap-0.5 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-bg-weak/60"
          >
            <span
              className={cn(
                'text-2xs font-medium uppercase tracking-wide',
                hasLabel ? 'text-foreground-400' : 'text-text-soft'
              )}
            >
              {hasLabel ? attrs.label : 'Label'}
            </span>
            <span
              className={cn(
                'text-xs',
                attrs.value ? 'text-foreground-950' : 'text-text-soft italic'
              )}
            >
              {attrs.value || 'Value'}
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
          <div className="text-2xs font-medium uppercase tracking-wide text-text-soft">Field</div>
          <PopoverField label="Label">
            <ControlInput
              className={POPOVER_CONTROL_INPUT_CLASS}
              variables={variables}
              isAllowedVariable={isAllowedVariable}
              value={attrs.label}
              onChange={(label) => updateAttributes({ label })}
              placeholder="e.g. Status"
              autoFocus
              enableTranslations
            />
          </PopoverField>
          <PopoverField label="Value">
            <ControlInput
              className={POPOVER_CONTROL_INPUT_CLASS}
              variables={variables}
              isAllowedVariable={isAllowedVariable}
              value={attrs.value}
              onChange={(value) => updateAttributes({ value })}
              placeholder="e.g. Pending review"
              enableTranslations
            />
          </PopoverField>
        </PopoverContent>
      </Popover>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => deleteNode()}
        className="absolute right-0 top-1 flex size-5 items-center justify-center rounded text-text-soft opacity-0 transition-opacity hover:bg-red-alpha-10 hover:text-error-base group-hover/field:opacity-100"
        aria-label="Remove field"
      >
        <RiCloseLine className="size-3.5" />
      </button>
    </NodeViewWrapper>
  );
}

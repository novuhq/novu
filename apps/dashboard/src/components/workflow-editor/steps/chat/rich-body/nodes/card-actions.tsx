import { mergeAttributes, Node } from '@tiptap/core';
import { NodeViewContent, NodeViewProps, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { useState } from 'react';
import { RiAddLine, RiCloseLine } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { ControlInput } from '@/components/workflow-editor/control-input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { cn } from '@/utils/ui';
import { useChatEditorContext } from '../chat-editor-context';
import { POPOVER_CONTROL_INPUT_CLASS, PopoverField } from './popover-field';

export const CARD_ACTIONS_NODE_NAME = 'cardActions';
export const CARD_ACTION_ITEM_NODE_NAME = 'cardActionItem';

export type CardActionStyle = 'primary' | 'danger' | 'default';

type CardActionItemAttrs = {
  kind: 'link-button';
  label: string;
  url: string;
  style: CardActionStyle;
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    cardActions: {
      setCardActions: (actions?: Partial<CardActionItemAttrs>[]) => ReturnType;
    };
  }
}

const ACTION_STYLE_LABEL: Record<CardActionStyle, string> = {
  default: 'Default',
  primary: 'Primary',
  danger: 'Danger',
};

function actionButtonVariant(style: CardActionStyle | undefined) {
  switch (style) {
    case 'primary':
      return { variant: 'primary', mode: 'filled' } as const;
    case 'danger':
      return { variant: 'error', mode: 'filled' } as const;
    default:
      return { variant: 'secondary', mode: 'outline' } as const;
  }
}

export const CardActionItemExtension = Node.create({
  name: CARD_ACTION_ITEM_NODE_NAME,
  group: 'cardActionItem',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      kind: {
        default: 'link-button',
        parseHTML: (element) => element.getAttribute('data-kind') ?? 'link-button',
        renderHTML: (attributes) => ({ 'data-kind': attributes.kind ?? 'link-button' }),
      },
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
      style: {
        default: 'default' as CardActionStyle,
        parseHTML: (element) => (element.getAttribute('data-style') as CardActionStyle) ?? 'default',
        renderHTML: (attributes) => ({ 'data-style': attributes.style ?? 'default' }),
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
    return ReactNodeViewRenderer(CardActionItemView);
  },
});

export const CardActionsExtension = Node.create({
  name: CARD_ACTIONS_NODE_NAME,
  group: 'block',
  content: 'cardActionItem+',
  selectable: true,

  parseHTML() {
    return [{ tag: `div[data-type="${this.name}"]` }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-type': this.name }, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setCardActions:
        (actions) =>
        ({ commands }) => {
          const list = actions && actions.length > 0 ? actions : [{}];

          return commands.insertContent({
            type: this.name,
            content: list.map((a) => ({
              type: CARD_ACTION_ITEM_NODE_NAME,
              attrs: {
                kind: 'link-button',
                label: a.label ?? '',
                url: a.url ?? '',
                style: a.style ?? 'default',
              },
            })),
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(CardActionsView);
  },
});

function CardActionsView({ node, editor, getPos }: NodeViewProps) {
  const addButton = () => {
    if (typeof getPos !== 'function') return;
    const pos = getPos();
    if (pos === undefined) return;
    const insertAt = pos + node.nodeSize - 1;
    editor
      .chain()
      .focus()
      .insertContentAt(insertAt, {
        type: CARD_ACTION_ITEM_NODE_NAME,
        attrs: { kind: 'link-button', label: '', url: '', style: 'default' },
      })
      .run();
  };

  return (
    <NodeViewWrapper as="div" className="group/actions" contentEditable={false}>
      <div className="flex flex-wrap items-center gap-1.5">
        <NodeViewContent className="contents" contentEditable={false} />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={addButton}
          className="flex h-8 items-center gap-1 rounded-lg border border-dashed border-neutral-200 px-3 text-xs font-medium text-text-soft transition-all hover:border-primary-base hover:bg-primary-alpha-10 hover:text-primary-base"
          aria-label="Add button"
        >
          <RiAddLine className="size-3.5" />
          <span>Add</span>
        </button>
      </div>
    </NodeViewWrapper>
  );
}

function CardActionItemView({ node, updateAttributes, editor, deleteNode }: NodeViewProps) {
  const [open, setOpen] = useState(false);
  const attrs = node.attrs as CardActionItemAttrs;
  const { variables, isAllowedVariable } = useChatEditorContext();
  const variant = actionButtonVariant(attrs.style);
  const hasLabel = attrs.label.length > 0;

  return (
    <NodeViewWrapper as="span" className="inline-flex" contentEditable={false}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {hasLabel ? (
            <Button
              type="button"
              size="xs"
              variant={variant.variant}
              mode={variant.mode}
              onMouseDown={(e) => e.preventDefault()}
              className="max-w-[220px] font-medium"
            >
              <span className="truncate">{attrs.label}</span>
            </Button>
          ) : (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-lg border border-dashed px-3 text-xs font-medium transition-all',
                attrs.style === 'primary' && 'border-primary-200 text-primary-base hover:bg-primary-alpha-10',
                attrs.style === 'danger' && 'border-error-base/40 text-error-base hover:bg-red-alpha-10',
                (!attrs.style || attrs.style === 'default') && 'border-neutral-200 text-text-soft hover:border-neutral-300 hover:text-text-sub'
              )}
            >
              <span className="truncate">Button</span>
            </button>
          )}
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="flex w-80 flex-col gap-3 p-3"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            editor.commands.blur();
          }}
        >
          <div className="flex items-center justify-between">
            <div className="text-2xs font-medium uppercase tracking-wide text-text-soft">Button</div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                deleteNode();
              }}
              className="flex size-5 items-center justify-center rounded text-text-soft transition-colors hover:bg-red-alpha-10 hover:text-error-base"
              aria-label="Remove button"
            >
              <RiCloseLine className="size-3.5" />
            </button>
          </div>
          <PopoverField label="Label">
            <ControlInput
              className={POPOVER_CONTROL_INPUT_CLASS}
              variables={variables}
              isAllowedVariable={isAllowedVariable}
              value={attrs.label}
              onChange={(label) => updateAttributes({ label })}
              placeholder="Button label"
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
          <div className="flex flex-col gap-1.5">
            <div className="text-2xs font-medium uppercase tracking-wide text-text-soft">Style</div>
            <div className="grid grid-cols-3 gap-1">
              {(['default', 'primary', 'danger'] as const).map((style) => {
                const isActive = (attrs.style ?? 'default') === style;

                return (
                  <button
                    key={style}
                    type="button"
                    onClick={() => updateAttributes({ style })}
                    className={cn(
                      'flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors',
                      isActive
                        ? 'border-neutral-300 bg-bg-weak text-text-strong'
                        : 'border-neutral-100 bg-white text-text-sub hover:border-neutral-200 hover:bg-bg-weak/40'
                    )}
                    aria-pressed={isActive}
                  >
                    <span
                      className={cn(
                        'size-2 rounded-full',
                        style === 'primary' && 'bg-primary-base',
                        style === 'danger' && 'bg-error-base',
                        style === 'default' && 'border border-neutral-300 bg-white'
                      )}
                    />
                    {ACTION_STYLE_LABEL[style]}
                  </button>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </NodeViewWrapper>
  );
}

import { memo, useState } from 'react';
import {
  RiArrowDownLine,
  RiArrowUpLine,
  RiCloseLine,
  RiDraggable,
  RiExternalLinkLine,
  RiImageLine,
  RiLink,
  RiPencilLine,
  RiAddLine,
} from 'react-icons/ri';
import { ControlInput } from '@/components/workflow-editor/control-input';
import { Button } from '@/components/primitives/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { cn } from '@/utils/ui';
import type {
  ActionEntry,
  ActionsBlock,
  CallbackActionEntry,
  CardBlock,
  FieldEntry,
  FieldsBlock,
  ImageBlock,
  LinkBlock,
  TextBlock,
  UrlActionEntry,
} from './card-types';
import { generateBlockId } from './card-serializer';

type BlockListItemProps = {
  block: CardBlock;
  index: number;
  totalBlocks: number;
  variables: React.ComponentProps<typeof ControlInput>['variables'];
  isAllowedVariable: React.ComponentProps<typeof ControlInput>['isAllowedVariable'];
  onUpdate: (next: CardBlock) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
  onSelect: () => void;
  isSelected: boolean;
};

export const BlockListItem = memo(function BlockListItem({
  block,
  index,
  totalBlocks,
  variables,
  isAllowedVariable,
  onUpdate,
  onRemove,
  onMove,
  onSelect,
  isSelected,
}: BlockListItemProps) {
  return (
    <div
      className={cn(
        'group relative rounded-md py-1 pl-2 pr-2 transition-colors',
        'ring-1 ring-transparent',
        isSelected && 'ring-primary-100 bg-primary-alpha-10/40'
      )}
      onClick={onSelect}
      onFocus={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect();
      }}
      role="presentation"
      tabIndex={-1}
    >
      <div
        className={cn(
          'absolute -left-8 top-0.5 flex flex-col items-center gap-0.5 rounded-md border border-neutral-100 bg-white p-0.5 shadow-sm',
          'opacity-0 transition-opacity',
          'group-hover:opacity-100 group-focus-within:opacity-100'
        )}
      >
        <button
          type="button"
          className="flex size-5 cursor-grab items-center justify-center rounded text-text-soft hover:bg-bg-weak active:cursor-grabbing"
          aria-label="Drag handle (coming soon)"
          disabled
        >
          <RiDraggable className="size-3" />
        </button>
        <button
          type="button"
          className="flex size-5 items-center justify-center rounded text-text-sub hover:bg-bg-weak disabled:cursor-not-allowed disabled:text-text-disabled"
          onClick={(e) => {
            e.stopPropagation();
            onMove(-1);
          }}
          disabled={index === 0}
          aria-label="Move block up"
        >
          <RiArrowUpLine className="size-3" />
        </button>
        <button
          type="button"
          className="flex size-5 items-center justify-center rounded text-text-sub hover:bg-bg-weak disabled:cursor-not-allowed disabled:text-text-disabled"
          onClick={(e) => {
            e.stopPropagation();
            onMove(1);
          }}
          disabled={index === totalBlocks - 1}
          aria-label="Move block down"
        >
          <RiArrowDownLine className="size-3" />
        </button>
        <button
          type="button"
          className="flex size-5 items-center justify-center rounded text-error-base hover:bg-red-alpha-10"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label="Remove block"
        >
          <RiCloseLine className="size-3" />
        </button>
      </div>

      <BlockBody block={block} variables={variables} isAllowedVariable={isAllowedVariable} onUpdate={onUpdate} />
    </div>
  );
});

function BlockBody({
  block,
  variables,
  isAllowedVariable,
  onUpdate,
}: {
  block: CardBlock;
  variables: BlockListItemProps['variables'];
  isAllowedVariable: BlockListItemProps['isAllowedVariable'];
  onUpdate: (next: CardBlock) => void;
}) {
  switch (block.kind) {
    case 'heading':
      return (
        <ControlInput
          className="min-h-7 px-0 py-0 text-lg font-semibold leading-snug text-text-strong [&_.cm-editor]:bg-transparent! [&_.cm-content]:px-0! [&_.cm-content]:py-0!"
          variables={variables}
          isAllowedVariable={isAllowedVariable}
          value={block.content}
          onChange={(content) => onUpdate({ ...block, content })}
          placeholder="Heading"
          enableTranslations
        />
      );
    case 'text':
      return <TextBlockEditor block={block} variables={variables} isAllowedVariable={isAllowedVariable} onUpdate={onUpdate} />;
    case 'divider':
      return <hr className="my-2 border-0 border-t border-neutral-100" />;
    case 'link':
      return <LinkBlockEditor block={block} variables={variables} isAllowedVariable={isAllowedVariable} onUpdate={onUpdate} />;
    case 'image':
      return <ImageBlockEditor block={block} variables={variables} isAllowedVariable={isAllowedVariable} onUpdate={onUpdate} />;
    case 'fields':
      return (
        <FieldsEditor block={block} variables={variables} isAllowedVariable={isAllowedVariable} onUpdate={onUpdate} />
      );
    case 'actions':
      return (
        <ActionsEditor block={block} variables={variables} isAllowedVariable={isAllowedVariable} onUpdate={onUpdate} />
      );
    default:
      return null;
  }
}

const TEXT_STYLES: { id: TextBlock['style']; label: string; preview: string }[] = [
  { id: 'plain', label: 'Plain', preview: 'Aa' },
  { id: 'bold', label: 'Bold', preview: 'B' },
  { id: 'muted', label: 'Muted', preview: 'Aa' },
];

function TextBlockEditor({
  block,
  variables,
  isAllowedVariable,
  onUpdate,
}: {
  block: TextBlock;
  variables: BlockListItemProps['variables'];
  isAllowedVariable: BlockListItemProps['isAllowedVariable'];
  onUpdate: (next: CardBlock) => void;
}) {
  const style = block.style ?? 'plain';

  return (
    <div className="relative">
      <div className="absolute right-0 top-0 z-10 flex items-center gap-0.5 rounded-md border border-neutral-100 bg-white p-0.5 opacity-0 shadow-sm transition-opacity focus-within:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100">
        {TEXT_STYLES.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUpdate({ ...block, style: option.id });
            }}
            className={cn(
              'rounded px-1.5 py-0.5 text-2xs transition-colors',
              style === option.id ? 'bg-bg-weak text-text-strong' : 'text-text-soft hover:bg-bg-weak hover:text-text-sub',
              option.id === 'bold' && 'font-bold',
              option.id === 'muted' && 'text-text-soft'
            )}
            aria-label={`Set style ${option.label}`}
            aria-pressed={style === option.id}
            title={option.label}
          >
            {option.preview}
          </button>
        ))}
      </div>
      <ControlInput
        className={cn(
          'min-h-9 px-0 py-0 text-sm leading-relaxed [&_.cm-editor]:bg-transparent! [&_.cm-content]:px-0! [&_.cm-content]:py-0!',
          style === 'bold' && 'font-semibold text-text-strong',
          style === 'plain' && 'text-text-sub',
          style === 'muted' && 'text-text-soft'
        )}
        variables={variables}
        isAllowedVariable={isAllowedVariable}
        value={block.content}
        onChange={(content) => onUpdate({ ...block, content })}
        placeholder="Write something…"
        multiline
        enableTranslations
      />
    </div>
  );
}

function LinkBlockEditor({
  block,
  variables,
  isAllowedVariable,
  onUpdate,
}: {
  block: LinkBlock;
  variables: BlockListItemProps['variables'];
  isAllowedVariable: BlockListItemProps['isAllowedVariable'];
  onUpdate: (next: CardBlock) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasLabel = block.label.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="flex w-full items-center gap-1.5 rounded-md py-1 text-left text-sm hover:bg-bg-weak/40"
        >
          <RiLink className="size-3.5 shrink-0 text-primary-base" />
          <span
            className={cn(
              'truncate underline decoration-primary-base/40 underline-offset-2',
              hasLabel ? 'text-primary-base' : 'text-text-soft'
            )}
          >
            {hasLabel ? block.label : 'Untitled link'}
          </span>
          {block.url && <RiExternalLinkLine className="ml-1 size-3 shrink-0 text-text-soft" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-80 flex-col gap-2 p-3" onClick={(e) => e.stopPropagation()}>
        <div className="text-2xs font-medium uppercase tracking-wide text-text-soft">Link</div>
        <ControlInput
          variables={variables}
          isAllowedVariable={isAllowedVariable}
          value={block.label}
          onChange={(label) => onUpdate({ ...block, label })}
          placeholder="Label (shown to recipients)"
          autoFocus
          enableTranslations
        />
        <ControlInput
          variables={variables}
          isAllowedVariable={isAllowedVariable}
          value={block.url}
          onChange={(url) => onUpdate({ ...block, url })}
          placeholder="https://…"
          enableTranslations
        />
      </PopoverContent>
    </Popover>
  );
}

function ImageBlockEditor({
  block,
  variables,
  isAllowedVariable,
  onUpdate,
}: {
  block: ImageBlock;
  variables: BlockListItemProps['variables'];
  isAllowedVariable: BlockListItemProps['isAllowedVariable'];
  onUpdate: (next: CardBlock) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasUrl = block.url.length > 0;
  const isStaticUrl = hasUrl && !block.url.includes('{{');

  return (
    <div className="flex flex-col gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'group/image relative w-full overflow-hidden rounded-md border border-dashed border-neutral-200 bg-bg-weak/40 transition-colors hover:border-neutral-300',
              hasUrl && 'border-solid'
            )}
          >
            {isStaticUrl ? (
              <img
                src={block.url}
                alt={block.alt ?? ''}
                className="block max-h-40 w-full object-cover"
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
            <span className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-2xs text-white opacity-0 transition-opacity group-hover/image:opacity-100">
              <RiPencilLine className="size-3" />
              Edit
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="flex w-80 flex-col gap-2 p-3" onClick={(e) => e.stopPropagation()}>
          <div className="text-2xs font-medium uppercase tracking-wide text-text-soft">Image</div>
          <ControlInput
            variables={variables}
            isAllowedVariable={isAllowedVariable}
            value={block.url}
            onChange={(url) => onUpdate({ ...block, url })}
            placeholder="https://…"
            autoFocus
            enableTranslations
          />
          <ControlInput
            variables={variables}
            isAllowedVariable={isAllowedVariable}
            value={block.alt ?? ''}
            onChange={(alt) => onUpdate({ ...block, alt })}
            placeholder="Alt text (optional)"
            enableTranslations
          />
        </PopoverContent>
      </Popover>
      {block.alt && <div className="px-1 text-2xs text-text-soft">{block.alt}</div>}
    </div>
  );
}

function FieldsEditor({
  block,
  variables,
  isAllowedVariable,
  onUpdate,
}: {
  block: FieldsBlock;
  variables: BlockListItemProps['variables'];
  isAllowedVariable: BlockListItemProps['isAllowedVariable'];
  onUpdate: (next: CardBlock) => void;
}) {
  const updateField = (fieldId: string, patch: Partial<FieldEntry>) => {
    onUpdate({
      ...block,
      fields: block.fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)),
    });
  };

  const addField = () => {
    onUpdate({ ...block, fields: [...block.fields, { id: generateBlockId('fe'), label: '', value: '' }] });
  };

  const removeField = (fieldId: string) => {
    onUpdate({ ...block, fields: block.fields.filter((f) => f.id !== fieldId) });
  };

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
      {block.fields.map((field) => (
        <div key={field.id} className="group/field relative rounded-md py-0.5 pr-6">
          <ControlInput
            className="min-h-5 px-0 py-0 text-2xs font-medium uppercase tracking-wide text-text-soft [&_.cm-editor]:bg-transparent! [&_.cm-content]:px-0! [&_.cm-content]:py-0!"
            variables={variables}
            isAllowedVariable={isAllowedVariable}
            value={field.label}
            onChange={(label) => updateField(field.id, { label })}
            placeholder="Label"
            enableTranslations
          />
          <ControlInput
            className="min-h-5 px-0 py-0 text-sm text-text-strong [&_.cm-editor]:bg-transparent! [&_.cm-content]:px-0! [&_.cm-content]:py-0!"
            variables={variables}
            isAllowedVariable={isAllowedVariable}
            value={field.value}
            onChange={(value) => updateField(field.id, { value })}
            placeholder="Value"
            enableTranslations
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeField(field.id);
            }}
            className="absolute right-0 top-0.5 flex size-5 items-center justify-center rounded text-text-soft opacity-0 transition-opacity hover:bg-bg-weak hover:text-error-base group-hover/field:opacity-100"
            aria-label="Remove field"
          >
            <RiCloseLine className="size-3" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          addField();
        }}
        className="flex items-center justify-center gap-1 rounded-md border border-dashed border-neutral-200 px-2 py-2 text-xs text-text-soft transition-colors hover:border-primary-200 hover:text-primary-base"
      >
        <RiAddLine className="size-3.5" />
        Add field
      </button>
    </div>
  );
}

const ACTION_STYLE_LABEL: Record<NonNullable<UrlActionEntry['style']>, string> = {
  default: 'Default',
  primary: 'Primary',
  danger: 'Danger',
};

function actionButtonVariant(style: UrlActionEntry['style'] | undefined) {
  switch (style) {
    case 'primary':
      return { variant: 'primary', mode: 'filled' } as const;
    case 'danger':
      return { variant: 'error', mode: 'filled' } as const;
    default:
      return { variant: 'secondary', mode: 'outline' } as const;
  }
}

function ActionsEditor({
  block,
  variables,
  isAllowedVariable,
  onUpdate,
}: {
  block: ActionsBlock;
  variables: BlockListItemProps['variables'];
  isAllowedVariable: BlockListItemProps['isAllowedVariable'];
  onUpdate: (next: CardBlock) => void;
}) {
  const updateAction = (actionId: string, patch: Partial<ActionEntry>) => {
    onUpdate({
      ...block,
      actions: block.actions.map((a) => {
        if (a.id !== actionId) return a;
        if (a.kind === 'link-button') {
          return { ...a, ...(patch as Partial<UrlActionEntry>) };
        }

        return { ...a, ...(patch as Partial<CallbackActionEntry>) };
      }),
    });
  };

  const addLinkButton = () => {
    onUpdate({
      ...block,
      actions: [...block.actions, { id: generateBlockId('lb'), kind: 'link-button', label: '', url: '' }],
    });
  };

  const removeAction = (actionId: string) => {
    onUpdate({ ...block, actions: block.actions.filter((a) => a.id !== actionId) });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 py-1">
      {block.actions.map((action) => (
        <ActionButtonEditor
          key={action.id}
          action={action}
          variables={variables}
          isAllowedVariable={isAllowedVariable}
          onUpdate={(patch) => updateAction(action.id, patch)}
          onRemove={() => removeAction(action.id)}
        />
      ))}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          addLinkButton();
        }}
        className="flex h-8 items-center gap-1 rounded-lg border border-dashed border-neutral-200 px-2.5 text-xs text-text-soft transition-colors hover:border-primary-200 hover:text-primary-base"
      >
        <RiAddLine className="size-3.5" />
        Add button
      </button>
    </div>
  );
}

function ActionButtonEditor({
  action,
  variables,
  isAllowedVariable,
  onUpdate,
  onRemove,
}: {
  action: ActionEntry;
  variables: BlockListItemProps['variables'];
  isAllowedVariable: BlockListItemProps['isAllowedVariable'];
  onUpdate: (patch: Partial<ActionEntry>) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const buttonVariant = actionButtonVariant(action.style);
  const hasLabel = action.label.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="xs"
          variant={buttonVariant.variant}
          mode={buttonVariant.mode}
          onClick={(e) => e.stopPropagation()}
          className={cn('max-w-[220px]', !hasLabel && 'italic opacity-80')}
        >
          <span className="truncate">{hasLabel ? action.label : 'Untitled button'}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-80 flex-col gap-2 p-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="text-2xs font-medium uppercase tracking-wide text-text-soft">Button</div>
          <button
            type="button"
            onClick={onRemove}
            className="flex size-5 items-center justify-center rounded text-text-soft hover:bg-red-alpha-10 hover:text-error-base"
            aria-label="Remove button"
          >
            <RiCloseLine className="size-3" />
          </button>
        </div>
        <ControlInput
          variables={variables}
          isAllowedVariable={isAllowedVariable}
          value={action.label}
          onChange={(label) => onUpdate({ label })}
          placeholder="Button label"
          autoFocus
          enableTranslations
        />
        {action.kind === 'link-button' && (
          <ControlInput
            variables={variables}
            isAllowedVariable={isAllowedVariable}
            value={action.url}
            onChange={(url) => onUpdate({ url } as Partial<UrlActionEntry>)}
            placeholder="https://…"
            enableTranslations
          />
        )}
        <div className="flex flex-col gap-1">
          <div className="text-2xs font-medium uppercase tracking-wide text-text-soft">Style</div>
          <div className="flex items-center gap-1">
            {(['default', 'primary', 'danger'] as const).map((style) => {
              const variant = actionButtonVariant(style);
              const isActive = (action.style ?? 'default') === style;

              return (
                <button
                  key={style}
                  type="button"
                  onClick={() => onUpdate({ style } as Partial<ActionEntry>)}
                  className={cn(
                    'rounded-md border px-2 py-1 text-xs transition-colors',
                    isActive ? 'border-primary-base bg-primary-alpha-10 text-primary-base' : 'border-neutral-100 text-text-sub hover:border-neutral-200'
                  )}
                  aria-pressed={isActive}
                >
                  <span
                    className={cn(
                      'inline-flex items-center gap-1',
                      variant.variant === 'primary' && 'text-primary-base',
                      variant.variant === 'error' && 'text-error-base'
                    )}
                  >
                    <span
                      className={cn(
                        'size-2 rounded-full',
                        style === 'primary' && 'bg-primary-base',
                        style === 'danger' && 'bg-error-base',
                        style === 'default' && 'bg-neutral-300'
                      )}
                    />
                    {ACTION_STYLE_LABEL[style]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

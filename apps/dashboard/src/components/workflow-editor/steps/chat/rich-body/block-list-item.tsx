import { memo } from 'react';
import { RiArrowDownLine, RiArrowUpLine, RiCloseLine } from 'react-icons/ri';
import { ControlInput } from '@/components/workflow-editor/control-input';
import { Button } from '@/components/primitives/button';
import { cn } from '@/utils/ui';
import type {
  ActionEntry,
  ActionsBlock,
  CallbackActionEntry,
  CardBlock,
  FieldEntry,
  FieldsBlock,
  LinkBlock,
  UrlActionEntry,
} from './card-types';
import { BLOCK_ICONS, BLOCK_LABEL } from './block-icons';
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
  const Icon = BLOCK_ICONS[block.kind];

  return (
    <div
      className={cn(
        'group relative flex flex-col gap-2 rounded-lg border border-neutral-100 bg-white p-3 transition-colors',
        isSelected && 'border-primary-300 ring-1 ring-primary-200'
      )}
      onClick={onSelect}
      onFocus={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect();
      }}
      role="group"
      tabIndex={-1}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground-600">
          <Icon className="size-3.5" />
          {BLOCK_LABEL[block.kind]}
        </div>
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <Button
            size="2xs"
            variant="secondary"
            mode="ghost"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMove(-1);
            }}
            disabled={index === 0}
            aria-label="Move block up"
          >
            <RiArrowUpLine className="size-3" />
          </Button>
          <Button
            size="2xs"
            variant="secondary"
            mode="ghost"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMove(1);
            }}
            disabled={index === totalBlocks - 1}
            aria-label="Move block down"
          >
            <RiArrowDownLine className="size-3" />
          </Button>
          <Button
            size="2xs"
            variant="error"
            mode="ghost"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            aria-label="Remove block"
          >
            <RiCloseLine className="size-3" />
          </Button>
        </div>
      </div>

      <BlockBody
        block={block}
        variables={variables}
        isAllowedVariable={isAllowedVariable}
        onUpdate={onUpdate}
      />
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
          className="min-h-8 text-base font-semibold"
          variables={variables}
          isAllowedVariable={isAllowedVariable}
          value={block.content}
          onChange={(content) => onUpdate({ ...block, content })}
          placeholder="Heading text"
          enableTranslations
        />
      );
    case 'text':
      return (
        <ControlInput
          className="min-h-12"
          variables={variables}
          isAllowedVariable={isAllowedVariable}
          value={block.content}
          onChange={(content) => onUpdate({ ...block, content })}
          placeholder="Write something..."
          multiline
          enableTranslations
        />
      );
    case 'divider':
      return <div className="my-1 h-px w-full bg-neutral-100" aria-hidden="true" />;
    case 'link':
      return <LinkEditor block={block} variables={variables} isAllowedVariable={isAllowedVariable} onUpdate={onUpdate} />;
    case 'image':
      return (
        <div className="flex flex-col gap-2">
          <ControlInput
            variables={variables}
            isAllowedVariable={isAllowedVariable}
            value={block.url}
            onChange={(url) => onUpdate({ ...block, url })}
            placeholder="Image URL"
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
        </div>
      );
    case 'fields':
      return <FieldsEditor block={block} variables={variables} isAllowedVariable={isAllowedVariable} onUpdate={onUpdate} />;
    case 'actions':
      return (
        <ActionsEditor block={block} variables={variables} isAllowedVariable={isAllowedVariable} onUpdate={onUpdate} />
      );
    default:
      return null;
  }
}

function LinkEditor({
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
  return (
    <div className="flex flex-col gap-2">
      <ControlInput
        variables={variables}
        isAllowedVariable={isAllowedVariable}
        value={block.label}
        onChange={(label) => onUpdate({ ...block, label })}
        placeholder="Link label"
        enableTranslations
      />
      <ControlInput
        variables={variables}
        isAllowedVariable={isAllowedVariable}
        value={block.url}
        onChange={(url) => onUpdate({ ...block, url })}
        placeholder="https://..."
        enableTranslations
      />
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
    <div className="flex flex-col gap-2">
      {block.fields.map((field) => (
        <div key={field.id} className="flex items-start gap-2">
          <ControlInput
            className="flex-1"
            variables={variables}
            isAllowedVariable={isAllowedVariable}
            value={field.label}
            onChange={(label) => updateField(field.id, { label })}
            placeholder="Label"
            enableTranslations
          />
          <ControlInput
            className="flex-1"
            variables={variables}
            isAllowedVariable={isAllowedVariable}
            value={field.value}
            onChange={(value) => updateField(field.id, { value })}
            placeholder="Value"
            enableTranslations
          />
          <Button size="2xs" variant="secondary" mode="ghost" type="button" onClick={() => removeField(field.id)}>
            <RiCloseLine className="size-3" />
          </Button>
        </div>
      ))}
      <Button size="2xs" variant="secondary" mode="outline" type="button" onClick={addField}>
        Add field
      </Button>
    </div>
  );
}

/**
 * Button interactivity note
 * -------------------------
 * v1 exposes **link-button** only (URL-opening). The schema supports a
 * `callback-button` variant (`CallbackActionEntry`) that round-trips an
 * action id to Novu — but wiring that through requires:
 *   1. A server-side action inbox (reuse the agent `onAction` handler at
 *      `apps/api/src/app/agents/services/chat-sdk.service.ts`).
 *   2. A workflow-step trigger hook so authors can map action ids to
 *      follow-up workflow branches / triggers.
 *   3. Platform plumbing: Slack already forwards `id` natively via its
 *      Block Kit actions; Teams needs `data` on the Action.Submit; Discord
 *      webhook replies can't do callbacks at all (disable in the editor).
 *
 * Tracked as the v2 interactivity follow-up.
 */
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
        // Spread keeps the discriminant from the patch if present, otherwise
        // from the existing action — type guards here to keep TS happy.
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
    <div className="flex flex-col gap-2">
      {block.actions.map((action) => (
        <div key={action.id} className="flex flex-col gap-1.5 rounded-md border border-neutral-100 p-2">
          <div className="flex items-start gap-2">
            <ControlInput
              className="flex-1"
              variables={variables}
              isAllowedVariable={isAllowedVariable}
              value={action.label}
              onChange={(label) => updateAction(action.id, { label })}
              placeholder="Button label"
              enableTranslations
            />
            <Button size="2xs" variant="secondary" mode="ghost" type="button" onClick={() => removeAction(action.id)}>
              <RiCloseLine className="size-3" />
            </Button>
          </div>
          {action.kind === 'link-button' && (
            <ControlInput
              variables={variables}
              isAllowedVariable={isAllowedVariable}
              value={action.url}
              onChange={(url) => updateAction(action.id, { url })}
              placeholder="https://..."
              enableTranslations
            />
          )}
        </div>
      ))}
      <Button size="2xs" variant="secondary" mode="outline" type="button" onClick={addLinkButton}>
        Add button
      </Button>
    </div>
  );
}

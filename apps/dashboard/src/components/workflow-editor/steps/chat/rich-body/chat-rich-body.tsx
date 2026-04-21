import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useCallback, useState } from 'react';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { BaseBody } from '@/components/workflow-editor/steps/base/base-body';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useParseVariables } from '@/hooks/use-parse-variables';
import { AddBlockMenu } from './add-block-menu';
import { BlockListItem } from './block-list-item';
import { BLOCK_ICONS, BLOCK_LABEL } from './block-icons';
import { CardHeaderEditor } from './card-header-editor';
import { generateBlockId } from './card-serializer';
import { UpgradeBanner } from './upgrade-banner';
import { useCardDocSync } from './use-card-doc-sync';
import type { CardBlock } from './card-types';

/**
 * Rich chat body editor entry point.
 *
 * The flag check lives at the top of the component so the inner editor
 * (and all its hooks) is gated as a unit. When the flag is off we render
 * the legacy single-textarea body editor, preserving today's behaviour
 * byte-for-byte.
 */
export function ChatRichBody() {
  const isRichChatEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CHAT_RICH_CONTENT_ENABLED, false);

  if (!isRichChatEnabled) {
    return <BaseBody />;
  }

  return <ChatRichBodyEditor />;
}

/**
 * The actual rich editor. Extracted so hooks stay unconditional — the
 * feature flag acts as a mount/unmount boundary above this component.
 *
 * Authors a structured `CardElement` tree (stored in `controlValues.card`)
 * alongside a plain-text fallback (stored in `controlValues.body`). Both
 * fields are kept in sync by `useCardDocSync` so providers that don't
 * understand rich content still receive a coherent text message.
 *
 * The editor deliberately uses a flat block-list UX rather than a WYSIWYG
 * canvas — chat Cards are semantically block-based (Block Kit, Adaptive
 * Cards) so matching that mental model avoids the impedance mismatch you
 * get trying to fit a prose editor onto a structured layout surface.
 */
function ChatRichBodyEditor() {
  const { step, digestStepBeforeCurrent } = useWorkflow();
  const { variables, isAllowedVariable } = useParseVariables(step?.variables, digestStepBeforeCurrent?.stepId);

  const { doc, updateDoc, isLegacyUpgrade } = useCardDocSync();
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const updateHeader = useCallback(
    (patch: Partial<typeof doc>) => {
      updateDoc((draft) => ({ ...draft, ...patch }));
    },
    [updateDoc]
  );

  const appendBlock = useCallback(
    (block: CardBlock) => {
      updateDoc((draft) => ({ ...draft, blocks: [...draft.blocks, block] }));
      setSelectedBlockId(block.id);
    },
    [updateDoc]
  );

  const updateBlock = useCallback(
    (index: number, next: CardBlock) => {
      updateDoc((draft) => {
        const blocks = [...draft.blocks];
        blocks[index] = next;

        return { ...draft, blocks };
      });
    },
    [updateDoc]
  );

  const removeBlock = useCallback(
    (index: number) => {
      updateDoc((draft) => {
        const blocks = draft.blocks.filter((_, i) => i !== index);

        return { ...draft, blocks };
      });
    },
    [updateDoc]
  );

  const moveBlock = useCallback(
    (index: number, direction: -1 | 1) => {
      updateDoc((draft) => {
        const target = index + direction;
        if (target < 0 || target >= draft.blocks.length) return draft;
        const blocks = [...draft.blocks];
        const [item] = blocks.splice(index, 1);
        blocks.splice(target, 0, item);

        return { ...draft, blocks };
      });
    },
    [updateDoc]
  );

  return (
    <div className="flex flex-col gap-3">
      {isLegacyUpgrade && <UpgradeBanner />}

      <CardHeaderEditor
        doc={doc}
        variables={variables}
        isAllowedVariable={isAllowedVariable}
        onUpdate={updateHeader}
      />

      {doc.blocks.length === 0 ? (
        <EmptyState onAdd={appendBlock} />
      ) : (
        <div className="flex flex-col gap-0.5 pl-8">
          {doc.blocks.map((block, index) => (
            <BlockListItem
              key={block.id}
              block={block}
              index={index}
              totalBlocks={doc.blocks.length}
              variables={variables}
              isAllowedVariable={isAllowedVariable}
              onUpdate={(next) => updateBlock(index, next)}
              onRemove={() => {
                removeBlock(index);
                if (selectedBlockId === block.id) setSelectedBlockId(null);
              }}
              onMove={(direction) => moveBlock(index, direction)}
              onSelect={() => setSelectedBlockId(block.id)}
              isSelected={selectedBlockId === block.id}
            />
          ))}
        </div>
      )}

      {doc.blocks.length > 0 && (
        <div className="flex justify-start pl-8">
          <AddBlockMenu onAdd={appendBlock} />
        </div>
      )}
    </div>
  );
}

const QUICK_INSERT_KINDS: CardBlock['kind'][] = ['heading', 'text', 'actions'];

function makeQuickBlock(kind: CardBlock['kind']): CardBlock {
  switch (kind) {
    case 'heading':
      return { id: generateBlockId('h'), kind: 'heading', content: '' };
    case 'text':
      return { id: generateBlockId('t'), kind: 'text', content: '' };
    case 'actions':
      return {
        id: generateBlockId('a'),
        kind: 'actions',
        actions: [{ id: generateBlockId('lb'), kind: 'link-button', label: '', url: '' }],
      };
    default:
      return { id: generateBlockId('t'), kind: 'text', content: '' };
  }
}

function EmptyState({ onAdd }: { onAdd: (block: CardBlock) => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-neutral-100 bg-bg-weak/50 p-4">
      <div className="flex flex-col gap-1">
        <div className="text-sm font-medium text-foreground-950">Start your message</div>
        <div className="text-xs text-foreground-600">
          Add a heading, text, or buttons. Novu compiles the result to Slack Block Kit, Microsoft Teams Adaptive Cards,
          and Discord embeds automatically.
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {QUICK_INSERT_KINDS.map((kind) => {
          const Icon = BLOCK_ICONS[kind];

          return (
            <button
              key={kind}
              type="button"
              onClick={() => onAdd(makeQuickBlock(kind))}
              className="flex flex-col items-center justify-center gap-1.5 rounded-md border border-neutral-100 bg-white px-2 py-3 text-xs text-foreground-700 transition-colors hover:border-primary-200 hover:bg-primary-alpha-10 hover:text-primary-base"
            >
              <Icon className="size-4" />
              {BLOCK_LABEL[kind]}
            </button>
          );
        })}
      </div>
      <div className="flex justify-start">
        <AddBlockMenu onAdd={onAdd} label="More blocks" />
      </div>
    </div>
  );
}

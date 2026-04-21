import { RiAddLine } from 'react-icons/ri';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { Button } from '@/components/primitives/button';
import type { CardBlock } from './card-types';
import { generateBlockId } from './card-serializer';
import { BLOCK_ICONS, BLOCK_LABEL } from './block-icons';

type BlockGroup = {
  id: string;
  label: string;
  kinds: CardBlock['kind'][];
};

const BLOCK_GROUPS: BlockGroup[] = [
  { id: 'content', label: 'Content', kinds: ['heading', 'text', 'image', 'divider'] },
  { id: 'layout', label: 'Layout', kinds: ['fields', 'link'] },
  { id: 'interactive', label: 'Interactive', kinds: ['actions'] },
];

function makeBlock(kind: CardBlock['kind']): CardBlock {
  switch (kind) {
    case 'heading':
      return { id: generateBlockId('h'), kind: 'heading', content: '' };
    case 'text':
      return { id: generateBlockId('t'), kind: 'text', content: '' };
    case 'divider':
      return { id: generateBlockId('d'), kind: 'divider' };
    case 'link':
      return { id: generateBlockId('l'), kind: 'link', label: '', url: '' };
    case 'image':
      return { id: generateBlockId('i'), kind: 'image', url: '' };
    case 'fields':
      return {
        id: generateBlockId('f'),
        kind: 'fields',
        fields: [{ id: generateBlockId('fe'), label: '', value: '' }],
      };
    case 'actions':
      return {
        id: generateBlockId('a'),
        kind: 'actions',
        actions: [{ id: generateBlockId('lb'), kind: 'link-button', label: '', url: '' }],
      };
    default: {
      const _exhaustive: never = kind;

      throw new Error(`Unhandled block kind: ${String(_exhaustive)}`);
    }
  }
}

/**
 * Slash menu for inserting a new block. We don't actually listen for the
 * `/` key because the editor's text blocks are Liquid/CodeMirror surfaces
 * that consume `/` natively — instead, we surface a single "Add block"
 * button whose popover offers the same choices grouped by intent
 * (Content / Layout / Interactive). Mirrors the Maily toolbar pattern
 * and keeps the implementation framework-agnostic.
 */
export function AddBlockMenu({ onAdd, label = 'Add block' }: { onAdd: (block: CardBlock) => void; label?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" size="xs" variant="secondary" mode="outline">
          <RiAddLine className="size-3.5" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-1">
        <div className="flex flex-col gap-1">
          {BLOCK_GROUPS.map((group, groupIdx) => (
            <div key={group.id} className="flex flex-col">
              {groupIdx > 0 && <div className="my-1 h-px bg-neutral-100" />}
              <div className="px-2 pb-0.5 pt-1 text-2xs font-medium uppercase tracking-wide text-text-soft">
                {group.label}
              </div>
              {group.kinds.map((kind) => {
                const Icon = BLOCK_ICONS[kind];

                return (
                  <button
                    key={kind}
                    type="button"
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-neutral-50"
                    onClick={() => onAdd(makeBlock(kind))}
                  >
                    <Icon className="size-4 text-foreground-600" />
                    <span>{BLOCK_LABEL[kind]}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

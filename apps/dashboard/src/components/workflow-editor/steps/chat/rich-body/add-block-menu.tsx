import { RiAddLine } from 'react-icons/ri';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { Button } from '@/components/primitives/button';
import type { CardBlock } from './card-types';
import { generateBlockId } from './card-serializer';
import { BLOCK_ICONS, BLOCK_LABEL } from './block-icons';

const BLOCK_KINDS: CardBlock['kind'][] = ['heading', 'text', 'link', 'actions', 'fields', 'image', 'divider'];

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
 * button whose popover offers the same choices. This mirrors the Maily
 * toolbar pattern and keeps the implementation framework-agnostic.
 */
export function AddBlockMenu({ onAdd }: { onAdd: (block: CardBlock) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" size="xs" variant="secondary" mode="outline">
          <RiAddLine className="size-3.5" />
          Add block
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1">
        <div className="flex flex-col">
          {BLOCK_KINDS.map((kind) => {
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
      </PopoverContent>
    </Popover>
  );
}

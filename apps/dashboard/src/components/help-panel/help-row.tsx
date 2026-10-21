import { Command as CommandPrimitive } from 'cmdk';
import { ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import { RiArrowRightSLine } from 'react-icons/ri';
import { Kbd } from '@/components/primitives/kbd';
import { cn } from '@/utils/ui';

/**
 * - `item`: compact icon + label row.
 * - `result`: roomier row that opens an external page.
 * - `tile`: framed icon, label + description, leads somewhere.
 * - `action`: primary row with a raised icon tile.
 */
export type HelpRowKind = 'item' | 'result' | 'tile' | 'action';

type HelpRowProps = {
  value: string;
  icon: IconType;
  label: ReactNode;
  description?: ReactNode;
  kind?: HelpRowKind;
  onSelect: () => void;
};

const SELECTED_TEXT = 'group-data-[selected=true]/help-row:text-text-strong';
const ITEM_LABEL = 'text-[13px] font-medium leading-5 tracking-[-0.078px]';

const ROW_STYLES: Record<HelpRowKind, { row: string; label: string }> = {
  item: {
    row: 'gap-2.5 px-2 py-1.5 data-[selected=true]:bg-bg-weak data-[selected=true]:shadow-xs',
    label: ITEM_LABEL,
  },
  result: {
    row: 'gap-2.5 px-2.5 py-2 data-[selected=true]:bg-bg-weak data-[selected=true]:shadow-xs',
    label: ITEM_LABEL,
  },
  tile: {
    row: 'gap-3 py-1.5 pl-1.5 pr-2.5 active:ring-stroke-sub data-[selected=true]:shadow-xs data-[selected=true]:ring-1 data-[selected=true]:ring-inset data-[selected=true]:ring-stroke-soft',
    label: ITEM_LABEL,
  },
  action: {
    row: 'gap-3 border border-transparent py-1.5 pl-1.5 pr-2.5 active:border-stroke-sub data-[selected=true]:border-stroke-soft data-[selected=true]:bg-bg-white data-[selected=true]:shadow-xs',
    label: 'text-label-sm tracking-[-0.084px]',
  },
};

function HelpRowLeading({ kind, icon: Icon }: { kind: HelpRowKind; icon: IconType }) {
  switch (kind) {
    case 'item':
    case 'result':
      return (
        <Icon
          aria-hidden
          className="size-4 shrink-0 text-text-soft transition-colors group-data-[selected=true]/help-row:text-text-sub"
        />
      );
    case 'tile':
      return (
        <span className="flex shrink-0 rounded-6 border border-stroke-soft bg-bg-weak p-1.5">
          <Icon aria-hidden className="size-4 text-icon-sub" />
        </span>
      );
    case 'action':
      return (
        <span className="flex shrink-0 rounded-6 bg-bg-weak p-1 shadow-xs">
          <Icon aria-hidden className="size-4 text-icon-sub" />
        </span>
      );
    default: {
      const exhaustiveCheck: never = kind;

      return exhaustiveCheck;
    }
  }
}

function HelpRowTrailing({ kind }: { kind: HelpRowKind }) {
  const className = 'size-3.5 shrink-0 text-text-soft group-data-[selected=true]/help-row:hidden';

  switch (kind) {
    case 'item':
    case 'action':
      return null;
    case 'result':
      return <ArrowUpRight aria-hidden strokeWidth={2.4} className={className} />;
    case 'tile':
      return <RiArrowRightSLine aria-hidden className={className} />;
    default: {
      const exhaustiveCheck: never = kind;

      return exhaustiveCheck;
    }
  }
}

export function HelpRow({ value, icon, label, description, kind = 'item', onSelect }: HelpRowProps) {
  const styles = ROW_STYLES[kind];

  return (
    <CommandPrimitive.Item
      value={value}
      onSelect={onSelect}
      className={cn(
        'group/help-row flex w-full cursor-pointer select-none items-center overflow-hidden rounded-8 outline-none transition-[background-color,box-shadow,border-color]',
        styles.row
      )}
    >
      <HelpRowLeading kind={kind} icon={icon} />
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span className={cn('truncate text-text-sub transition-colors', SELECTED_TEXT, styles.label)}>{label}</span>
        {description ? <span className="truncate text-paragraph-xs text-text-soft">{description}</span> : null}
      </span>
      <HelpRowTrailing kind={kind} />
      <Kbd variant="raised" aria-hidden className="hidden rounded-4 px-1 group-data-[selected=true]/help-row:flex">
        ↵
      </Kbd>
    </CommandPrimitive.Item>
  );
}
